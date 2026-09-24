import { NextResponse } from "next/server";
import { AlpacaError } from "@/lib/alpaca";
import { alpacaGetAccount } from "@/lib/alpacaTrading";
import { cacheGet, cacheSet } from "@/lib/finnhub";

const CACHE_KEY = "trading:account";
const CACHE_TTL_MS = 10_000; // the tab polls this while the user watches — avoid hammering Alpaca

export async function GET() {
  try {
    const cached = cacheGet<Awaited<ReturnType<typeof alpacaGetAccount>>>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
    const account = await alpacaGetAccount();
    cacheSet(CACHE_KEY, account, CACHE_TTL_MS);
    return NextResponse.json(account);
  } catch (err) {
    const status = err instanceof AlpacaError ? err.status ?? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching account" },
      { status }
    );
  }
}
