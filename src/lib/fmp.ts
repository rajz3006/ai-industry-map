// Server-only Financial Modeling Prep (FMP) client for Step 3 (financial statement quality) and
// Step 4 (valuation) of the Evaluator tab. Free tier only (250 req/day, no paid plan) — see
// .env.example for FMP_API_KEY. Follows the same provider pattern as finnhub.ts/alphavantage.ts:
// server-only key, in-process TTL cache (reusing finnhub.ts's cacheGet/cacheSet), degrade-to-null
// on any failure rather than throwing, since there is currently NO FMP_API_KEY configured in this
// repo's .env.local and every caller must keep working with this provider entirely absent.
//
// ASSUMPTION / VERIFICATION GAP: FMP's own docs site (site.financialmodelingprep.com/developer/docs)
// returned HTTP 403 to this agent's fetch tool, and the live /api/v3 endpoints returned 401 without
// a real key (the "demo" key is not accepted on these endpoints), so the exact response field names
// below were NOT confirmed against a live response. They're assembled from FMP's commonly documented
// v3 TTM field-naming convention (peRatioTTM, roeTTM, debtEquityRatioTTM, etc.), cross-checked via
// web search against FMP's own doc/blog pages. FMP has also been mid-migration from the legacy
// "/api/v3" paths to a newer "/stable" API that renames some fields (e.g. debtEquityRatioTTM ->
// debtToEquityRatioTTM, interestCoverageTTM -> interestCoverageRatioTTM) — this file defends against
// that by trying several candidate field names per metric (see `pick()`), but a maintainer who adds
// a real FMP_API_KEY should sanity-check one live response against the Raw*Row shapes below and
// adjust field-name candidates if FMP has renamed things further since this was written (Oct 2026).
// This file deliberately still uses the /api/v3 paths named in this feature's spec; if those 404
// once a real key is added, switch BASE_URL's path segments to "/stable" per-endpoint instead.

import { cacheGet, cacheSet } from "@/lib/finnhub";

const BASE_URL = "https://financialmodelingprep.com/api/v3";
const CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8h: these are quarterly-ish figures; keeps us well under 250 req/day

export function getFmpKey(): string | null {
  const key = process.env.FMP_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

export class FmpError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "FmpError";
    this.status = status;
  }
}

type RawRow = Record<string, unknown>;

async function fmpGet<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const key = getFmpKey();
  if (!key) {
    throw new FmpError("FMP_API_KEY is not configured on the server.");
  }
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    apikey: key,
  });
  const res = await fetch(`${BASE_URL}${path}?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new FmpError(`FMP request failed (${res.status}) for ${path}`, res.status);
  }
  return (await res.json()) as T;
}

/** Fetches a single-row FMP list endpoint (most FMP endpoints return an array even for TTM/limit=1
 * queries). Returns undefined on any failure — callers degrade field-by-field, never throw. */
async function fetchFirstRow(path: string, params: Record<string, string | number> = {}): Promise<RawRow | undefined> {
  try {
    const rows = await fmpGet<RawRow[]>(path, params);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
  } catch {
    return undefined;
  }
}

/** Returns the first finite numeric value found under any of `keys` on `obj` — a defensive lookup
 * against FMP's v3 -> stable field-renaming churn (see file header). */
function pick(obj: RawRow | undefined, keys: string[]): number | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function pickStr(obj: RawRow | undefined, keys: string[]): string | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export interface FmpCashFlowRow {
  date: string | null;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
  /** "repurchase of common stock" line item, FMP sign convention is negative = cash spent. This
   * field returns the raw signed value; callers wanting a positive "$ spent" figure should negate. */
  repurchaseOfCommonStock: number | null;
  dividendsPaid: number | null;
  netIncome: number | null;
  depreciationAndAmortization: number | null;
}

/** Latest annual cash-flow-statement row (period=annual, limit=1). Shared by getFundamentals()
 * (FCF fallback) and managementSignals.ts's getBuybackSignal() so both reuse one cached fetch. */
export async function getAnnualCashFlow(symbol: string): Promise<FmpCashFlowRow | null> {
  if (!getFmpKey()) return null;
  const cacheKey = `fmp:cashflow:${symbol.toUpperCase()}`;
  const cached = cacheGet<FmpCashFlowRow | null>(cacheKey);
  if (cached !== undefined) return cached;

  const row = await fetchFirstRow(`/cash-flow-statement/${symbol}`, { period: "annual", limit: 1 });
  if (!row) {
    cacheSet(cacheKey, null, CACHE_TTL_MS);
    return null;
  }
  const result: FmpCashFlowRow = {
    date: pickStr(row, ["date"]),
    operatingCashFlow: pick(row, ["operatingCashFlow", "netCashProvidedByOperatingActivities"]),
    capitalExpenditure: pick(row, ["capitalExpenditure"]),
    freeCashFlow: pick(row, ["freeCashFlow"]),
    repurchaseOfCommonStock: pick(row, ["commonStockRepurchased", "repurchaseOfCommonStock"]),
    dividendsPaid: pick(row, ["dividendsPaid", "commonDividendsPaid"]),
    netIncome: pick(row, ["netIncome"]),
    depreciationAndAmortization: pick(row, ["depreciationAndAmortization"]),
  };
  cacheSet(cacheKey, result, CACHE_TTL_MS);
  return result;
}

export interface FmpFundamentals {
  symbol: string;
  asOf: string; // ISO timestamp this snapshot was fetched/computed
  // Valuation (Step 4)
  peTrailing: number | null;
  peForward: number | null; // usually unavailable on free tier (needs analyst-estimates endpoint)
  peg: number | null;
  evToEbitda: number | null;
  priceToSales: number | null;
  priceToBook: number | null;
  fcfYield: number | null; // FCF / market cap
  // Financial statement quality (Step 3)
  roe: number | null;
  roic: number | null;
  roicEstimated: boolean; // true if derived locally via EBIT*(1-tax)/investedCapital, not a direct FMP field
  revenueGrowthYoy: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  debtToEquity: number | null;
  netDebtToEbitda: number | null;
  interestCoverage: number | null; // EBIT / interest expense
  freeCashFlow: number | null;
  fcfMargin: number | null; // FCF / revenue
  sources: string[]; // which FMP endpoints actually contributed a row
  warnings: string[]; // e.g. "forward P/E unavailable on FMP free tier"
}

/**
 * Fetches and combines FMP's TTM ratio/key-metrics endpoints plus one annual statement set to
 * build the Step 3/4 metric bundle. Returns null (never throws) when FMP_API_KEY is unset or when
 * every underlying request fails — callers must treat null as "fall back to Finnhub's thinner
 * metric set and flag a data warning" per this feature's spec, not as an error.
 */
export async function getFundamentals(symbol: string): Promise<FmpFundamentals | null> {
  if (!getFmpKey()) return null;

  const sym = symbol.toUpperCase();
  const cacheKey = `fmp:fundamentals:${sym}`;
  const cached = cacheGet<FmpFundamentals | null>(cacheKey);
  if (cached !== undefined) return cached;

  const [keyMetrics, ratios, incomeGrowth, balanceSheet, incomeStatement, cashFlow] = await Promise.all([
    fetchFirstRow(`/key-metrics-ttm/${sym}`),
    fetchFirstRow(`/ratios-ttm/${sym}`),
    fetchFirstRow(`/income-statement-growth/${sym}`, { period: "annual", limit: 1 }),
    fetchFirstRow(`/balance-sheet-statement/${sym}`, { period: "annual", limit: 1 }),
    fetchFirstRow(`/income-statement/${sym}`, { period: "annual", limit: 1 }),
    getAnnualCashFlow(sym),
  ]);

  // Total failure (bad/missing key rejected everywhere, network down, unknown symbol everywhere) —
  // degrade to null so callers fall back to Finnhub rather than showing an all-blank Step 3/4.
  if (!keyMetrics && !ratios && !incomeGrowth && !balanceSheet && !incomeStatement && !cashFlow) {
    cacheSet(cacheKey, null, CACHE_TTL_MS);
    return null;
  }

  const sources: string[] = [];
  if (keyMetrics) sources.push("FMP /key-metrics-ttm");
  if (ratios) sources.push("FMP /ratios-ttm");
  if (incomeGrowth) sources.push("FMP /income-statement-growth");
  if (balanceSheet) sources.push("FMP /balance-sheet-statement");
  if (incomeStatement) sources.push("FMP /income-statement");
  if (cashFlow) sources.push("FMP /cash-flow-statement");

  const warnings: string[] = [];

  // Merge the two TTM endpoints into one lookup object; ratios-ttm wins on overlapping fields since
  // it's the more specifically-named "ratios" source for multiples.
  const merged: RawRow = { ...(keyMetrics ?? {}), ...(ratios ?? {}) };

  const peTrailing = pick(merged, ["peRatioTTM", "priceToEarningsRatioTTM", "peTTM"]);
  const peForward = pick(merged, ["peForwardTTM", "forwardPETTM"]);
  if (peForward === null) {
    warnings.push("Forward P/E unavailable on FMP free tier (requires the paid analyst-estimates endpoint).");
  }
  const peg = pick(merged, ["pegRatioTTM"]);
  if (peg === null) {
    warnings.push("PEG ratio unavailable from FMP TTM endpoints for this symbol.");
  }
  const evToEbitda = pick(merged, ["evToEbitdaTTM", "enterpriseValueOverEBITDATTM", "enterpriseValueMultipleTTM"]);
  const priceToSales = pick(merged, ["priceToSalesRatioTTM", "priceSalesRatioTTM"]);
  const priceToBook = pick(merged, ["priceToBookRatioTTM", "pbRatioTTM", "priceBookValueRatioTTM"]);
  const roe = pick(merged, ["roeTTM", "returnOnEquityTTM"]);
  const roicDirect = pick(merged, ["roicTTM", "returnOnInvestedCapitalTTM"]);
  const debtToEquity = pick(merged, ["debtEquityRatioTTM", "debtToEquityRatioTTM"]);
  let netDebtToEbitda = pick(merged, ["netDebtToEBITDATTM", "netDebtToEbitdaTTM"]);
  let interestCoverage = pick(merged, ["interestCoverageTTM", "interestCoverageRatioTTM"]);
  const grossMarginDirect = pick(merged, ["grossProfitMarginTTM"]);
  const operatingMarginDirect = pick(merged, ["operatingProfitMarginTTM", "operatingIncomeMarginTTM"]);
  const netMarginDirect = pick(merged, ["netProfitMarginTTM"]);
  const marketCap = pick(merged, ["marketCapTTM", "marketCap"]);
  const freeCashFlowDirect = pick(merged, ["freeCashFlowTTM"]);
  const fcfYieldDirect = pick(merged, ["freeCashFlowYieldTTM"]);

  const revenueGrowthYoy = pick(incomeGrowth, ["growthRevenue", "revenueGrowth"]);

  // Fall back to the raw annual income statement for margins/EBIT/interest when TTM ratios lack them.
  const revenue = pick(incomeStatement, ["revenue"]);
  const grossProfit = pick(incomeStatement, ["grossProfit"]);
  const ebit = pick(incomeStatement, ["operatingIncome", "ebit"]);
  const netIncome = pick(incomeStatement, ["netIncome"]);
  const interestExpense = pick(incomeStatement, ["interestExpense"]);
  const incomeBeforeTax = pick(incomeStatement, ["incomeBeforeTax"]);
  const incomeTaxExpense = pick(incomeStatement, ["incomeTaxExpense"]);
  const ebitda = pick(incomeStatement, ["ebitda"]);

  const grossMargin = grossMarginDirect ?? (revenue && grossProfit != null && revenue !== 0 ? grossProfit / revenue : null);
  const operatingMargin = operatingMarginDirect ?? (revenue && ebit != null && revenue !== 0 ? ebit / revenue : null);
  const netMargin = netMarginDirect ?? (revenue && netIncome != null && revenue !== 0 ? netIncome / revenue : null);

  if (interestCoverage === null && ebit != null && interestExpense) {
    interestCoverage = ebit / interestExpense;
  }

  // Balance-sheet-derived invested capital, used for the ROIC fallback and the net-debt-to-EBITDA
  // fallback when the TTM endpoints don't carry those fields directly.
  const totalDebt = pick(balanceSheet, ["totalDebt"]) ??
    (() => {
      const st = pick(balanceSheet, ["shortTermDebt"]);
      const lt = pick(balanceSheet, ["longTermDebt"]);
      return st != null || lt != null ? (st ?? 0) + (lt ?? 0) : null;
    })();
  const totalEquity = pick(balanceSheet, ["totalStockholdersEquity", "totalEquity"]);
  const cashAndEquivalents = pick(balanceSheet, ["cashAndCashEquivalents", "cashAndShortTermInvestments"]);

  let roic = roicDirect;
  let roicEstimated = false;
  if (roic === null && ebit != null && totalDebt != null && totalEquity != null) {
    const taxRate =
      incomeBeforeTax && incomeBeforeTax !== 0 && incomeTaxExpense != null
        ? Math.max(0, Math.min(1, incomeTaxExpense / incomeBeforeTax))
        : 0.21; // US statutory-ish default when tax rate can't be derived from this period's figures
    const investedCapital = totalDebt + totalEquity - (cashAndEquivalents ?? 0);
    if (investedCapital > 0) {
      roic = (ebit * (1 - taxRate)) / investedCapital;
      roicEstimated = true;
    }
  }
  if (roic === null) {
    warnings.push("ROIC unavailable: no direct FMP field and insufficient balance-sheet data to derive EBIT*(1-tax)/invested-capital.");
  }

  if (netDebtToEbitda === null && totalDebt != null) {
    const netDebt = totalDebt - (cashAndEquivalents ?? 0);
    const ebitdaForLeverage = ebitda ?? (ebit != null && cashFlow?.depreciationAndAmortization != null ? ebit + cashFlow.depreciationAndAmortization : null);
    if (ebitdaForLeverage && ebitdaForLeverage !== 0) {
      netDebtToEbitda = netDebt / ebitdaForLeverage;
    }
  }

  const freeCashFlow = freeCashFlowDirect ?? cashFlow?.freeCashFlow ??
    (cashFlow?.operatingCashFlow != null && cashFlow?.capitalExpenditure != null
      ? cashFlow.operatingCashFlow + cashFlow.capitalExpenditure // capex is already negative in FMP's convention
      : null);
  const fcfMargin = freeCashFlow != null && revenue && revenue !== 0 ? freeCashFlow / revenue : null;
  const fcfYield = fcfYieldDirect ?? (freeCashFlow != null && marketCap && marketCap !== 0 ? freeCashFlow / marketCap : null);
  if (fcfYield === null) {
    warnings.push("FCF yield unavailable: no market cap figure returned by FMP TTM endpoints for this symbol.");
  }

  const result: FmpFundamentals = {
    symbol: sym,
    asOf: new Date().toISOString(),
    peTrailing,
    peForward,
    peg,
    evToEbitda,
    priceToSales,
    priceToBook,
    fcfYield,
    roe,
    roic,
    roicEstimated,
    revenueGrowthYoy,
    grossMargin,
    operatingMargin,
    netMargin,
    debtToEquity,
    netDebtToEbitda,
    interestCoverage,
    freeCashFlow,
    fcfMargin,
    sources,
    warnings,
  };

  cacheSet(cacheKey, result, CACHE_TTL_MS);
  return result;
}
