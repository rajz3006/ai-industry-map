import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet, finnhubGet, getFinnhubKey, mapWithConcurrency } from "@/lib/finnhub";

export interface QuoteResult {
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  timestamp: number;
}

type FinnhubQuote = {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h: number; // high
  l: number; // low
  o: number; // open
  pc: number; // prev close
  t: number; // timestamp (unix seconds)
};

const CACHE_TTL_MS = 10_000;
const CONCURRENCY = 6;

async function fetchQuote(symbol: string): Promise<QuoteResult | { error: string }> {
  const cacheKey = `quote:${symbol}`;
  const cached = cacheGet<QuoteResult>(cacheKey);
  if (cached) return cached;

  try {
    const q = await finnhubGet<FinnhubQuote>("/quote", { symbol });
    if (!q || (q.c === 0 && q.pc === 0)) {
      return { error: "No quote data returned for symbol" };
    }
    const result: QuoteResult = {
      price: q.c,
      change: q.d,
      changePercent: q.dp,
      high: q.h,
      low: q.l,
      open: q.o,
      prevClose: q.pc,
      timestamp: q.t,
    };
    cacheSet(cacheKey, result, CACHE_TTL_MS);
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error fetching quote" };
  }
}

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  if (!symbolsParam) {
    return NextResponse.json({ error: "Missing required 'symbols' query param" }, { status: 400 });
  }
  const symbols = Array.from(
    new Set(
      symbolsParam
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, 100);

  if (!getFinnhubKey()) {
    const unavailable = Object.fromEntries(
      symbols.map((s) => [s, { error: "FINNHUB_API_KEY is not configured. Set it to enable live data." }])
    );
    return NextResponse.json(unavailable, {
      headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" },
    });
  }

  const results = await mapWithConcurrency(symbols, CONCURRENCY, fetchQuote);
  const body: Record<string, QuoteResult | { error: string }> = {};
  symbols.forEach((sym, i) => {
    body[sym] = results[i];
  });

  return NextResponse.json(body, {
    headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" },
  });
}
