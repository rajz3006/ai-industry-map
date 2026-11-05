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
import { diskGet, diskSet, takeFmpBudget } from "@/lib/diskCache";
import { getSecStatements } from "@/lib/secStatements";
import { fetchCompanyProfile } from "@/lib/companyProfile";

// FMP retired the legacy /api/v3 paths (403 "Legacy Endpoint" for keys created after 2025-08-31); the
// /stable API takes the symbol as a ?symbol= query parameter.
const BASE_URL = "https://financialmodelingprep.com/stable";
const CACHE_TTL_MS = 8 * 60 * 60 * 1000; // in-process cache
// Quarterly-ish figures: persisted to disk (.cache/fmp) so dev-server restarts don't re-spend the
// 250 req/day quota. Only successful results are persisted.
const DISK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  // The free plan only covers some symbols (others answer 402). Remember refusals on disk so an
  // uncovered symbol costs one call per week instead of one per request.
  const symParam = typeof params.symbol === "string" ? params.symbol : null;
  if (symParam && (await diskGet(`nocoverage:${symParam}`, DISK_TTL_MS))) {
    throw new FmpError(`FMP plan does not cover ${symParam} (cached refusal).`, 402);
  }
  if (!(await takeFmpBudget())) {
    throw new FmpError("FMP daily call budget used up (free plan: 250/day).", 429);
  }
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    apikey: key,
  });
  const res = await fetch(`${BASE_URL}${path}?${qs.toString()}`, { cache: "no-store" });
  if (res.status === 402 && symParam) await diskSet(`nocoverage:${symParam}`, true);
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

interface Statements {
  income: RawRow[]; // newest first
  balance?: RawRow;
  cashflow?: RawRow;
  source: "SEC EDGAR" | "FMP";
}

/** Annual income (up to 5 years), latest balance sheet and latest cash flow. SEC EDGAR first (free,
 * no FMP quota); FMP's three statement endpoints only when SEC has no usable USD data for the
 * symbol. Memory + 7-day disk cache. Never throws. */
async function getStatements(sym: string): Promise<Statements | null> {
  const cacheKey = `statements:${sym}`;
  const cached = cacheGet<Statements | null>(cacheKey);
  if (cached !== undefined) return cached;
  const onDisk = await diskGet<Statements>(cacheKey, DISK_TTL_MS);
  if (onDisk) {
    cacheSet(cacheKey, onDisk, CACHE_TTL_MS);
    return onDisk;
  }

  let result: Statements | null = null;
  const sec = await getSecStatements(sym);
  // SEC data whose latest fiscal year is >18 months old (e.g. a foreign filer whose newest 20-F isn't
  // tagged in USD) is treated as missing, so the FMP statements are used instead.
  const secFresh = !!sec && sec.income.length > 0 && Date.now() - Date.parse(String(sec.income[0].date)) < 550 * 86_400_000;
  if (sec && secFresh) {
    result = { ...sec, source: "SEC EDGAR" };
  } else if (getFmpKey()) {
    let income: RawRow[] = [];
    try {
      const data = await fmpGet<RawRow[]>("/income-statement", { symbol: sym, period: "annual", limit: 5 });
      if (Array.isArray(data)) income = data;
    } catch {
      income = [];
    }
    const [balance, cashflow] = await Promise.all([
      fetchFirstRow("/balance-sheet-statement", { symbol: sym, period: "annual", limit: 1 }),
      fetchFirstRow("/cash-flow-statement", { symbol: sym, period: "annual", limit: 1 }),
    ]);
    if (income.length > 0 || balance || cashflow) result = { income, balance, cashflow, source: "FMP" };
  }

  if (result) {
    await diskSet(cacheKey, result);
    cacheSet(cacheKey, result, CACHE_TTL_MS);
  } else {
    cacheSet(cacheKey, null, 30 * 60 * 1000); // retry in 30 min, never persist a failure
  }
  return result;
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
  const row = (await getStatements(symbol.toUpperCase()))?.cashflow;
  if (!row) return null;
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
  return result;
}

// ---------------------------------------------------------------------------
// Risk-free rate (10-year Treasury) for intrinsic-value discount rates.
// ---------------------------------------------------------------------------

const TREASURY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h: one global fetch/day, negligible vs 250 req/day
/** Labeled fallback when the treasury feed is unreachable — shown as "assumed" in tooltips,
 * never presented as observed data. */
export const FALLBACK_RISK_FREE_RATE = 0.045;

export interface RiskFreeRate {
  /** Decimal, e.g. 0.0509 for 5.09%. */
  rate: number;
  asOf: string | null;
  /** "FMP treasury" when observed, "assumption" when the feed failed. */
  source: "FMP treasury" | "assumption";
}

/** 10-year Treasury yield for Buffett-style discount rates (risk-free + ERP). Never throws:
 * degrades to a labeled assumption so valuation math can still run, with the tooltip showing
 * exactly which it was. */
export async function getRiskFreeRate(): Promise<RiskFreeRate> {
  const cacheKey = "fmp:risk-free-rate-10y";
  const cached = cacheGet<RiskFreeRate>(cacheKey);
  if (cached !== undefined) return cached;

  const fallback: RiskFreeRate = { rate: FALLBACK_RISK_FREE_RATE, asOf: null, source: "assumption" };
  if (!getFmpKey()) {
    cacheSet(cacheKey, fallback, TREASURY_CACHE_TTL_MS);
    return fallback;
  }
  // FMP v3 /treasury returns an array of rows with year10-style fields (stable docs rename
  // some to year10Yield etc. — pick() defends against that).
  let row: RawRow | undefined;
  try {
    const rows = await fmpGet<RawRow[]>("/treasury-rates", { limit: 1 });
    row = Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
  } catch {
    row = undefined;
  }
  const pct = pick(row, ["year10", "year10Yield", "tenYear", "dgs10", "10year"]);
  if (pct === null || pct <= 0 || pct > 25) {
    cacheSet(cacheKey, fallback, TREASURY_CACHE_TTL_MS);
    return fallback;
  }
  const observed: RiskFreeRate = {
    rate: pct / 100,
    asOf: pickStr(row, ["date"]),
    source: "FMP treasury",
  };
  cacheSet(cacheKey, observed, TREASURY_CACHE_TTL_MS);
  return observed;
}

// ---------------------------------------------------------------------------
// Multi-year annual income history (growth CAGR + earnings normalization).
// ---------------------------------------------------------------------------

export interface AnnualIncomeRow {
  date: string | null;
  revenue: number | null;
  netIncome: number | null;
  ebit: number | null;
  ebitda: number | null;
  eps: number | null;
  weightedAverageShsOut: number | null;
  incomeBeforeTax: number | null;
  incomeTaxExpense: number | null;
}

/** Up to `limit` annual income-statement rows, newest first. One cached fetch per symbol —
 * the intrinsic-value engine uses it for the 5-year revenue CAGR (growth input) and for
 * normalizing owner earnings across the cycle (cyclicals guard). Never throws. */
export async function getAnnualIncomeHistory(symbol: string, limit = 5): Promise<AnnualIncomeRow[]> {
  const rows = ((await getStatements(symbol.toUpperCase()))?.income ?? []).slice(0, limit);
  const out: AnnualIncomeRow[] = rows.map((row) => ({
    date: pickStr(row, ["date"]),
    revenue: pick(row, ["revenue"]),
    netIncome: pick(row, ["netIncome"]),
    ebit: pick(row, ["operatingIncome", "ebit"]),
    ebitda: pick(row, ["ebitda"]),
    eps: pick(row, ["eps", "epsdiluted"]),
    weightedAverageShsOut: pick(row, ["weightedAverageShsOut", "weightedAverageShsOutDil"]),
    incomeBeforeTax: pick(row, ["incomeBeforeTax", "earningsBeforeTax"]),
    incomeTaxExpense: pick(row, ["incomeTaxExpense", "taxExpense", "provisionForIncomeTaxes"]),
  }));
  return out;
}

/** Net debt = total debt − cash & equivalents, from the latest annual balance sheet. Used to
 * bridge enterprise value → equity value in the intrinsic-value engine. Never throws. */
export async function getNetDebt(symbol: string): Promise<number | null> {
  const row = (await getStatements(symbol.toUpperCase()))?.balance;
  if (!row) return null;
  const totalDebt =
    pick(row, ["totalDebt"]) ??
    (() => {
      const st = pick(row, ["shortTermDebt"]);
      const lt = pick(row, ["longTermDebt"]);
      return st != null || lt != null ? (st ?? 0) + (lt ?? 0) : null;
    })();
  const cash = pick(row, ["cashAndCashEquivalents", "cashAndShortTermInvestments"]);
  return totalDebt != null && cash != null ? totalDebt - cash : totalDebt;
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
  const sym = symbol.toUpperCase();
  const cacheKey = `fmp:fundamentals:${sym}`;
  const cached = cacheGet<FmpFundamentals | null>(cacheKey);
  if (cached !== undefined) return cached;
  const onDisk = await diskGet<FmpFundamentals>(cacheKey, DISK_TTL_MS);
  if (onDisk) {
    cacheSet(cacheKey, onDisk, CACHE_TTL_MS);
    return onDisk;
  }

  // FMP quota: only the two TTM endpoints (2 calls/symbol). Statements come from SEC EDGAR (see
  // getStatements), and revenue growth is derived from the income history instead of its own call.
  const [keyMetrics, ratios, statements] = await Promise.all([
    fetchFirstRow("/key-metrics-ttm", { symbol: sym }),
    fetchFirstRow("/ratios-ttm", { symbol: sym }),
    getStatements(sym),
  ]);
  const incomeStatement = statements?.income[0];
  const balanceSheet = statements?.balance;
  const cashFlow = await getAnnualCashFlow(sym);

  // Total failure (bad/missing key rejected everywhere, network down, unknown symbol everywhere) —
  // degrade to null so callers fall back to Finnhub rather than showing an all-blank Step 3/4.
  if (!keyMetrics && !ratios && !balanceSheet && !incomeStatement && !cashFlow) {
    cacheSet(cacheKey, null, CACHE_TTL_MS);
    return null;
  }

  const sources: string[] = [];
  if (keyMetrics) sources.push("FMP /key-metrics-ttm");
  if (ratios) sources.push("FMP /ratios-ttm");
  if (statements) sources.push(`${statements.source} annual statements`);

  const warnings: string[] = [];

  // Merge the two TTM endpoints into one lookup object; ratios-ttm wins on overlapping fields since
  // it's the more specifically-named "ratios" source for multiples.
  const merged: RawRow = { ...(keyMetrics ?? {}), ...(ratios ?? {}) };

  let peTrailing = pick(merged, ["peRatioTTM", "priceToEarningsRatioTTM", "peTTM"]);
  const peForward = pick(merged, ["peForwardTTM", "forwardPETTM"]);
  if (peForward === null) {
    warnings.push("Forward P/E unavailable on FMP free tier (requires the paid analyst-estimates endpoint).");
  }
  const peg = pick(merged, ["pegRatioTTM", "priceToEarningsGrowthRatioTTM"]);
  if (peg === null) {
    warnings.push("PEG ratio unavailable from FMP TTM endpoints for this symbol.");
  }
  let evToEbitda = pick(merged, ["evToEbitdaTTM", "evToEBITDATTM", "enterpriseValueOverEBITDATTM", "enterpriseValueMultipleTTM"]);
  let priceToSales = pick(merged, ["priceToSalesRatioTTM", "priceSalesRatioTTM"]);
  let priceToBook = pick(merged, ["priceToBookRatioTTM", "pbRatioTTM", "priceBookValueRatioTTM"]);
  let roe = pick(merged, ["roeTTM", "returnOnEquityTTM"]);
  const roicDirect = pick(merged, ["roicTTM", "returnOnInvestedCapitalTTM"]);
  let debtToEquity = pick(merged, ["debtEquityRatioTTM", "debtToEquityRatioTTM"]);
  let netDebtToEbitda = pick(merged, ["netDebtToEBITDATTM", "netDebtToEbitdaTTM"]);
  let interestCoverage = pick(merged, ["interestCoverageTTM", "interestCoverageRatioTTM"]);
  const grossMarginDirect = pick(merged, ["grossProfitMarginTTM"]);
  const operatingMarginDirect = pick(merged, ["operatingProfitMarginTTM", "operatingIncomeMarginTTM"]);
  const netMarginDirect = pick(merged, ["netProfitMarginTTM"]);
  let marketCap = pick(merged, ["marketCapTTM", "marketCap"]);
  const freeCashFlowDirect = pick(merged, ["freeCashFlowTTM"]);
  const fcfYieldDirect = pick(merged, ["freeCashFlowYieldTTM"]);
  // Symbols outside the FMP free plan have no TTM ratios. Market cap (Finnhub profile, in $M) lets us
  // compute the main multiples from the latest annual filing instead.
  const missingMultiples = !ratios && !keyMetrics;
  if (marketCap === null) {
    const profile = await fetchCompanyProfile(sym).catch(() => null);
    if (profile && profile.marketCapitalization > 0) marketCap = profile.marketCapitalization * 1_000_000;
  }

  const rev0 = pick(statements?.income[0], ["revenue"]);
  const rev1 = pick(statements?.income[1], ["revenue"]);
  const revenueGrowthYoy = rev0 != null && rev1 != null && rev1 > 0 ? rev0 / rev1 - 1 : null;

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

  // Multiples from the latest annual filing + market cap, only where FMP gave no value. These use the
  // last fiscal year, not trailing-12-month, so they lag FMP's TTM figures; the warning says so.
  const derived: string[] = [];
  const fill = (cur: number | null, v: number | null, label: string): number | null => {
    if (cur !== null || v === null || !Number.isFinite(v)) return cur;
    derived.push(label);
    return v;
  };
  if (marketCap && marketCap > 0) {
    peTrailing = fill(peTrailing, netIncome != null && netIncome > 0 ? marketCap / netIncome : null, "P/E");
    priceToSales = fill(priceToSales, revenue != null && revenue > 0 ? marketCap / revenue : null, "P/S");
    priceToBook = fill(priceToBook, totalEquity != null && totalEquity > 0 ? marketCap / totalEquity : null, "P/B");
    const ebitdaForEv = ebitda ?? (ebit != null && cashFlow?.depreciationAndAmortization != null ? ebit + cashFlow.depreciationAndAmortization : null);
    if (totalDebt != null && ebitdaForEv != null && ebitdaForEv > 0) {
      evToEbitda = fill(evToEbitda, (marketCap + totalDebt - (cashAndEquivalents ?? 0)) / ebitdaForEv, "EV/EBITDA");
    }
  }
  roe = fill(roe, netIncome != null && totalEquity != null && totalEquity > 0 ? netIncome / totalEquity : null, "ROE");
  debtToEquity = fill(debtToEquity, totalDebt != null && totalEquity != null && totalEquity > 0 ? totalDebt / totalEquity : null, "debt/equity");
  if (derived.length > 0) {
    warnings.push(`${derived.join(", ")} computed from the latest annual filing${marketCap ? " and Finnhub market cap" : ""} (not trailing-12-month) — FMP's free plan has no ratios for this symbol.`);
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
  // Persist only when the FMP ratio endpoints actually answered; otherwise a quota/network failure
  // would pin a statements-only snapshot for a week.
  if (!missingMultiples) await diskSet(cacheKey, result);
  return result;
}
