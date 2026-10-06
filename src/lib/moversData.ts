// Shared daily-bar loading + caching for the Daily movers feature, used by both the
// single-session (/api/movers) and multi-period trend (/api/movers/trend) routes. Both
// routes import from here so they share one in-memory cache instance per warm serverless
// worker instead of each re-fetching the same ~45-symbol, 6-month bar history.

import { alpacaGetMultiBars, type AlpacaBar } from "@/lib/alpaca";
import { allTickerRows } from "@/data/tickers";
import { nodeById } from "@/data/industry-map";

export interface SessionMoverRow extends MoverRow {
  close: number;
  prevClose: number;
}

export interface CategoryTrend {
  layer: string;
  avgChangePercent: number;
  count: number;
}

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

/** Per-session gainer/loser rows plus per-layer average change, shared by /api/movers and
 * /api/movers/news so "which theme moved" can never drift between the two. */
export function computeSessionMovers(
  bySymbol: Map<string, AlpacaBar[]>,
  targetDate: string,
  prevDate: string
): { movers: SessionMoverRow[]; categoryTrends: CategoryTrend[] } {
  const movers: SessionMoverRow[] = [];
  for (const row of allTickerRows) {
    if (!row.isUS) continue;
    const bars = bySymbol.get(row.symbol);
    if (!bars || bars.length === 0) continue;
    const byDate = new Map(bars.map((b) => [NY_DATE_FMT.format(new Date(b.t)), b]));
    const closeBar = byDate.get(targetDate);
    const prevBar = byDate.get(prevDate);
    if (!closeBar || !prevBar || prevBar.c === 0) continue;

    const { name, layer } = nodeMeta(row.nodeId);
    movers.push({
      symbol: row.symbol,
      nodeId: row.nodeId,
      name,
      layer,
      close: closeBar.c,
      prevClose: prevBar.c,
      changePercent: ((closeBar.c - prevBar.c) / prevBar.c) * 100,
    });
  }
  // Dedupe by symbol (a symbol can back more than one node) for category math, but keep the
  // full per-node list for the table since users expect to see the company they searched for.
  const bySymbolOnce = new Map<string, SessionMoverRow>();
  for (const m of movers) if (!bySymbolOnce.has(m.symbol)) bySymbolOnce.set(m.symbol, m);

  const layerTotals = new Map<string, { sum: number; count: number }>();
  for (const m of bySymbolOnce.values()) {
    const t = layerTotals.get(m.layer) ?? { sum: 0, count: 0 };
    t.sum += m.changePercent;
    t.count += 1;
    layerTotals.set(m.layer, t);
  }
  const categoryTrends: CategoryTrend[] = Array.from(layerTotals.entries())
    .map(([layer, t]) => ({ layer, avgChangePercent: t.sum / t.count, count: t.count }))
    .sort((a, b) => b.avgChangePercent - a.avgChangePercent);

  return { movers: movers.sort((a, b) => b.changePercent - a.changePercent), categoryTrends };
}
