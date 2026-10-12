// Per-symbol Finnhub company-news fetch, shared by /api/news (per-stock "why it moved"
// panels) and /api/movers/news (the Daily Movers digest) so both hit the same cache
// entries instead of double-fetching the same symbol within a TTL window.

import { cacheGet, cacheSet, finnhubGet } from "@/lib/finnhub";
import { fetchYahooRssNews } from "@/lib/yahooRss";
import { isTrustedFinnhubSource, isTrustedYahooLink, isSpeculativeHeadline } from "@/lib/trustedNews";
import { fetchCompanyProfile, companyShortName } from "@/lib/companyProfile";
import type { NewsArticle, NewsResult } from "@/app/api/news/route";

type FinnhubNewsItem = {
  headline?: string;
  source?: string;
  datetime?: number;
  summary?: string;
  url?: string;
};

const CACHE_TTL_MS = 30 * 60 * 1000; // news refreshes on its own 30-min cycle
const LOOKBACK_DAYS = 14;
const MAX_ARTICLES = 12;

const fmt = (d: Date) => d.toISOString().slice(0, 10);

export async function fetchCompanyNews(symbol: string): Promise<NewsResult> {
  const cacheKey = `news:${symbol}`;
  const cached = cacheGet<NewsResult>(cacheKey);
  if (cached) return cached;

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - LOOKBACK_DAYS);

  const items = await finnhubGet<FinnhubNewsItem[]>("/company-news", {
    symbol,
    from: fmt(from),
    to: fmt(to),
  });

  const seen = new Set<string>();
  const articles: NewsArticle[] = [];
  for (const it of Array.isArray(items) ? items : []) {
    if (!it.headline || !it.url || seen.has(it.url)) continue;
    seen.add(it.url);
    articles.push({
      headline: it.headline,
      source: it.source || "Unknown",
      datetime: typeof it.datetime === "number" ? it.datetime : 0,
      summary: it.summary || "",
      url: it.url,
    });
    if (articles.length >= MAX_ARTICLES) break;
  }
  articles.sort((a, b) => b.datetime - a.datetime); // newest first

  const result: NewsResult = { articles, fetchedAt: Math.floor(Date.now() / 1000) };
  cacheSet(cacheKey, result, CACHE_TTL_MS);
  return result;
}

// Finnhub's free-tier /company-news is a broad "finance" feed loosely tagged with
// whatever symbol you queried — its `related` field just echoes the query param back
// rather than indicating real relevance, so e.g. a 6-ticker "Zacks highlights" roundup
// or an unrelated S&P 500 piece shows up identically for every symbol. This narrows
// fetchCompanyNews's raw output down to content that's actually about this one company:
// wire-service/staff sources (CNBC/Reuters/Bloomberg via Finnhub, Yahoo's own staff
// articles via its per-symbol RSS feed — both confirmed to be genuinely symbol-specific,
// unlike the syndicated contributor pieces Finnhub mixes in) with speculative "N stocks
// to buy" listicle headlines filtered out. Originally built for the Daily Movers digest
// (src/app/api/movers/news/route.ts); reused here so the per-stock "Latest news" panel
// (NodeNews, shown in both the chart popup and the dependency-graph dossier) gets the
// same relevance bar instead of the raw unfiltered feed.
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Builds a "is this headline actually about <symbol>" matcher. The ticker is matched as
 * a whole word (both sides bounded — tickers like "ALL"/"ON"/"NOW" are real English
 * words, so a loose match would false-positive constantly). The company's short/common
 * name (e.g. "Meta" for "Meta Platforms, Inc.") is only left-bounded, i.e. it must start
 * a word but doesn't have to end one: headlines write brand names as compounds Finnhub's
 * legal `name` field doesn't capture — "Space Exploration Technologies Corp" (SPCX)
 * reduces to short name "Space", but every real headline says "SpaceX" as one token, which
 * a two-sided \bSpace\b match can never hit since there's no boundary between "Space" and
 * "X". Left-only bounding catches "SpaceX"/"SpaceX's" while still rejecting a mid-word
 * hit like "Aerospace" (no boundary before "space" there either). */
async function buildRelevanceMatcher(symbol: string): Promise<(headline: string) => boolean> {
  let shortName: string | null = null;
  try {
    const profile = await fetchCompanyProfile(symbol);
    if (profile?.name) shortName = companyShortName(profile.name);
  } catch {
    // Profile lookup is a nice-to-have here — fall back to ticker-only matching.
  }
  const tickerPattern = new RegExp(`\\b${escapeRe(symbol)}\\b`, "i");
  const namePattern = shortName ? new RegExp(`\\b${escapeRe(shortName)}`, "i") : null;
  return (headline: string) => tickerPattern.test(headline) || (namePattern?.test(headline) ?? false);
}

export async function fetchTrustedCompanyNews(symbol: string): Promise<NewsResult> {
  const cacheKey = `trustedNews:${symbol}`;
  const cached = cacheGet<NewsResult>(cacheKey);
  if (cached) return cached;

  const [finnhubResult, rssItems, isRelevant] = await Promise.all([
    fetchCompanyNews(symbol).catch(() => ({ articles: [], fetchedAt: 0 }) as NewsResult),
    fetchYahooRssNews(symbol),
    buildRelevanceMatcher(symbol),
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

  const seen = new Set<string>();
  const merged: NewsArticle[] = [];
  for (const a of [...fromFinnhub, ...fromYahoo]) {
    if (!a.url || seen.has(a.url)) continue;
    if (isSpeculativeHeadline(a.headline) || !isRelevant(a.headline)) continue;
    seen.add(a.url);
    merged.push(a);
  }
  merged.sort((a, b) => b.datetime - a.datetime);

  const result: NewsResult = { articles: merged.slice(0, MAX_ARTICLES), fetchedAt: Math.floor(Date.now() / 1000) };
  cacheSet(cacheKey, result, CACHE_TTL_MS);
  return result;
}
