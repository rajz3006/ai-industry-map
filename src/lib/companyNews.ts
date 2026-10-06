// Per-symbol Finnhub company-news fetch, shared by /api/news (per-stock "why it moved"
// panels) and /api/movers/news (the Daily Movers digest) so both hit the same cache
// entries instead of double-fetching the same symbol within a TTL window.

import { cacheGet, cacheSet, finnhubGet } from "@/lib/finnhub";
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
