// Shared daily-bar loading + caching for the Evaluator tab's Step 6 (technicals) and the
// composite risk/reward block. src/lib/moversData.ts's loadBarSet() only pulls ~190 calendar
// days (LOOKBACK_DAYS = 190, "~6 months plus buffer"), which is NOT enough for a 200-day SMA
// or a clean 52-week high/low (needs ~260 trading days of history). Rather than extend that
// shared cache's window (which would slow down the unrelated Daily Movers feature for every
// request), this fetches its own longer window directly via alpacaGetMultiBars, covering all
// 57 symbols in one batched request exactly like loadBarSet does, and caches it in-process so
// both the bulk and single-symbol /api/evaluate paths reuse one fetch per TTL window.

import { alpacaGetMultiBars, type AlpacaBar } from "@/lib/alpaca";
import { allUSSymbols } from "@/data/tickers";

// ~260 trading days (200-day SMA + 52-week hi/lo) needs roughly 365 calendar days; 420 adds a
// buffer for weekends/holidays and the occasional late-starting IPO-era gap in a symbol's history.
export const EVAL_LOOKBACK_DAYS = 420;

// Price bars don't need to be fresher than this for a fundamentals-weighted 8-step evaluation
// that's also gated by FMP's 8h cache and Finnhub's own TTLs elsewhere in this feature — 30
// minutes keeps the Evaluator tab's technicals reasonably current without re-fetching ~57
// symbols' worth of daily bars on every request.
const CACHE_TTL_MS = 30 * 60_000;

interface BarCache {
  bySymbol: Map<string, AlpacaBar[]>;
  fetchedAt: number;
}

let cache: BarCache | null = null;
let inFlight: Promise<Map<string, AlpacaBar[]>> | null = null;

async function fetchAllBars(): Promise<Map<string, AlpacaBar[]>> {
  const now = Date.now();
  const start = new Date(now - EVAL_LOOKBACK_DAYS * 24 * 3600_000).toISOString();
  const end = new Date(now).toISOString();
  const raw = await alpacaGetMultiBars(allUSSymbols, {
    timeframe: "1Day",
    start,
    end,
    limit: 10_000,
    adjustment: "split",
  });
  const bySymbol = new Map<string, AlpacaBar[]>();
  for (const [sym, bars] of Object.entries(raw)) {
    bySymbol.set(sym, bars.slice().sort((a, b) => a.t.localeCompare(b.t)));
  }
  return bySymbol;
}

/** Loads (or returns the cached) map of symbol -> ascending daily bars for every US symbol in
 * the universe. Throws AlpacaError on failure (e.g. missing creds) — callers must catch and
 * degrade (treat Step 6 / risk-reward as unavailable) rather than let one bad fetch kill the
 * whole evaluation. Coalesces concurrent callers (e.g. a bulk pass firing 57 evaluations at
 * once) onto a single in-flight fetch instead of issuing 57 redundant Alpaca requests. */
export async function loadEvaluationBars(): Promise<Map<string, AlpacaBar[]>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.bySymbol;
  if (inFlight) return inFlight;
  inFlight = fetchAllBars()
    .then((bySymbol) => {
      cache = { bySymbol, fetchedAt: Date.now() };
      return bySymbol;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function loadBarsForSymbol(symbol: string): Promise<AlpacaBar[]> {
  const map = await loadEvaluationBars();
  return map.get(symbol.toUpperCase()) ?? [];
}
