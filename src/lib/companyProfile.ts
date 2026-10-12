// Shared Finnhub company-profile lookup (name, industry, market cap, etc.), used by
// /api/profile (the chart popup's header) and by companyNews.ts's relevance filter
// (which needs the canonical company name to tell whether a headline is actually about
// this company). Both share the same cache key/TTL so whichever runs first for a symbol
// saves the other an extra Finnhub call.

import { cacheGet, cacheSet, finnhubGet } from "@/lib/finnhub";

export interface CompanyProfile {
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

export async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  const cacheKey = `profile:${symbol}`;
  const cached = cacheGet<CompanyProfile>(cacheKey);
  if (cached) return cached;

  const p = await finnhubGet<FinnhubProfile>("/stock/profile2", { symbol });
  if (!p || !p.name) return null;

  const result: CompanyProfile = {
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
  return result;
}

// Legal-form suffixes stripped off a company's registered name to get the short form
// headlines actually use, e.g. "Meta Platforms, Inc." -> "Meta", "Seagate Technology
// Holdings plc" -> "Seagate". Deliberately greedy about stripping descriptive suffixes
// too (Platforms/Technology/Holdings/Group), not just legal ones — headlines say "Meta"
// and "Seagate", not "Meta Platforms" or "Seagate Technology".
const SUFFIX_RE =
  /,?\s*\b(incorporated|inc|corporation|corp|holdings?|holding|company|co|plc|ltd|limited|group|technologies|technology|platforms?|systems?|international|global|worldwide|s\.a\.|n\.v\.|ag|se)\b\.?/gi;

/** "Meta Platforms, Inc." -> "Meta". Falls back to the first word if stripping empties it. */
export function companyShortName(fullName: string): string {
  const stripped = fullName.replace(SUFFIX_RE, "").trim();
  const firstWord = (stripped || fullName).split(/\s+/)[0];
  return firstWord;
}
