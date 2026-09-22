import { NextRequest, NextResponse } from "next/server";
import { AlpacaError, type AlpacaBar } from "@/lib/alpaca";
import { allTickerRows } from "@/data/tickers";
import { loadBarSet, resolveSessionDate, nodeMeta, NY_DATE_FMT, type MoverRow } from "@/lib/moversData";

export type Period = "1M" | "3M" | "6M";
const PERIOD_DAYS: Record<Period, number> = { "1M": 30, "3M": 90, "6M": 185 };

export interface TrendCategoryPoint {
  date: string;
  avgChangePercent: number;
}

export interface TrendCategorySeries {
  layer: string;
  points: TrendCategoryPoint[];
  latestChangePercent: number;
}

export interface TrendMoversResponse {
  period: Period;
  start: string;
  end: string;
  leaders: MoverRow[];
  laggards: MoverRow[];
  categorySeries: TrendCategorySeries[];
}

function isPeriod(v: string | null): v is Period {
  return v === "1M" || v === "3M" || v === "6M";
}

export async function GET(req: NextRequest) {
  const periodParam = req.nextUrl.searchParams.get("period");
  const period: Period = isPeriod(periodParam) ? periodParam : "1M";
  const requestedEnd = req.nextUrl.searchParams.get("end");

  try {
    const { bySymbol, dates } = await loadBarSet();
    if (dates.length < 2) {
      return NextResponse.json({ error: "Not enough historical bar data available yet" }, { status: 503 });
    }

    const end = resolveSessionDate(dates, requestedEnd);
    const cutoff = new Date(end + "T00:00:00Z");
    cutoff.setUTCDate(cutoff.getUTCDate() - PERIOD_DAYS[period]);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const periodDates = dates.filter((d) => d >= cutoffStr && d <= end);
    const start = periodDates[0] ?? dates[0];
    if (periodDates.length < 2) {
      return NextResponse.json({ error: "Not enough sessions in the selected period" }, { status: 404 });
    }

    // Per-symbol: bar-by-date map restricted to the period, plus first/last available bar
    // within it — using "first/last available" rather than requiring an exact bar on `start`
    // or `end` keeps recently-listed or thinly-traded tickers from being dropped entirely.
    const perSymbolByDate = new Map<string, Map<string, AlpacaBar>>();
    const perSymbolOrdered = new Map<string, AlpacaBar[]>();
    for (const row of allTickerRows) {
      if (!row.isUS) continue;
      if (perSymbolByDate.has(row.symbol)) continue;
      const bars = bySymbol.get(row.symbol);
      if (!bars) continue;
      const inRange = bars.filter((b) => {
        const d = NY_DATE_FMT.format(new Date(b.t));
        return d >= start && d <= end;
      });
      if (inRange.length < 2) continue;
      const byDate = new Map(inRange.map((b) => [NY_DATE_FMT.format(new Date(b.t)), b]));
      perSymbolByDate.set(row.symbol, byDate);
      perSymbolOrdered.set(row.symbol, inRange);
    }

    // Leaders/laggards: cumulative % change from each symbol's first to last bar in the period.
    const cumulative: MoverRow[] = [];
    for (const row of allTickerRows) {
      if (!row.isUS) continue;
      const ordered = perSymbolOrdered.get(row.symbol);
      if (!ordered) continue;
      const first = ordered[0];
      const last = ordered[ordered.length - 1];
      if (first.c === 0) continue;
      const { name, layer } = nodeMeta(row.nodeId);
      cumulative.push({
        symbol: row.symbol,
        nodeId: row.nodeId,
        name,
        layer,
        changePercent: ((last.c - first.c) / first.c) * 100,
      });
    }
    const dedupedBySymbol = new Map<string, MoverRow>();
    for (const m of cumulative) if (!dedupedBySymbol.has(m.symbol)) dedupedBySymbol.set(m.symbol, m);
    const sorted = Array.from(dedupedBySymbol.values()).sort((a, b) => b.changePercent - a.changePercent);
    const leaders = sorted.slice(0, 12);
    const laggards = sorted.slice(-12).reverse();

    // Category trend lines: for each trading day in the period, average each layer's
    // symbols' cumulative % change (rebased to 0 at that symbol's own first bar in the
    // period), so lines start together at 0 and diverge as the period plays out.
    const layerToSymbols = new Map<string, string[]>();
    for (const [symbol] of perSymbolByDate) {
      const row = allTickerRows.find((r) => r.isUS && r.symbol === symbol);
      if (!row) continue;
      const { layer } = nodeMeta(row.nodeId);
      const arr = layerToSymbols.get(layer) ?? [];
      if (!arr.includes(symbol)) arr.push(symbol);
      layerToSymbols.set(layer, arr);
    }

    const categorySeries: TrendCategorySeries[] = [];
    for (const [layer, symbols] of layerToSymbols) {
      const points: TrendCategoryPoint[] = [];
      for (const date of periodDates) {
        let sum = 0;
        let count = 0;
        for (const symbol of symbols) {
          const ordered = perSymbolOrdered.get(symbol);
          const byDate = perSymbolByDate.get(symbol);
          if (!ordered || !byDate) continue;
          const bar = byDate.get(date);
          if (!bar) continue;
          const base = ordered[0].c;
          if (base === 0) continue;
          sum += ((bar.c - base) / base) * 100;
          count += 1;
        }
        if (count > 0) points.push({ date, avgChangePercent: sum / count });
      }
      if (points.length > 0) {
        categorySeries.push({ layer, points, latestChangePercent: points[points.length - 1].avgChangePercent });
      }
    }
    categorySeries.sort((a, b) => b.latestChangePercent - a.latestChangePercent);

    const response: TrendMoversResponse = { period, start, end, leaders, laggards, categorySeries };
    return NextResponse.json(response);
  } catch (err) {
    const status = err instanceof AlpacaError ? err.status ?? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching movers trend" },
      { status }
    );
  }
}
