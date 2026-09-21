import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet, finnhubGet, getFinnhubKey } from "@/lib/finnhub";

export interface NewsArticle {
  headline: string;
  source: string;
  datetime: number; // unix seconds
  summary: string;
  url: string;
}

export interface NewsResult {
  articles: NewsArticle[];
  fetchedAt: number; // unix seconds
}

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

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();

  if (!symbol || !/^[A-Z0-9.\-]{1,12}$/.test(symbol)) {
    return NextResponse.json({ error: "Missing or invalid 'symbol' query param" }, { status: 400 });
  }
  if (!getFinnhubKey()) {
    return NextResponse.json(
      { error: "FINNHUB_API_KEY is not configured. Set it to enable live data." },
      { headers: { "Cache-Control": "s-maxage=60" } }
    );
  }

  const cacheKey = `news:${symbol}`;
  const cached = cacheGet<NewsResult>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=1800" } });
  }

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - LOOKBACK_DAYS);

  try {
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
    // Newest first.
    articles.sort((a, b) => b.datetime - a.datetime);
    const result: NewsResult = { articles, fetchedAt: Math.floor(Date.now() / 1000) };
    cacheSet(cacheKey, result, CACHE_TTL_MS);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching news" },
      { headers: { "Cache-Control": "s-maxage=60" } }
    );
  }
}
