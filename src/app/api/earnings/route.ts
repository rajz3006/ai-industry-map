import { NextRequest, NextResponse } from "next/server";
import { getFinnhubKey } from "@/lib/finnhub";
import { fetchEarnings, fetchEarningsMap, type EarningsEvent, type EarningsMap, type EarningsResult } from "@/lib/serverEarnings";

export type { EarningsEvent, EarningsMap, EarningsResult };

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

  if (singleParam && !symbolsParam) {
    // Backward-compatible single-symbol response shape.
    const r = await fetchEarnings(singleParam);
    if ("error" in r) {
      return NextResponse.json(r, { headers: { "Cache-Control": "s-maxage=30" } });
    }
    return NextResponse.json(r, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
  }

  const symbols = Array.from(
    new Set(
      (symbolsParam as string)
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, 100);

  const body = await fetchEarningsMap(symbols);
  return NextResponse.json(body, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
