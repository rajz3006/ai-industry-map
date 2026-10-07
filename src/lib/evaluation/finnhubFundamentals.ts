// Finnhub /stock/metric fallback for Step 3 (financial statement quality) and Step 4
// (valuation) when FMP has no key or partial data. Confirmed working on the free tier (see
// scripts/dip-stock-checklist.mjs, which already pulls peTTM/netMarginTTM/debtToEquity/
// roeTTM/currentRatio/52-week-hi-lo from this same endpoint). Finnhub's `/stock/metric`
// response field names are not fully documented for every metric we'd like (e.g. there is no
// direct ROIC, EV/EBITDA, or FCF field on the free tier), so this degrades field-by-field —
// never throws, returns null fields rather than failing the whole fetch.

import { cacheGet, cacheSet, finnhubGet, getFinnhubKey } from "@/lib/finnhub";

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4h: TTM/annual figures move slowly, keeps us well under the 50/min shared limiter

// Step 3 (scoreFinancials) and Step 4 (scoreValuation) both call getFinnhubFundamentals() for
// the same symbol, and evaluateSymbol() runs those two steps concurrently (Promise.all) — so
// without this, both see a cache miss at the same instant and each fires its own /stock/metric
// request, silently doubling Finnhub call volume (and, combined with finnhub.ts's shared 50/min
// process-wide rate limiter, meaningfully adding to bulk-evaluation latency across 57 symbols).
// This in-flight map coalesces concurrent same-symbol lookups onto one network request.
const inFlight = new Map<string, Promise<FinnhubFundamentals | null>>();

type RawMetric = Record<string, unknown>;

function pick(obj: RawMetric | undefined, keys: string[]): number | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

export interface FinnhubFundamentals {
  symbol: string;
  // Valuation (Step 4)
  peTTM: number | null;
  pbAnnual: number | null;
  psTTM: number | null;
  week52High: number | null;
  week52Low: number | null;
  // Financial statement quality (Step 3)
  roeTTM: number | null;
  netMarginTTM: number | null;
  grossMarginTTM: number | null;
  operatingMarginTTM: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  revenueGrowthTTMYoy: number | null;
}

/** Fetches Finnhub's `/stock/metric?metric=all` and normalizes the handful of fields this
 * feature uses. Returns null when FINNHUB_API_KEY is unset or the request fails outright —
 * callers treat null the same way they treat a null FmpFundamentals: fall back further or
 * mark the step "unknown"/neutral. */
export async function getFinnhubFundamentals(symbol: string, opts: { fast: boolean } = { fast: false }): Promise<FinnhubFundamentals | null> {
  if (!getFinnhubKey()) return null;
  const sym = symbol.toUpperCase();
  const cacheKey = `eval:finnhub-fundamentals:${sym}`;
  const cached = cacheGet<FinnhubFundamentals | null>(cacheKey);
  if (cached !== undefined) return cached;

  // Fast/preview mode (bulk evaluation of all 57 symbols): Finnhub's free-tier rate limit is a
  // SHARED, process-wide 50-calls/60s budget (see finnhub.ts) — live-fetching this endpoint for
  // every one of 57 symbols in one request (compounded by Step 7's separate /company-news call)
  // is itself enough to blow well past a 60s serverless ceiling, independent of the SEC Form-4
  // XML cost this feature's fast mode was originally built to skip. Rather than block a bulk
  // request on that shared rate limiter, fast mode only uses what's already cached (e.g. from a
  // prior full single-symbol detail view, or an earlier bulk pass within the 4h TTL) and treats
  // an uncached symbol the same as "no data" rather than waiting on a live fetch.
  if (opts.fast) return null;

  const pending = inFlight.get(sym);
  if (pending) return pending;

  const promise = fetchAndNormalize(sym, cacheKey).finally(() => {
    inFlight.delete(sym);
  });
  inFlight.set(sym, promise);
  return promise;
}

async function fetchAndNormalize(sym: string, cacheKey: string): Promise<FinnhubFundamentals | null> {
  let metric: RawMetric | undefined;
  try {
    const data = await finnhubGet<{ metric?: RawMetric }>("/stock/metric", { symbol: sym, metric: "all" });
    metric = data?.metric;
  } catch {
    cacheSet(cacheKey, null, CACHE_TTL_MS);
    return null;
  }
  if (!metric || Object.keys(metric).length === 0) {
    cacheSet(cacheKey, null, CACHE_TTL_MS);
    return null;
  }

  const result: FinnhubFundamentals = {
    symbol: sym,
    peTTM: pick(metric, ["peBasicExclExtraTTM", "peExclExtraTTM", "peTTM", "peNormalizedAnnual"]),
    pbAnnual: pick(metric, ["pbAnnual", "pbQuarterly"]),
    psTTM: pick(metric, ["psTTM", "psAnnual"]),
    week52High: pick(metric, ["52WeekHigh"]),
    week52Low: pick(metric, ["52WeekLow"]),
    roeTTM: pick(metric, ["roeTTM", "roeRfy"]),
    netMarginTTM: pick(metric, ["netProfitMarginTTM", "netProfitMarginAnnual"]),
    grossMarginTTM: pick(metric, ["grossMarginTTM", "grossMarginAnnual"]),
    operatingMarginTTM: pick(metric, ["operatingMarginTTM", "operatingMarginAnnual"]),
    debtToEquity: pick(metric, ["totalDebt/totalEquityAnnual", "totalDebt/totalEquityQuarterly"]),
    currentRatio: pick(metric, ["currentRatioAnnual", "currentRatioQuarterly"]),
    revenueGrowthTTMYoy: pick(metric, ["revenueGrowthTTMYoy", "revenueGrowthQuarterlyYoy"]),
  };
  cacheSet(cacheKey, result, CACHE_TTL_MS);
  return result;
}
