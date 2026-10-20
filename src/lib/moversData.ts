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
export const LOOKBACK_DAYS_LONG = 400; // ~13 months — enough for a genuine 252-session
// volume profile (the entry-range route's technical range is built on this set; the movers
// set above stays at 190 days because that's all the movers views need).
const CACHE_TTL_MS = 15 * 60_000;
export const NY_DATE_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });
const NY_TIME_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
});

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
let longCache: { data: BarSet; fetchedAt: number } | null = null;

async function fetchBarSet(lookbackDays: number): Promise<BarSet> {
  const symbols = Array.from(new Set(allTickerRows.filter((r) => r.isUS).map((r) => r.symbol)));
  const now = Date.now();
  const start = new Date(now - lookbackDays * 24 * 3600_000).toISOString();
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

  return { bySymbol, dates };
}

export async function loadBarSet(): Promise<BarSet> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;
  const data = await fetchBarSet(LOOKBACK_DAYS);
  cache = { data, fetchedAt: Date.now() };
  return data;
}

/** The long-window set (~13 months) backing the entry-range route, whose volume profile
 * promises a trailing 12 months / 252 sessions — the 190-day movers set silently starved
 * that to ~130 sessions. Separate cache so neither consumer perturbs the other. */
export async function loadLongBarSet(): Promise<BarSet> {
  if (longCache && Date.now() - longCache.fetchedAt < CACHE_TTL_MS) return longCache.data;
  const data = await fetchBarSet(LOOKBACK_DAYS_LONG);
  longCache = { data, fetchedAt: Date.now() };
  return data;
}

/**
 * Is the last bar in this series today's still-forming US session? True only when the last
 * bar's NY date is today AND it's before the 16:00 ET close. After the close — and on
 * weekends/holidays, when the last bar is a completed prior session — returns false, so
 * consumers that build "prior benchmark" levels from completed bars only (the technical
 * entry range) don't throw away a finished session and lag a day behind every evening.
 * (Early-close days: the bar completes at 13:00 ET but reads as forming until 16:00 —
 * conservative and harmless.)
 */
export function isLastBarForming(bars: AlpacaBar[], now: Date = new Date()): boolean {
  if (bars.length === 0) return false;
  const last = bars[bars.length - 1];
  if (NY_DATE_FMT.format(new Date(last.t)) !== NY_DATE_FMT.format(now)) return false;
  const parts = NY_TIME_FMT.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute < 16 * 60;
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
