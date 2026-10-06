import { NextRequest, NextResponse } from "next/server";
import { mapWithConcurrency } from "@/lib/finnhub";
import { allUSSymbols } from "@/data/tickers";
import { fetchRecentFilingsForSymbol, type FilingEvent } from "@/lib/secFilings";

export type { FilingEvent };

export interface FilingsResponse {
  sinceDate: string;
  filings: FilingEvent[];
  unavailable: string[];
  fetchedAt: number;
}

const DEFAULT_DAYS = 10;
const MAX_DAYS = 30;
const SYMBOL_CONCURRENCY = 4; // each unit does 1 submissions fetch + up to 3 Form-4 XML fetches

export async function GET(req: NextRequest) {
  const daysParam = Number(req.nextUrl.searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, MAX_DAYS) : DEFAULT_DAYS;
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  const symbols = symbolsParam
    ? Array.from(new Set(symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))).slice(0, 80)
    : allUSSymbols;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const sinceDate = since.toISOString().slice(0, 10);

  const unavailable: string[] = [];
  const perSymbol = await mapWithConcurrency(symbols, SYMBOL_CONCURRENCY, async (symbol) => {
    try {
      return await fetchRecentFilingsForSymbol(symbol, sinceDate);
    } catch (err) {
      unavailable.push(`${symbol}: ${err instanceof Error ? err.message : "unknown error"}`);
      return [];
    }
  });

  const filings = perSymbol.flat().sort((a, b) => (a.filingDate < b.filingDate ? 1 : -1));

  const response: FilingsResponse = {
    sinceDate,
    filings,
    unavailable,
    fetchedAt: Math.floor(Date.now() / 1000),
  };
  return NextResponse.json(response, {
    headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" },
  });
}
