// Intrinsic-value engine for the Markets tab's Fundamental range.
//
// Philosophy (Buffett / Munger / Greenwald — value-investing canon, not a quant screen):
// "what is this business actually worth today, based on its own earnings power?" — never a
// peer multiple, never the market's opinion of it. Three independent engines triangulate:
//
//   1. Owner-earnings DCF (Buffett, 1986 shareholder letter): the cash an owner could take
//      out of the business — net income + non-cash charges − the capex needed to maintain
//      competitive position (proxied here by reported free cash flow). Projected over an
//      explicit 7-year window at a sustainable growth rate, then a terminal value. This is
//      the "going-concern earning power" read.
//   2. Earnings Power Value, EPV (Bruce Greenwald, "Value Investing"): normalized operating
//      profit after tax, capitalized at the discount rate with ZERO assumed growth. The
//      deliberately austere read — "what is it worth if it never grows again." Serves as the
//      low end of the band and the cyclical guard: a memory-chip maker at a cycle peak gets
//      valued on mid-cycle earnings, not peak earnings.
//   3. Earnings-yield anchor (Buffett's yardstick): at what price does the business's
//      earnings yield equal the investor's required return (Treasury + equity risk premium)?
//      price = owner-earnings-per-share / required return. A one-line reality check the
//      other two engines must roughly agree with.
//
// The output is a BAND, not a point: bear/base/bull scenarios on the growth input produce
// [low, high]. Uncertainty lives in the width of the band, not in a false-precision point
// estimate — this is the institutional-grade convention (sensitivity analysis, not a single
// "target price").
//
// Cyclicals guard (the Micron lesson): when the 5-year owner-earnings history shows high
// variability (coefficient of variation above threshold), the business is treated as cyclical
// and every engine runs on cycle-NORMALIZED (5-year average) earnings instead of the latest
// print — valuing a peak as if it were permanent is the classic value trap.
//
// Data: FMP annual statements + TTM ratios when FMP_API_KEY is set; Finnhub's thinner metric
// set as fallback (then owner earnings ≈ EPS × shares, growth ≈ revenueGrowthTTMYoy).
// When neither can supply positive earnings power, this returns null — an honest
// "cannot be valued on earnings" rather than a revenue-multiple guess. Buffett wouldn't
// value a business with no owner earnings on a sales multiple, and neither does this.

import { getFundamentals, getAnnualIncomeHistory, getAnnualCashFlow, getNetDebt } from "@/lib/fmp";
import { getFinnhubFundamentals } from "./finnhubFundamentals";
import type { RiskFreeRate } from "@/lib/fmp";

// --- Assumptions, all surfaced in tooltips (nothing hidden) -----------------------------
export const ERP = 0.045; // equity risk premium over the 10Y Treasury (Damodaran long-run ~4-5%)
const EXPLICIT_YEARS = 7; // DCF explicit projection window
const TERMINAL_GROWTH = 0.025; // perpetual growth after year 7 (long-run nominal GDP-ish)
const GROWTH_CAP = 0.12; // sustainable growth is capped — no business compounds at 30% forever
const GROWTH_FLOOR = 0.0; // never assume shrinkage in the base case; bear scenario handles it
const CV_CYCLICAL_THRESHOLD = 0.6; // coeff. of variation above this => cyclical, normalize
const MOS_BASE = 0.25; // base margin of safety applied by entryRange.ts (Graham's 20-30% convention)

export { MOS_BASE };

export interface IntrinsicValueBreakdown {
  symbol: string;
  perShareLow: number;
  perShareBase: number;
  perShareHigh: number;
  discountRate: number;
  riskFreeRate: number;
  riskFreeSource: RiskFreeRate["source"];
  erp: number;
  ownerEarningsTTM: number | null;
  ownerEarningsNormalized: number | null;
  isCyclical: boolean;
  growthBase: number | null;
  growthBear: number | null;
  growthBull: number | null;
  taxRate: number | null;
  netDebt: number | null;
  sharesOut: number | null;
  dcf: { bear: number; base: number; bull: number } | null;
  epv: { value: number; nopat: number } | null;
  earningsYieldAnchor: { price: number; earningsYieldAtIV: number } | null;
  /** Human-readable lines for the tooltip — every input that moved the number. */
  lines: string[];
  warnings: string[];
  dataQuality: "full" | "estimated" | "insufficient";
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

/** Two-stage DCF on a per-share owner-earnings stream. */
function dcfPerShare(oePerShare: number, g: number, r: number): number | null {
  if (oePerShare <= 0 || r <= g || r <= TERMINAL_GROWTH) return null;
  let pv = 0;
  for (let t = 1; t <= EXPLICIT_YEARS; t++) {
    pv += (oePerShare * Math.pow(1 + g, t)) / Math.pow(1 + r, t);
  }
  const year7 = oePerShare * Math.pow(1 + g, EXPLICIT_YEARS);
  const terminal = (year7 * (1 + TERMINAL_GROWTH)) / (r - TERMINAL_GROWTH);
  pv += terminal / Math.pow(1 + r, EXPLICIT_YEARS);
  return pv;
}

export async function computeIntrinsicValue(
  symbol: string,
  anchorPrice: number | null,
  riskFree: RiskFreeRate
): Promise<IntrinsicValueBreakdown | null> {
  const sym = symbol.toUpperCase();
  const lines: string[] = [];
  const warnings: string[] = [];

  const [fmp, finnhub, history, cashFlow, netDebt] = await Promise.all([
    getFundamentals(sym).catch(() => null),
    getFinnhubFundamentals(sym).catch(() => null),
    getAnnualIncomeHistory(sym, 5).catch(() => []),
    getAnnualCashFlow(sym).catch(() => null),
    getNetDebt(sym).catch(() => null),
  ]);

  const r = riskFree.rate + ERP;
  lines.push(`Discount rate ${(r * 100).toFixed(1)}% = 10Y Treasury ${fmtPct(riskFree.rate)} (${riskFree.source}) + ${fmtPct(ERP)} equity risk premium`);

  // --- Owner earnings (Buffett): FCF first, else NI + D&A − capex -----------------------
  let oeTTM: number | null = null;
  let oeSource = "";
  const fcfTTM = fmp?.freeCashFlow ?? cashFlow?.freeCashFlow ?? null;
  if (fcfTTM !== null && fcfTTM > 0) {
    oeTTM = fcfTTM;
    oeSource = "free cash flow (TTM)";
  } else {
    const ni = cashFlow?.netIncome ?? null;
    const dna = cashFlow?.depreciationAndAmortization ?? null;
    const capex = cashFlow?.capitalExpenditure ?? null;
    if (ni !== null && dna !== null && capex !== null) {
      const oe = ni + dna - Math.abs(capex);
      if (oe > 0) {
        oeTTM = oe;
        oeSource = "net income + D&A − capex";
      }
    }
  }
  // Finnhub fallback: EPS × shares
  const sharesOut: number | null = history.find((h) => h.weightedAverageShsOut && h.weightedAverageShsOut > 0)?.weightedAverageShsOut ?? null;
  if (oeTTM === null && finnhub?.peTTM && finnhub.peTTM > 0 && anchorPrice && anchorPrice > 0 && sharesOut) {
    const eps = anchorPrice / finnhub.peTTM;
    oeTTM = eps * sharesOut;
    oeSource = "EPS × shares (Finnhub fallback)";
    warnings.push("Owner earnings estimated from Finnhub P/E — no FMP cash-flow data.");
  }
  if (oeTTM === null || oeTTM <= 0 || !sharesOut || sharesOut <= 0) {
    warnings.push("No positive owner earnings available — cannot value on earnings power.");
    return null;
  }
  lines.push(`Owner earnings ${fmtMoney(oeTTM)} (${oeSource})`);

  // --- History: growth CAGR + cyclical normalization ------------------------------------
  const revs = history.map((h) => h.revenue).filter((v): v is number => v !== null && v > 0);
  let growthBase: number | null = null;
  if (revs.length >= 3) {
    const oldest = revs[revs.length - 1];
    const newest = revs[0];
    const years = revs.length - 1;
    if (oldest > 0 && newest > 0 && years > 0) {
      growthBase = Math.pow(newest / oldest, 1 / years) - 1;
      growthBase = Math.min(Math.max(growthBase, GROWTH_FLOOR), GROWTH_CAP);
      lines.push(`Revenue CAGR ${fmtPct(growthBase)} over ${years}y (capped at ${fmtPct(GROWTH_CAP)}) — company's own history, no peer comps`);
    }
  }
  if (growthBase === null) {
    const g = finnhub?.revenueGrowthTTMYoy ?? fmp?.revenueGrowthYoy ?? null;
    if (g !== null && Number.isFinite(g)) {
      growthBase = Math.min(Math.max(g, GROWTH_FLOOR), GROWTH_CAP);
      lines.push(`Growth ${fmtPct(growthBase)} from TTM revenue growth (single-year, capped)`);
      warnings.push("Multi-year history unavailable — growth from single TTM figure.");
    }
  }

  // Normalized owner earnings: 5-yr average of net income as cyclical proxy when history exists
  const niHist = history.map((h) => h.netIncome).filter((v): v is number => v !== null);
  let oeNormalized = oeTTM;
  let isCyclical = false;
  if (niHist.length >= 4) {
    const mean = niHist.reduce((a, b) => a + b, 0) / niHist.length;
    const sd = Math.sqrt(niHist.reduce((a, b) => a + (b - mean) ** 2, 0) / niHist.length);
    const cv = mean > 0 ? sd / mean : Infinity;
    if (cv > CV_CYCLICAL_THRESHOLD && mean > 0) {
      isCyclical = true;
      // Scale normalized NI by the OE/TTM-NI relationship to keep cash-flow reality
      const latestNI = niHist[0];
      oeNormalized = latestNI > 0 ? (mean / latestNI) * oeTTM : mean;
      lines.push(`Cyclical pattern detected (earnings CV ${(cv * 100).toFixed(0)}%) — using 5y-normalized owner earnings ${fmtMoney(oeNormalized)} instead of the latest print`);
    }
  }
  const oePerShare = oeNormalized / sharesOut;

  // --- Tax rate ------------------------------------------------------------------------
  let taxRate: number | null = null;
  const latest = history[0];
  if (latest?.incomeBeforeTax && latest.incomeBeforeTax > 0 && latest.incomeTaxExpense !== null && latest.incomeTaxExpense !== undefined) {
    taxRate = Math.min(Math.max(latest.incomeTaxExpense / latest.incomeBeforeTax, 0), 0.4);
  }
  if (taxRate === null) taxRate = 0.21; // US statutory fallback, labeled
  lines.push(`Tax rate ${fmtPct(taxRate)}${latest?.incomeBeforeTax ? " (company's own latest filing)" : " (US statutory fallback)"}`);

  // --- Engine 1: owner-earnings DCF ------------------------------------------------------
  const g = growthBase ?? 0.03;
  const gBear = Math.max(g * 0.4, 0);
  const gBull = Math.min(g * 1.3, 0.18);
  const dcfBear = dcfPerShare(oePerShare, gBear, r);
  const dcfBase = dcfPerShare(oePerShare, g, r);
  const dcfBull = dcfPerShare(oePerShare, gBull, r);
  const dcf = dcfBear !== null && dcfBase !== null && dcfBull !== null ? { bear: dcfBear, base: dcfBase, bull: dcfBull } : null;
  if (dcf) {
    lines.push(`DCF on owner earnings: bear ${fmtMoney(dcf.bear)} (g=${fmtPct(gBear)}) / base ${fmtMoney(dcf.base)} (g=${fmtPct(g)}) / bull ${fmtMoney(dcf.bull)} (g=${fmtPct(gBull)}), ${EXPLICIT_YEARS}y + ${fmtPct(TERMINAL_GROWTH)} terminal`);
  }

  // --- Engine 2: EPV (Greenwald) — no-growth value ---------------------------------------
  let epv: { value: number; nopat: number } | null = null;
  const ebitHist = history.map((h) => h.ebit).filter((v): v is number => v !== null);
  if (ebitHist.length > 0) {
    const ebitNorm = isCyclical
      ? ebitHist.reduce((a, b) => a + b, 0) / ebitHist.length
      : ebitHist[0];
    if (ebitNorm > 0) {
      const nopat = ebitNorm * (1 - taxRate);
      const ev = nopat / r;
      const equity = ev - (netDebt ?? 0);
      if (equity > 0) {
        epv = { value: equity / sharesOut, nopat };
        lines.push(`EPV (no-growth value): NOPAT ${fmtMoney(nopat)} / ${fmtPct(r)} = ${fmtMoney(epv.value)}/sh after ${fmtMoney(netDebt ?? 0)} net debt`);
      }
    }
  }
  if (!epv) warnings.push("EPV unavailable — no usable EBIT history.");

  // --- Engine 3: earnings-yield anchor ----------------------------------------------------
  const eyAnchor = oePerShare / r;
  lines.push(`Earnings-yield anchor: ${fmtMoney(oePerShare)}/sh ÷ ${fmtPct(r)} required return = ${fmtMoney(eyAnchor)}/sh`);

  // --- Triangulated band ------------------------------------------------------------------
  const lows: number[] = [];
  const highs: number[] = [];
  if (dcf) { lows.push(dcf.bear); highs.push(dcf.bull); }
  if (epv) { lows.push(epv.value); highs.push(epv.value); }
  lows.push(eyAnchor); highs.push(eyAnchor);
  const perShareLow = Math.min(...lows);
  const perShareHigh = Math.max(...highs);
  const perShareBase = dcf ? dcf.base : (epv ? epv.value : eyAnchor);
  if (!(perShareLow > 0 && perShareHigh >= perShareLow)) return null;

  lines.push(`Intrinsic-value band ${fmtMoney(perShareLow)} – ${fmtMoney(perShareHigh)} (triangulated across ${[dcf && "DCF", epv && "EPV", "earnings-yield"].filter(Boolean).join(", ")})`);
  if (netDebt !== null && netDebt !== 0) {
    lines.push(`Net debt ${fmtMoney(netDebt)} bridged from enterprise value to equity value`);
  }

  const dataQuality: IntrinsicValueBreakdown["dataQuality"] = fmp ? "full" : "estimated";
  if (!fmp) warnings.push("FMP unavailable — running on Finnhub's thinner metric set.");

  return {
    symbol: sym,
    perShareLow,
    perShareBase,
    perShareHigh,
    discountRate: r,
    riskFreeRate: riskFree.rate,
    riskFreeSource: riskFree.source,
    erp: ERP,
    ownerEarningsTTM: oeTTM,
    ownerEarningsNormalized: oeNormalized,
    isCyclical,
    growthBase: growthBase ?? g,
    growthBear: gBear,
    growthBull: gBull,
    taxRate,
    netDebt,
    sharesOut,
    dcf,
    epv,
    earningsYieldAnchor: { price: eyAnchor, earningsYieldAtIV: r },
    lines,
    warnings,
    dataQuality,
  };
}
