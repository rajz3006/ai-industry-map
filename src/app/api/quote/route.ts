import { NextRequest, NextResponse } from "next/server";
import { fetchQuoteMap, type QuoteMap, type QuoteResult } from "@/lib/serverQuotes";

export type { QuoteResult, QuoteMap };

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

  const body = await fetchQuoteMap(symbols);
  return NextResponse.json(body, {
    headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" },
  });
}
