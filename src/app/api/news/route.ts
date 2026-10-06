import { NextRequest, NextResponse } from "next/server";
import { getFinnhubKey } from "@/lib/finnhub";
import { fetchCompanyNews } from "@/lib/companyNews";

export interface NewsArticle {
  headline: string;
  source: string;
  datetime: number; // unix seconds
  summary: string;
  url: string;
}

export interface NewsResult {
  articles: NewsArticle[];
  fetchedAt: number; // unix seconds
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();

  if (!symbol || !/^[A-Z0-9.\-]{1,12}$/.test(symbol)) {
    return NextResponse.json({ error: "Missing or invalid 'symbol' query param" }, { status: 400 });
  }
  if (!getFinnhubKey()) {
    return NextResponse.json(
      { error: "FINNHUB_API_KEY is not configured. Set it to enable live data." },
      { headers: { "Cache-Control": "s-maxage=60" } }
    );
  }

  try {
    const result = await fetchCompanyNews(symbol);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching news" },
      { headers: { "Cache-Control": "s-maxage=60" } }
    );
  }
}
