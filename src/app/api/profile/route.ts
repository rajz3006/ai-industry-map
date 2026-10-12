import { NextRequest, NextResponse } from "next/server";
import { getFinnhubKey } from "@/lib/finnhub";
import { fetchCompanyProfile, type CompanyProfile } from "@/lib/companyProfile";

export type ProfileResult = CompanyProfile;

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

  try {
    const result = await fetchCompanyProfile(symbol);
    if (!result) {
      return NextResponse.json(
        { error: "No profile data returned for symbol" },
        { headers: { "Cache-Control": "s-maxage=60" } }
      );
    }
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
