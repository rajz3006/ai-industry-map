// Server-only batch quote fetch, shared by /api/quote (client polling) and the home page's
// server-rendered initial seed (so the first paint already has prices instead of a loading
// flash). Both call this same function, so behavior — caching, error shape — stays identical.

import { cacheGet, cacheSet, finnhubGet, getFinnhubKey, mapWithConcurrency } from "@/lib/finnhub";

export interface QuoteResult {
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  timestamp: number;
}

export type QuoteMap = Record<string, QuoteResult | { error: string }>;

type FinnhubQuote = {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h: number; // high
  l: number; // low
  o: number; // open
  pc: number; // prev close
  t: number; // timestamp (unix seconds)
};

const CACHE_TTL_MS = 10_000;
const CONCURRENCY = 6;

async function fetchQuote(symbol: string): Promise<QuoteResult | { error: string }> {
  const cacheKey = `quote:${symbol}`;
  const cached = cacheGet<QuoteResult>(cacheKey);
  if (cached) return cached;

  try {
    const q = await finnhubGet<FinnhubQuote>("/quote", { symbol });
    if (!q || (q.c === 0 && q.pc === 0)) {
      return { error: "No quote data returned for symbol" };
    }
    const result: QuoteResult = {
      price: q.c,
      change: q.d,
      changePercent: q.dp,
      high: q.h,
      low: q.l,
      open: q.o,
      prevClose: q.pc,
      timestamp: q.t,
    };
    cacheSet(cacheKey, result, CACHE_TTL_MS);
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error fetching quote" };
  }
}

/** Fetches quotes for exactly the given symbols (caller handles any dedup/cap). */
export async function fetchQuoteMap(symbols: string[]): Promise<QuoteMap> {
  if (!getFinnhubKey()) {
    return Object.fromEntries(
      symbols.map((s) => [s, { error: "FINNHUB_API_KEY is not configured. Set it to enable live data." }])
    );
  }
  const results = await mapWithConcurrency(symbols, CONCURRENCY, fetchQuote);
  const body: QuoteMap = {};
  symbols.forEach((sym, i) => {
    body[sym] = results[i];
  });
  return body;
}
