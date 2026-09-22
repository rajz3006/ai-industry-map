import { NextResponse } from "next/server";
import { AlpacaError } from "@/lib/alpaca";
import { allTickerRows } from "@/data/tickers";
import { loadBarSet, nodeMeta, NY_DATE_FMT, type MoverRow } from "@/lib/moversData";

// "This week" / "last week" are the two most recent 5-trading-session windows in the cached
// bar set — not calendar weeks, so a short holiday week just narrows both windows equally.
const WEEK_SESSIONS = 5;

export interface CategoryMomentum {
  layer: string;
  thisWeekPct: number;
  lastWeekPct: number;
  deltaPct: number;
}

export interface MoversSignalsResponse {
  thisWeek: { start: string; end: string };
  lastWeek: { start: string; end: string };
  categoryMomentum: CategoryMomentum[];
  weeklyLeaders: MoverRow[];
  weeklyLaggards: MoverRow[];
}

export async function GET() {
  try {
    const { bySymbol, dates } = await loadBarSet();
    const idxEnd = dates.length - 1;
    const idxWeekStart = idxEnd - WEEK_SESSIONS;
    const idxPriorWeekStart = idxWeekStart - WEEK_SESSIONS;
    if (idxPriorWeekStart < 0) {
      return NextResponse.json({ error: "Not enough historical sessions for a week-over-week read" }, { status: 503 });
    }

    const thisWeekEndDate = dates[idxEnd];
    const thisWeekStartDate = dates[idxWeekStart];
    const lastWeekStartDate = dates[idxPriorWeekStart];

    interface Weekly extends MoverRow {
      lastWeekPct: number;
    }
    const weekly: Weekly[] = [];
    for (const row of allTickerRows) {
      if (!row.isUS) continue;
      const bars = bySymbol.get(row.symbol);
      if (!bars) continue;
      const byDate = new Map(bars.map((b) => [NY_DATE_FMT.format(new Date(b.t)), b]));
      const endBar = byDate.get(thisWeekEndDate);
      const weekStartBar = byDate.get(thisWeekStartDate);
      const priorWeekStartBar = byDate.get(lastWeekStartDate);
      if (!endBar || !weekStartBar || !priorWeekStartBar) continue;
      if (weekStartBar.c === 0 || priorWeekStartBar.c === 0) continue;

      const { name, layer } = nodeMeta(row.nodeId);
      weekly.push({
        symbol: row.symbol,
        nodeId: row.nodeId,
        name,
        layer,
        changePercent: ((endBar.c - weekStartBar.c) / weekStartBar.c) * 100,
        lastWeekPct: ((weekStartBar.c - priorWeekStartBar.c) / priorWeekStartBar.c) * 100,
      });
    }

    const dedupedBySymbol = new Map<string, Weekly>();
    for (const w of weekly) if (!dedupedBySymbol.has(w.symbol)) dedupedBySymbol.set(w.symbol, w);
    const sorted = Array.from(dedupedBySymbol.values()).sort((a, b) => b.changePercent - a.changePercent);
    const weeklyLeaders: MoverRow[] = sorted.slice(0, 6);
    const weeklyLaggards: MoverRow[] = sorted.slice(-6).reverse();

    const layerTotals = new Map<string, { thisWeek: number; lastWeek: number; count: number }>();
    for (const w of dedupedBySymbol.values()) {
      const t = layerTotals.get(w.layer) ?? { thisWeek: 0, lastWeek: 0, count: 0 };
      t.thisWeek += w.changePercent;
      t.lastWeek += w.lastWeekPct;
      t.count += 1;
      layerTotals.set(w.layer, t);
    }
    const categoryMomentum: CategoryMomentum[] = Array.from(layerTotals.entries())
      .map(([layer, t]) => {
        const thisWeekPct = t.thisWeek / t.count;
        const lastWeekPct = t.lastWeek / t.count;
        return { layer, thisWeekPct, lastWeekPct, deltaPct: thisWeekPct - lastWeekPct };
      })
      .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));

    const response: MoversSignalsResponse = {
      thisWeek: { start: thisWeekStartDate, end: thisWeekEndDate },
      lastWeek: { start: lastWeekStartDate, end: thisWeekStartDate },
      categoryMomentum,
      weeklyLeaders,
      weeklyLaggards,
    };
    return NextResponse.json(response);
  } catch (err) {
    const status = err instanceof AlpacaError ? err.status ?? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error computing signals" },
      { status }
    );
  }
}
