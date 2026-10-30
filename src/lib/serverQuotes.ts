// Server-only batch quote fetch, shared by /api/quote (client polling) and the home page's
// server-rendered initial seed (so the first paint already has prices instead of a loading
// flash). Both call this same function, so behavior — caching, error shape — stays identical.

import { cacheGet, cacheSet, finnhubGet, getFinnhubKey, mapWithConcurrency } from "@/lib/finnhub";
import { alpacaGetSnapshots, getAlpacaCreds, type AlpacaSnapshot } from "@/lib/alpaca";

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

const NY_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });

function quoteFromSnapshot(snap: AlpacaSnapshot | undefined): QuoteResult | null {
  const trade = snap?.latestTrade;
  const day = snap?.dailyBar;
  if (!trade || !day) return null;
  const price = trade.p;
  const tradeAt = new Date(trade.t);
  // Before the new session's first regular-hours print, dailyBar is still yesterday's bar,
  // so yesterday's close (not prevDailyBar) is the reference — same as Finnhub's `pc`.
  const newSession = NY_DATE.format(new Date(day.t)) < NY_DATE.format(tradeAt);
  const prevClose = newSession ? day.c : snap?.prevDailyBar?.c;
  if (!prevClose || prevClose <= 0 || !(price > 0)) return null;
  return {
    price,
    change: price - prevClose,
    changePercent: ((price - prevClose) / prevClose) * 100,
    high: newSession ? price : day.h,
    low: newSession ? price : day.l,
    open: newSession ? price : day.o,
    prevClose,
    timestamp: Math.floor(tradeAt.getTime() / 1000),
  };
}

/** Fetches quotes for exactly the given symbols (caller handles any dedup/cap).
 * Alpaca snapshots serve the whole batch in one request; Finnhub (one rate-limited call per
 * symbol, 50/min process-wide) is only used for symbols Alpaca can't price or when it fails. */
export async function fetchQuoteMap(symbols: string[]): Promise<QuoteMap> {
  const body: QuoteMap = {};
  let todo = symbols.filter((s) => {
    const hit = cacheGet<QuoteResult>(`quote:${s}`);
    if (hit) body[s] = hit;
    return !hit;
  });

  if (todo.length > 0 && getAlpacaCreds()) {
    try {
      const snaps = await alpacaGetSnapshots(todo);
      for (const s of todo) {
        const q = quoteFromSnapshot(snaps[s]);
        if (q) {
          cacheSet(`quote:${s}`, q, CACHE_TTL_MS);
          body[s] = q;
        }
      }
      todo = todo.filter((s) => !body[s]);
    } catch {
      // Alpaca unavailable (bad key, outage): fall through to Finnhub for everything left.
    }
  }

  if (todo.length > 0) {
    if (!getFinnhubKey()) {
      for (const s of todo) body[s] = { error: "No quote source configured (set ALPACA_API_KEY/SECRET or FINNHUB_API_KEY)." };
    } else {
      const results = await mapWithConcurrency(todo, CONCURRENCY, fetchQuote);
      todo.forEach((s, i) => {
        body[s] = results[i];
      });
    }
  }
  // Preserve the caller's symbol order.
  return Object.fromEntries(symbols.map((s) => [s, body[s]]));
}
