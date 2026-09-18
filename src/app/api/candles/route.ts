import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/finnhub";
import { alpacaGetBars, getAlpacaCreds, type AlpacaBar } from "@/lib/alpaca";

export type Range = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y";

export interface CandlePoint {
  time: number; // unix seconds
  value: number; // close price
}

export interface CandlesResult {
  points: CandlePoint[];
  resolution: string;
}

const RANGE_CONFIG: Record<
  Range,
  { timeframe: string; fromMs: (now: number) => number; ttlMs: number; sessionDays?: number }
> = {
  // 1D/5D fetch a wider buffer window (to safely cover weekends/holidays) and then get
  // trimmed below to exactly the N most recent *trading* sessions via `sessionDays` — a
  // fixed calendar lookback alone over/under-shoots whenever the window crosses a holiday.
  "1D": { timeframe: "5Min", fromMs: (now) => now - 10 * 24 * 3600_000, ttlMs: 30_000, sessionDays: 1 },
  "5D": { timeframe: "15Min", fromMs: (now) => now - 14 * 24 * 3600_000, ttlMs: 60_000, sessionDays: 5 },
  "1M": { timeframe: "1Hour", fromMs: (now) => now - 32 * 24 * 3600_000, ttlMs: 5 * 60_000 },
  "6M": { timeframe: "1Day", fromMs: (now) => now - 185 * 24 * 3600_000, ttlMs: 15 * 60_000 },
  YTD: {
    timeframe: "1Day",
    fromMs: () => new Date(new Date().getUTCFullYear(), 0, 1).getTime(),
    ttlMs: 15 * 60_000,
  },
  "1Y": { timeframe: "1Day", fromMs: (now) => now - 370 * 24 * 3600_000, ttlMs: 15 * 60_000 },
  "5Y": { timeframe: "1Week", fromMs: (now) => now - 5 * 370 * 24 * 3600_000, ttlMs: 60 * 60_000 },
};

const NY_DATE_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }); // "YYYY-MM-DD"

/** Trims bars down to the N most recent distinct *trading* days (NYSE-local calendar
 * date), so "1D" means "the latest session" and "5D" means "the latest 5 sessions" —
 * not "the last N*24h", which over-includes across weekends/holidays. */
function trimToRecentSessions(bars: AlpacaBar[], sessionDays: number): AlpacaBar[] {
  const dateKeys = bars.map((b) => NY_DATE_FMT.format(new Date(b.t)));
  const distinctDates = Array.from(new Set(dateKeys));
  const keep = new Set(distinctDates.slice(-sessionDays));
  return bars.filter((_, i) => keep.has(dateKeys[i]));
}

function isRange(v: string | null): v is Range {
  return !!v && v in RANGE_CONFIG;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  const rangeParam = req.nextUrl.searchParams.get("range");
  const range: Range = isRange(rangeParam) ? rangeParam : "1M";

  if (!symbol) {
    return NextResponse.json({ error: "Missing required 'symbol' query param" }, { status: 400 });
  }
  if (!getAlpacaCreds()) {
    return NextResponse.json(
      { error: "ALPACA_API_KEY/ALPACA_SECRET_KEY are not configured. Set them to enable chart history." },
      { headers: { "Cache-Control": "s-maxage=30" } }
    );
  }

  const cfg = RANGE_CONFIG[range];
  const now = Date.now();
  const from = cfg.fromMs(now);
  const cacheKey = `candles:${symbol}:${range}`;
  const cached = cacheGet<CandlesResult>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } });
  }

  try {
    let bars = await alpacaGetBars(symbol, {
      timeframe: cfg.timeframe,
      start: new Date(from).toISOString(),
      end: new Date(now).toISOString(),
      limit: 10000,
      adjustment: "split",
    });
    if (bars.length === 0) {
      return NextResponse.json(
        { error: "No historical data available for this symbol/range (may be outside IEX free-feed coverage)." },
        { headers: { "Cache-Control": "s-maxage=30" } }
      );
    }
    if (cfg.sessionDays) {
      bars = trimToRecentSessions(bars, cfg.sessionDays);
    }
    const points: CandlePoint[] = bars.map((b) => ({ time: Math.floor(new Date(b.t).getTime() / 1000), value: b.c }));
    const result: CandlesResult = { points, resolution: cfg.timeframe };
    cacheSet(cacheKey, result, cfg.ttlMs);
    return NextResponse.json(result, { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching candles" },
      { headers: { "Cache-Control": "s-maxage=30" } }
    );
  }
}
