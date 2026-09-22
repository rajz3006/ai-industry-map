import { NextRequest, NextResponse } from "next/server";
import { AlpacaError } from "@/lib/alpaca";
import { allTickerRows } from "@/data/tickers";
import { loadBarSet, resolveSessionDate, nodeMeta, NY_DATE_FMT, type MoverRow } from "@/lib/moversData";

export interface SessionMoverRow extends MoverRow {
  close: number;
  prevClose: number;
}

export interface CategoryTrend {
  layer: string;
  avgChangePercent: number;
  count: number;
}

export interface MoversResponse {
  date: string;
  availableDates: { min: string; max: string };
  movers: SessionMoverRow[];
  categoryTrends: CategoryTrend[];
}

export async function GET(req: NextRequest) {
  const requestedDate = req.nextUrl.searchParams.get("date");

  try {
    const { bySymbol, dates } = await loadBarSet();
    if (dates.length < 2) {
      return NextResponse.json({ error: "Not enough historical bar data available yet" }, { status: 503 });
    }

    const targetDate = resolveSessionDate(dates, requestedDate);
    const targetIdx = dates.indexOf(targetDate);
    if (targetIdx < 1) {
      return NextResponse.json({ error: "No prior session available for comparison on this date" }, { status: 404 });
    }
    const prevDate = dates[targetIdx - 1];

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
