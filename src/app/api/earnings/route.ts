import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet, finnhubGet, getFinnhubKey } from "@/lib/finnhub";

export interface EarningsEvent {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  surprisePercent: number | null;
}

export interface EarningsResult {
  previous: EarningsEvent | null;
  next: EarningsEvent | null;
}

type FinnhubEarningsRow = {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  surprisePercent: number | null;
};

type FinnhubEarningsCalendar = {
  earningsCalendar?: FinnhubEarningsRow[];
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // earnings calendars move slowly

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Missing required 'symbol' query param" }, { status: 400 });
  }
  if (!getFinnhubKey()) {
    return NextResponse.json(
      { error: "FINNHUB_API_KEY is not configured. Set it to enable live data." },
      { headers: { "Cache-Control": "s-maxage=60" } }
    );
  }

  const cacheKey = `earnings:${symbol}`;
  const cached = cacheGet<EarningsResult>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
  }

  const today = new Date();
  const from = new Date(today);
  from.setFullYear(from.getFullYear() - 1);
  const to = new Date(today);
  to.setFullYear(to.getFullYear() + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const data = await finnhubGet<FinnhubEarningsCalendar>("/calendar/earnings", {
      symbol,
      from: fmt(from),
      to: fmt(to),
    });
    const rows = (data.earningsCalendar ?? []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const todayStr = fmt(today);
    const past = rows.filter((r) => r.date <= todayStr);
    const future = rows.filter((r) => r.date > todayStr);

    const toEvent = (r: FinnhubEarningsRow): EarningsEvent => ({
      date: r.date,
      epsActual: r.epsActual ?? null,
      epsEstimate: r.epsEstimate ?? null,
      revenueActual: r.revenueActual ?? null,
      revenueEstimate: r.revenueEstimate ?? null,
      surprisePercent: r.surprisePercent ?? null,
    });

    const result: EarningsResult = {
      previous: past.length ? toEvent(past[past.length - 1]) : null,
      next: future.length ? toEvent(future[0]) : null,
    };
    cacheSet(cacheKey, result, CACHE_TTL_MS);
    return NextResponse.json(result, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching earnings" },
      { headers: { "Cache-Control": "s-maxage=30" } }
    );
  }
}
