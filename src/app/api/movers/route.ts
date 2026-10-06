import { NextRequest, NextResponse } from "next/server";
import { AlpacaError } from "@/lib/alpaca";
import {
  loadBarSet,
  resolveSessionDate,
  computeSessionMovers,
  type SessionMoverRow,
  type CategoryTrend,
} from "@/lib/moversData";

export type { SessionMoverRow, CategoryTrend };

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

    const { movers, categoryTrends } = computeSessionMovers(bySymbol, targetDate, prevDate);

    const response: MoversResponse = {
      date: targetDate,
      availableDates: { min: dates[0], max: dates[dates.length - 1] },
      movers,
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
