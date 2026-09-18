import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet, finnhubGet, getFinnhubKey } from "@/lib/finnhub";

export type Range = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y";

export interface CandlePoint {
  time: number; // unix seconds
  value: number; // close price
}

export interface CandlesResult {
  points: CandlePoint[];
  resolution: string;
}

type FinnhubCandles = {
  c?: number[];
  t?: number[];
  s: string; // "ok" | "no_data"
};

const RANGE_CONFIG: Record<Range, { resolution: string; fromSeconds: (now: number) => number; ttlMs: number }> = {
  "1D": { resolution: "5", fromSeconds: (now) => now - 2 * 24 * 3600, ttlMs: 30_000 },
  "5D": { resolution: "30", fromSeconds: (now) => now - 6 * 24 * 3600, ttlMs: 60_000 },
  "1M": { resolution: "60", fromSeconds: (now) => now - 32 * 24 * 3600, ttlMs: 5 * 60_000 },
  "6M": { resolution: "D", fromSeconds: (now) => now - 185 * 24 * 3600, ttlMs: 15 * 60_000 },
  YTD: {
    resolution: "D",
    fromSeconds: () => Math.floor(new Date(new Date().getUTCFullYear(), 0, 1).getTime() / 1000),
    ttlMs: 15 * 60_000,
  },
  "1Y": { resolution: "D", fromSeconds: (now) => now - 370 * 24 * 3600, ttlMs: 15 * 60_000 },
  "5Y": { resolution: "W", fromSeconds: (now) => now - 5 * 370 * 24 * 3600, ttlMs: 60 * 60_000 },
};

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
  if (!getFinnhubKey()) {
    return NextResponse.json(
      { error: "FINNHUB_API_KEY is not configured. Set it to enable live data." },
      { headers: { "Cache-Control": "s-maxage=30" } }
    );
  }

  const cfg = RANGE_CONFIG[range];
  const now = Math.floor(Date.now() / 1000);
  const from = cfg.fromSeconds(now);
  const cacheKey = `candles:${symbol}:${range}`;
  const cached = cacheGet<CandlesResult>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } });
  }

  try {
    const data = await finnhubGet<FinnhubCandles>("/stock/candle", {
      symbol,
      resolution: cfg.resolution,
      from,
      to: now,
    });
    if (data.s !== "ok" || !data.c || !data.t || data.c.length === 0) {
      return NextResponse.json(
        {
          error:
            "Intraday/historical candle data unavailable for this symbol on the free tier, or no data for this range.",
        },
        { headers: { "Cache-Control": "s-maxage=30" } }
      );
    }
    const points: CandlePoint[] = data.t.map((t, i) => ({ time: t, value: data.c![i] }));
    const result: CandlesResult = { points, resolution: cfg.resolution };
    cacheSet(cacheKey, result, cfg.ttlMs);
    return NextResponse.json(result, { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching candles" },
      { headers: { "Cache-Control": "s-maxage=30" } }
    );
  }
}
