import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet, finnhubGet, getFinnhubKey } from "@/lib/finnhub";

export interface ProfileResult {
  name: string;
  logo: string;
  industry: string;
  marketCapitalization: number;
  ipo: string;
  weburl: string;
  exchange: string;
  currency: string;
}

type FinnhubProfile = {
  name?: string;
  logo?: string;
  finnhubIndustry?: string;
  marketCapitalization?: number;
  ipo?: string;
  weburl?: string;
  exchange?: string;
  currency?: string;
};

const CACHE_TTL_MS = 60 * 60 * 1000; // profile data is slow-moving; cache 1h per instance

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Missing required 'symbol' query param" }, { status: 400 });
  }
  if (!getFinnhubKey()) {
    return NextResponse.json(
      { error: "FINNHUB_API_KEY is not configured. Set it to enable live data." },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } }
    );
  }

  const cacheKey = `profile:${symbol}`;
  const cached = cacheGet<ProfileResult>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  }

  try {
    const p = await finnhubGet<FinnhubProfile>("/stock/profile2", { symbol });
    if (!p || !p.name) {
      return NextResponse.json(
        { error: "No profile data returned for symbol" },
        { headers: { "Cache-Control": "s-maxage=60" } }
      );
    }
    const result: ProfileResult = {
      name: p.name ?? symbol,
      logo: p.logo ?? "",
      industry: p.finnhubIndustry ?? "",
      marketCapitalization: p.marketCapitalization ?? 0,
      ipo: p.ipo ?? "",
      weburl: p.weburl ?? "",
      exchange: p.exchange ?? "",
      currency: p.currency ?? "USD",
    };
    cacheSet(cacheKey, result, CACHE_TTL_MS);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching profile" },
      { headers: { "Cache-Control": "s-maxage=30" } }
    );
  }
}
