// Shared daily-bar loading + caching for the Daily movers feature, used by both the
// single-session (/api/movers) and multi-period trend (/api/movers/trend) routes. Both
// routes import from here so they share one in-memory cache instance per warm serverless
// worker instead of each re-fetching the same ~45-symbol, 6-month bar history.

import { alpacaGetMultiBars, type AlpacaBar } from "@/lib/alpaca";
import { allTickerRows } from "@/data/tickers";
import { nodeById } from "@/data/industry-map";

export const LOOKBACK_DAYS = 190; // ~6 months plus buffer for period-start comparisons
const CACHE_TTL_MS = 15 * 60_000;
export const NY_DATE_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });

export interface MoverRow {
  symbol: string;
  nodeId: string;
  name: string;
  layer: string;
  changePercent: number;
}

export interface BarSet {
  bySymbol: Map<string, AlpacaBar[]>;
  dates: string[]; // ascending, distinct NY trading dates across the whole set
}

let cache: { data: BarSet; fetchedAt: number } | null = null;

export async function loadBarSet(): Promise<BarSet> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;

  const symbols = Array.from(new Set(allTickerRows.filter((r) => r.isUS).map((r) => r.symbol)));
  const now = Date.now();
  const start = new Date(now - LOOKBACK_DAYS * 24 * 3600_000).toISOString();
  const end = new Date(now).toISOString();

  const raw = await alpacaGetMultiBars(symbols, {
    timeframe: "1Day",
    start,
    end,
    limit: 10_000,
    adjustment: "split",
  });

  const bySymbol = new Map<string, AlpacaBar[]>();
  const dateSet = new Set<string>();
  for (const [sym, bars] of Object.entries(raw)) {
    const sorted = bars.slice().sort((a, b) => a.t.localeCompare(b.t));
    bySymbol.set(sym, sorted);
    for (const b of sorted) dateSet.add(NY_DATE_FMT.format(new Date(b.t)));
  }
  const dates = Array.from(dateSet).sort();

  const data: BarSet = { bySymbol, dates };
  cache = { data, fetchedAt: Date.now() };
  return data;
}

/** Resolves a requested date to the nearest available trading session at or before it. */
export function resolveSessionDate(dates: string[], requested: string | null): string {
  if (!requested) return dates[dates.length - 1];
  const eligible = dates.filter((d) => d <= requested);
  return eligible.length > 0 ? eligible[eligible.length - 1] : dates[0];
}

export function nodeMeta(nodeId: string): { name: string; layer: string } {
  const n = nodeById[nodeId];
  return { name: n?.name ?? nodeId, layer: n?.layer ?? "Other" };
}
