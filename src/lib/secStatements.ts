// Annual financial statements from SEC EDGAR XBRL "company facts" (free, keyless — only a descriptive
// User-Agent, see SEC_EDGAR_CONTACT). Output uses FMP's field names so fmp.ts can use these rows in
// place of FMP's income-statement / balance-sheet / cash-flow endpoints and keep the 250 req/day FMP
// quota for the TTM ratio endpoints.
//
// Scope: US-GAAP filers (10-K), plus IFRS filers that report in USD (20-F/40-F). Anything else
// (e.g. a filer reporting in TWD) returns null, and the caller falls back to FMP for that symbol.
// Tag lists below are priority-ordered; companies switch tags between years, so values are merged
// per fiscal-year-end date across all tags of a concept.

import { getCikMap, secFetchJson } from "@/lib/secFilings";

type Row = Record<string, unknown>;

interface Fact {
  end: string;
  start?: string;
  val: number;
  form: string;
  fp?: string;
  filed: string;
}
type Facts = Record<string, Record<string, { units: Record<string, Fact[]> }>>;
interface CompanyFacts {
  facts: Facts;
}

const ANNUAL_FORMS = new Set(["10-K", "10-K/A", "20-F", "20-F/A", "40-F", "40-F/A"]);

type Kind = "flow" | "instant";
interface Concept {
  out: string;
  kind: Kind;
  unit?: string; // default "USD"
  gaap: string[];
  ifrs?: string[];
}

const INCOME: Concept[] = [
  { out: "revenue", kind: "flow", gaap: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet"], ifrs: ["Revenue"] },
  { out: "grossProfit", kind: "flow", gaap: ["GrossProfit"], ifrs: ["GrossProfit"] },
  { out: "operatingIncome", kind: "flow", gaap: ["OperatingIncomeLoss"], ifrs: ["ProfitLossFromOperatingActivities"] },
  { out: "netIncome", kind: "flow", gaap: ["NetIncomeLoss", "ProfitLoss"], ifrs: ["ProfitLoss"] },
  { out: "interestExpense", kind: "flow", gaap: ["InterestExpense", "InterestExpenseNonoperating", "InterestExpenseDebt"], ifrs: ["InterestExpense", "FinanceCosts"] },
  { out: "incomeBeforeTax", kind: "flow", gaap: ["IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest", "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments"], ifrs: ["ProfitLossBeforeTax"] },
  { out: "incomeTaxExpense", kind: "flow", gaap: ["IncomeTaxExpenseBenefit"], ifrs: ["IncomeTaxExpenseContinuingOperations"] },
  { out: "eps", kind: "flow", unit: "USD/shares", gaap: ["EarningsPerShareDiluted", "EarningsPerShareBasicAndDiluted"], ifrs: ["DilutedEarningsLossPerShare"] },
  { out: "weightedAverageShsOut", kind: "flow", unit: "shares", gaap: ["WeightedAverageNumberOfDilutedSharesOutstanding", "WeightedAverageNumberOfSharesOutstandingBasicAndDiluted"], ifrs: ["AdjustmentsForWeightedAverageShares"] },
  { out: "depreciationAndAmortization", kind: "flow", gaap: ["DepreciationDepletionAndAmortization", "DepreciationAndAmortization", "DepreciationAmortizationAndAccretionNet"], ifrs: ["DepreciationAndAmortisationExpense"] },
];
const BALANCE: Concept[] = [
  { out: "cashAndCashEquivalents", kind: "instant", gaap: ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"], ifrs: ["CashAndCashEquivalents"] },
  { out: "shortTermInvestments", kind: "instant", gaap: ["MarketableSecuritiesCurrent", "ShortTermInvestments", "AvailableForSaleSecuritiesDebtSecuritiesCurrent"] },
  // Preferred: one tag that already covers current + noncurrent debt.
  { out: "totalDebtDirect", kind: "instant", gaap: ["DebtLongtermAndShorttermCombinedAmount", "LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities", "LongTermDebt", "DebtAndCapitalLeaseObligations"] },
  // Fallback pair, used only when the noncurrent part exists (a lone "current" line would understate debt).
  { out: "longTermDebtNoncurrent", kind: "instant", gaap: ["LongTermDebtNoncurrent", "LongTermDebtAndCapitalLeaseObligations", "ConvertibleLongTermNotesPayable", "ConvertibleNotesPayableNoncurrent", "LongTermNotesPayable"], ifrs: ["NoncurrentPortionOfNoncurrentBorrowings", "NoncurrentBorrowings"] },
  { out: "debtCurrent", kind: "instant", gaap: ["LongTermDebtCurrent", "DebtCurrent", "LongTermDebtAndCapitalLeaseObligationsCurrent", "ShortTermBorrowings"], ifrs: ["CurrentBorrowings", "CurrentPortionOfLongtermBorrowings"] },
  { out: "totalStockholdersEquity", kind: "instant", gaap: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"], ifrs: ["EquityAttributableToOwnersOfParent", "Equity"] },
];
const CASHFLOW: Concept[] = [
  { out: "operatingCashFlow", kind: "flow", gaap: ["NetCashProvidedByUsedInOperatingActivities"], ifrs: ["CashFlowsFromUsedInOperatingActivities"] },
  { out: "capex", kind: "flow", gaap: ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"], ifrs: ["PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"] },
  { out: "buyback", kind: "flow", gaap: ["PaymentsForRepurchaseOfCommonStock"], ifrs: ["PaymentsToAcquireOrRedeemEntitysShares"] },
  { out: "dividends", kind: "flow", gaap: ["PaymentsOfDividends", "PaymentsOfDividendsCommonStock"], ifrs: ["DividendsPaidClassifiedAsFinancingActivities"] },
];

function daysBetween(a: string, b: string): number {
  return (Date.parse(b) - Date.parse(a)) / 86_400_000;
}

/** end-date -> value for one concept, merged across its tags (priority order), annual filings only. */
function series(facts: CompanyFacts["facts"], c: Concept): Map<string, number> {
  const out = new Map<string, number>();
  const taxonomies: Array<[string, string[]]> = [["us-gaap", c.gaap], ["ifrs-full", c.ifrs ?? []]];
  for (const [tax, tags] of taxonomies) {
    for (const tag of tags) {
      const entries = facts[tax]?.[tag]?.units?.[c.unit ?? "USD"];
      if (!entries) continue;
      const best = new Map<string, Fact>(); // end -> latest-filed fact
      for (const f of entries) {
        if (!ANNUAL_FORMS.has(f.form) || typeof f.val !== "number") continue;
        if (c.kind === "flow") {
          if (!f.start) continue;
          const d = daysBetween(f.start, f.end);
          if (d < 330 || d > 380) continue; // full fiscal year only (drops quarterly / YTD facts)
        }
        const prev = best.get(f.end);
        if (!prev || f.filed > prev.filed) best.set(f.end, f);
      }
      for (const [end, f] of best) if (!out.has(end)) out.set(end, f.val);
    }
  }
  return out;
}

export interface SecStatements {
  income: Row[]; // newest first, up to 5 fiscal years, FMP field names
  balance?: Row; // latest fiscal year
  cashflow?: Row; // latest fiscal year (capex / buyback / dividends negative = cash spent, FMP convention)
}

function build(facts: CompanyFacts["facts"]): SecStatements | null {
  const inc = Object.fromEntries(INCOME.map((c) => [c.out, series(facts, c)]));
  const ends = [...new Set([...inc.revenue.keys(), ...inc.netIncome.keys()])].sort().reverse().slice(0, 5);
  if (ends.length === 0) return null;

  const income: Row[] = ends.map((end) => {
    const g = (k: string): number | null => inc[k].get(end) ?? null;
    const opInc = g("operatingIncome");
    const da = g("depreciationAndAmortization");
    return {
      date: end,
      revenue: g("revenue"),
      grossProfit: g("grossProfit"),
      operatingIncome: opInc,
      netIncome: g("netIncome"),
      interestExpense: g("interestExpense"),
      incomeBeforeTax: g("incomeBeforeTax"),
      incomeTaxExpense: g("incomeTaxExpense"),
      eps: g("eps"),
      weightedAverageShsOut: g("weightedAverageShsOut"),
      ebitda: opInc != null && da != null ? opInc + da : null,
    };
  });

  const latest = ends[0];

  // Weighted-average shares are missing for some filers (e.g. IFRS); the cover page's share count is
  // the next best filing figure.
  if (income[0].weightedAverageShsOut == null) {
    const cover = facts["dei"]?.["EntityCommonStockSharesOutstanding"]?.units?.["shares"];
    const newest = cover?.filter((f) => typeof f.val === "number" && f.val > 0).sort((a, b) => (a.end < b.end ? 1 : -1))[0];
    if (newest) income[0].weightedAverageShsOut = newest.val;
  }

  const bal = Object.fromEntries(BALANCE.map((c) => [c.out, series(facts, c)]));
  const bv = (k: string): number | null => bal[k].get(latest) ?? null;
  const ltRaw = bv("longTermDebtNoncurrent");
  const stRaw = bv("debtCurrent");
  const direct = bv("totalDebtDirect");
  const totalDebt = direct ?? (ltRaw != null ? ltRaw + (stRaw ?? 0) : null);
  const cash = bv("cashAndCashEquivalents");
  const sti = bv("shortTermInvestments");
  const balance: Row | undefined =
    totalDebt != null || cash != null || bv("totalStockholdersEquity") != null
      ? {
          date: latest,
          totalDebt,
          cashAndCashEquivalents: cash,
          cashAndShortTermInvestments: cash != null || sti != null ? (cash ?? 0) + (sti ?? 0) : null,
          totalStockholdersEquity: bv("totalStockholdersEquity"),
        }
      : undefined;

  const cf = Object.fromEntries(CASHFLOW.map((c) => [c.out, series(facts, c)]));
  const cv = (k: string): number | null => cf[k].get(latest) ?? null;
  const ocf = cv("operatingCashFlow");
  const capexPaid = cv("capex");
  const bb = cv("buyback");
  const div = cv("dividends");
  const cashflow: Row | undefined =
    ocf != null
      ? {
          date: latest,
          operatingCashFlow: ocf,
          capitalExpenditure: capexPaid != null ? -Math.abs(capexPaid) : null,
          freeCashFlow: capexPaid != null ? ocf - Math.abs(capexPaid) : null,
          commonStockRepurchased: bb != null ? -Math.abs(bb) : null,
          dividendsPaid: div != null ? -Math.abs(div) : null,
          netIncome: income[0].netIncome,
          depreciationAndAmortization: inc.depreciationAndAmortization.get(latest) ?? null,
        }
      : undefined;

  return { income, balance, cashflow };
}

/** Annual statements from SEC EDGAR, or null if the symbol has no CIK / no usable USD annual data.
 * Never throws. One request (~1–10 MB) per symbol; callers cache the parsed result. */
export async function getSecStatements(symbol: string): Promise<SecStatements | null> {
  try {
    const entry = (await getCikMap()).get(symbol.toUpperCase().replace(".", "-")) ?? (await getCikMap()).get(symbol.toUpperCase());
    if (!entry) return null;
    const data = await secFetchJson<CompanyFacts>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${entry.cik}.json`);
    return build(data.facts ?? {});
  } catch {
    return null;
  }
}
