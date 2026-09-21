import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet, finnhubGet, getFinnhubKey, mapWithConcurrency } from "@/lib/finnhub";

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
const CONCURRENCY = 6;

const fmt = (d: Date) => d.toISOString().slice(0, 10);

async function fetchEarnings(symbol: string): Promise<EarningsResult | { error: string }> {
  const cacheKey = `earnings:${symbol}`;
  const cached = cacheGet<EarningsResult>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  const from = new Date(today);
  from.setFullYear(from.getFullYear() - 1);
  const to = new Date(today);
  to.setFullYear(to.getFullYear() + 1);

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
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error fetching earnings" };
  }
}

export async function GET(req: NextRequest) {
  // Batch mode: ?symbols=AAPL,MSFT — returns a map. Single mode: ?symbol=AAPL.
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  const singleParam = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();

  if (!symbolsParam && !singleParam) {
    return NextResponse.json({ error: "Missing required 'symbol' or 'symbols' query param" }, { status: 400 });
  }
  if (!getFinnhubKey()) {
    const noKey = { error: "FINNHUB_API_KEY is not configured. Set it to enable live data." };
    if (symbolsParam) {
      // Batch mode: return a per-symbol map so the client hook can merge it directly.
      const map: Record<string, { error: string }> = {};
      for (const s of symbolsParam.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean)) {
        map[s] = noKey;
      }
      return NextResponse.json(map, { headers: { "Cache-Control": "s-maxage=60" } });
    }
    return NextResponse.json(noKey, { headers: { "Cache-Control": "s-maxage=60" } });
  }

  const symbols = symbolsParam
    ? Array.from(
        new Set(
          symbolsParam
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean)
        )
      ).slice(0, 100)
    : [singleParam as string];

  const results = await mapWithConcurrency(symbols, CONCURRENCY, fetchEarnings);

  if (singleParam && !symbolsParam) {
    // Backward-compatible single-symbol response shape.
    const r = results[0];
    if (r && "error" in r) {
      return NextResponse.json(r, { headers: { "Cache-Control": "s-maxage=30" } });
    }
    return NextResponse.json(r, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
  }

  const body: Record<string, EarningsResult | { error: string }> = {};
  symbols.forEach((sym, i) => {
    body[sym] = results[i];
  });
  return NextResponse.json(body, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}

/** Symbol-keyed map returned by batch mode (?symbols=A,B,C). */
export type EarningsMap = Record<string, EarningsResult | { error: string }>;
