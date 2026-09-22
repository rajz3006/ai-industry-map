import { NextRequest, NextResponse } from "next/server";
import { alpacaGetMultiBars, AlpacaError, type AlpacaBar } from "@/lib/alpaca";
import { allTickerRows } from "@/data/tickers";
import { nodeById } from "@/data/industry-map";

const LOOKBACK_DAYS = 190; // ~6 months plus buffer for the "previous session" comparison
const CACHE_TTL_MS = 15 * 60_000;
const NY_DATE_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });

export interface MoverRow {
  symbol: string;
  nodeId: string;
  name: string;
  layer: string;
  close: number;
  prevClose: number;
  changePercent: number;
}

export interface CategoryTrend {
  layer: string;
  avgChangePercent: number;
  count: number;
}

export interface MoversResponse {
  date: string;
  availableDates: { min: string; max: string };
  movers: MoverRow[];
  categoryTrends: CategoryTrend[];
}

interface BarSet {
  bySymbol: Map<string, AlpacaBar[]>;
  dates: string[]; // ascending, distinct NY trading dates across the whole set
}

let cache: { data: BarSet; fetchedAt: number } | null = null;

async function loadBars(): Promise<BarSet> {
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

export async function GET(req: NextRequest) {
  const requestedDate = req.nextUrl.searchParams.get("date");

  try {
    const { bySymbol, dates } = await loadBars();
    if (dates.length < 2) {
      return NextResponse.json({ error: "Not enough historical bar data available yet" }, { status: 503 });
    }

    // Resolve the requested date to the nearest available trading session at or before it.
    let targetDate = dates[dates.length - 1];
    if (requestedDate) {
      const eligible = dates.filter((d) => d <= requestedDate);
      if (eligible.length > 0) targetDate = eligible[eligible.length - 1];
      else targetDate = dates[0];
    }
    const targetIdx = dates.indexOf(targetDate);
    if (targetIdx < 1) {
      return NextResponse.json({ error: "No prior session available for comparison on this date" }, { status: 404 });
    }
    const prevDate = dates[targetIdx - 1];

    const movers: MoverRow[] = [];
    for (const row of allTickerRows) {
      if (!row.isUS) continue;
      const bars = bySymbol.get(row.symbol);
      if (!bars || bars.length === 0) continue;
      const byDate = new Map(bars.map((b) => [NY_DATE_FMT.format(new Date(b.t)), b]));
      const closeBar = byDate.get(targetDate);
      const prevBar = byDate.get(prevDate);
      if (!closeBar || !prevBar || prevBar.c === 0) continue;

      const n = nodeById[row.nodeId];
      movers.push({
        symbol: row.symbol,
        nodeId: row.nodeId,
        name: n?.name ?? row.nodeId,
        layer: n?.layer ?? "Other",
        close: closeBar.c,
        prevClose: prevBar.c,
        changePercent: ((closeBar.c - prevBar.c) / prevBar.c) * 100,
      });
    }
    // Dedupe by symbol (a symbol can back more than one node) for category math, but keep the
    // full per-node list for the table since users expect to see the company they searched for.
    const bySymbolOnce = new Map<string, MoverRow>();
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

    const response: MoversResponse = {
      date: targetDate,
      availableDates: { min: dates[0], max: dates[dates.length - 1] },
      movers: movers.sort((a, b) => b.changePercent - a.changePercent),
      categoryTrends,
    };
    return NextResponse.json(response);
  } catch (err) {
    const status = err instanceof AlpacaError ? err.status ?? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching movers" },
      { status }
    );
  }
}
