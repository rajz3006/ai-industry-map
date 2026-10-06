import { NextRequest, NextResponse } from "next/server";
import { AlpacaError } from "@/lib/alpaca";
import { cacheGet, cacheSet, getFinnhubKey } from "@/lib/finnhub";
import { loadBarSet, resolveSessionDate, computeSessionMovers, type CategoryTrend } from "@/lib/moversData";
import { fetchCompanyNews } from "@/lib/companyNews";
import { fetchYahooRssNews } from "@/lib/yahooRss";
import { isTrustedFinnhubSource, isTrustedYahooLink, isSpeculativeHeadline } from "@/lib/trustedNews";
import type { NewsArticle } from "@/app/api/news/route";

// Enough names per side to surface a real theme without burning the shared Finnhub
// rate-limit budget (each symbol costs one company-news call, see src/lib/finnhub.ts).
const SYMBOLS_PER_SIDE = 4;
const MAX_ARTICLES_PER_SIDE = 7;
const CACHE_TTL_MS = 20 * 60_000;
// A layer averaging less than this is normal day-to-day noise, not "today's story".
const MIN_THEME_AVG_PCT = 1;
const MIN_THEME_COUNT = 2;

export interface TopTheme {
  layer: string;
  avgChangePercent: number;
  count: number;
}

export interface MoversNewsResponse {
  date: string;
  topTheme: TopTheme | null;
  movers: NewsArticle[];
  losers: NewsArticle[];
}

function pickTopTheme(categoryTrends: CategoryTrend[]): TopTheme | null {
  if (categoryTrends.length === 0) return null;
  const top = categoryTrends[0];
  const bottom = categoryTrends[categoryTrends.length - 1];
  const candidate = Math.abs(bottom.avgChangePercent) > Math.abs(top.avgChangePercent) ? bottom : top;
  if (Math.abs(candidate.avgChangePercent) < MIN_THEME_AVG_PCT || candidate.count < MIN_THEME_COUNT) return null;
  return candidate;
}

async function trustedNewsForSymbol(symbol: string): Promise<NewsArticle[]> {
  const [finnhubResult, rssItems] = await Promise.all([
    getFinnhubKey() ? fetchCompanyNews(symbol).catch(() => ({ articles: [], fetchedAt: 0 })) : Promise.resolve({ articles: [], fetchedAt: 0 }),
    fetchYahooRssNews(symbol),
  ]);

  const fromFinnhub = finnhubResult.articles.filter((a) => isTrustedFinnhubSource(a.source));
  const fromYahoo: NewsArticle[] = rssItems
    .filter((it) => isTrustedYahooLink(it.link))
    .map((it) => ({
      headline: it.title,
      source: "Yahoo Finance",
      datetime: it.datetime,
      summary: it.description,
      url: it.link,
    }));
  return [...fromFinnhub, ...fromYahoo].filter((a) => !isSpeculativeHeadline(a.headline));
}

async function trustedNewsForSymbols(symbols: string[]): Promise<NewsArticle[]> {
  const perSymbol = await Promise.all(symbols.map(trustedNewsForSymbol));
  const seen = new Set<string>();
  const merged: NewsArticle[] = [];
  for (const list of perSymbol) {
    for (const article of list) {
      if (seen.has(article.url)) continue;
      seen.add(article.url);
      merged.push(article);
    }
  }
  merged.sort((a, b) => b.datetime - a.datetime);
  return merged.slice(0, MAX_ARTICLES_PER_SIDE);
}

export async function GET(req: NextRequest) {
  const requestedDate = req.nextUrl.searchParams.get("date");

  try {
    const { bySymbol, dates } = await loadBarSet();
    if (dates.length < 2) {
      return NextResponse.json({ error: "Not enough historical bar data available yet" }, { status: 503 });
    }

    const targetDate = resolveSessionDate(dates, requestedDate);
    const targetIdx = dates.indexOf(targetDate);
    if (targetIdx < 1) {
      return NextResponse.json({ error: "No prior session available for comparison on this date" }, { status: 404 });
    }
    const prevDate = dates[targetIdx - 1];

    const cacheKey = `moversNews:${targetDate}`;
    const cached = cacheGet<MoversNewsResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=1800" } });
    }

    const { movers, categoryTrends } = computeSessionMovers(bySymbol, targetDate, prevDate);

    const seen = new Set<string>();
    const bySymbolOnce = movers.filter((m) => {
      if (seen.has(m.symbol)) return false;
      seen.add(m.symbol);
      return true;
    });
    const gainerSymbols = bySymbolOnce.slice(0, SYMBOLS_PER_SIDE).map((m) => m.symbol);
    const loserSymbols = bySymbolOnce.slice(-SYMBOLS_PER_SIDE).map((m) => m.symbol).reverse();

    const [moversNews, losersNews] = await Promise.all([
      trustedNewsForSymbols(gainerSymbols),
      trustedNewsForSymbols(loserSymbols),
    ]);

    const response: MoversNewsResponse = {
      date: targetDate,
      topTheme: pickTopTheme(categoryTrends),
      movers: moversNews,
      losers: losersNews,
    };
    cacheSet(cacheKey, response, CACHE_TTL_MS);
    return NextResponse.json(response, {
      headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch (err) {
    const status = err instanceof AlpacaError ? err.status ?? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching movers news" },
      { status }
    );
  }
}
