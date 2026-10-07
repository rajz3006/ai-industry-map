// Step 3: Financial Statement Quality.
//
// Methodology per research_notes/.../step3_financial_statement_quality.md: margin level/trend
// is sector-relative (we don't have a sector-median lookup here, so this scores margin level on
// generic, source-cited bands rather than inventing a sector table), ROE vs ROIC divergence
// flags leverage/buyback-driven "quality" rather than operational improvement, a ROIC-WACC
// spread of 2-3pp is "strong" (we approximate WACC at a flat 8% since we don't have a
// per-sector WACC table either — this is called out explicitly as an approximation), leverage
// bands differ by using Net Debt/EBITDA when available and Debt/Equity otherwise, and FCF
// margin of 10-15%+ is a healthy reference point for a mature business.
//
// Primary source: FMP getFundamentals(). Fallback/merge: Finnhub /stock/metric fields when FMP
// is null or missing specific fields (no FMP_API_KEY is configured in this repo today, so the
// fallback path is the one actually exercised in practice). If neither provider has anything
// usable, returns verdict "unknown" at the neutral 2.5 rather than penalizing missing data.

import type { StepMetric, StepVerdict } from "./types";
import { verdictFromScore } from "./types";
import { getFundamentals, type FmpFundamentals } from "@/lib/fmp";
import { getFinnhubFundamentals, type FinnhubFundamentals } from "./finnhubFundamentals";

export interface StepComputation {
  score: number;
  verdict: StepVerdict;
  summary: string;
  metrics: StepMetric[];
  sources: string[];
  warnings: string[];
}

const APPROX_WACC = 0.08; // flat approximation — see file header; a real sector-WACC table is out of scope here

function fmtPct(n: number | null, digits = 1): string {
  return n === null ? "n/a" : `${(n * 100).toFixed(digits)}%`;
}

export async function scoreFinancials(symbol: string, opts: { fast: boolean } = { fast: false }): Promise<StepComputation> {
  const warnings: string[] = [];
  let fmp: FmpFundamentals | null = null;
  try {
    fmp = await getFundamentals(symbol);
  } catch {
    warnings.push(`FMP fundamentals lookup threw for ${symbol} — continuing without it.`);
  }
  if (!fmp) {
    warnings.push("FMP_API_KEY not set (or FMP had no data) — Step 3 falls back to Finnhub's thinner metric set.");
  }

  let finnhub: FinnhubFundamentals | null = null;
  try {
    finnhub = await getFinnhubFundamentals(symbol, opts);
  } catch {
    warnings.push(`Finnhub fundamentals lookup threw for ${symbol} — continuing without it.`);
  }
  if (!finnhub && !fmp) {
    warnings.push(
      opts.fast
        ? "Finnhub /stock/metric not yet cached for this symbol — skipped in preview mode to avoid the shared rate limit; see full detail."
        : "Finnhub /stock/metric also unavailable for this symbol (no key, or lookup failed)."
    );
  }

  const netMargin = fmp?.netMargin ?? (finnhub?.netMarginTTM != null ? finnhub.netMarginTTM / 100 : null);
  const grossMargin = fmp?.grossMargin ?? (finnhub?.grossMarginTTM != null ? finnhub.grossMarginTTM / 100 : null);
  const revenueGrowth = fmp?.revenueGrowthYoy ?? (finnhub?.revenueGrowthTTMYoy != null ? finnhub.revenueGrowthTTMYoy / 100 : null);
  const roe = fmp?.roe ?? (finnhub?.roeTTM != null ? finnhub.roeTTM / 100 : null);
  const roic = fmp?.roic ?? null; // Finnhub free tier has no ROIC-equivalent field
  const debtToEquity = fmp?.debtToEquity ?? finnhub?.debtToEquity ?? null;
  const netDebtToEbitda = fmp?.netDebtToEbitda ?? null;
  const interestCoverage = fmp?.interestCoverage ?? null;
  const fcfMargin = fmp?.fcfMargin ?? null;

  const haveAnything =
    netMargin !== null || grossMargin !== null || revenueGrowth !== null || roe !== null || roic !== null || debtToEquity !== null;

  const metrics: StepMetric[] = [];
  const sources = new Set<string>();
  if (fmp) for (const s of fmp.sources) sources.add(s);
  if (finnhub) sources.add("Finnhub /stock/metric");
  if (fmp?.warnings.length) warnings.push(...fmp.warnings.map((w) => `FMP: ${w}`));

  if (!haveAnything) {
    return {
      score: 2.5,
      verdict: "unknown",
      summary: `No financial-statement data was available for ${symbol} from either FMP or Finnhub — scored neutral rather than penalized for missing data.`,
      metrics: [],
      sources: [],
      warnings,
    };
  }

  let score = 2.5;
  const notes: string[] = [];

  if (netMargin !== null) {
    metrics.push({ label: "Net margin", value: fmtPct(netMargin), note: "TTM", source: fmp ? "FMP" : "Finnhub" });
    if (netMargin > 0.15) score += 0.5;
    else if (netMargin > 0.05) score += 0.25;
    else if (netMargin >= 0) score += 0;
    else {
      score -= 0.75;
      notes.push("negative net margin");
    }
  }

  if (grossMargin !== null) {
    metrics.push({ label: "Gross margin", value: fmtPct(grossMargin), note: "TTM", source: fmp ? "FMP" : "Finnhub" });
  }

  if (revenueGrowth !== null) {
    metrics.push({ label: "Revenue growth (YoY)", value: `${revenueGrowth >= 0 ? "+" : ""}${(revenueGrowth * 100).toFixed(1)}%`, source: fmp ? "FMP income-statement-growth" : "Finnhub" });
    if (revenueGrowth > 0.15) score += 0.5;
    else if (revenueGrowth >= 0) score += 0.25;
    else {
      score -= 0.5;
      notes.push("revenue declining YoY");
    }
  }

  // Leverage: prefer Net Debt/EBITDA (FMP only), fall back to Debt/Equity (FMP or Finnhub).
  if (netDebtToEbitda !== null) {
    metrics.push({ label: "Net debt / EBITDA", value: `${netDebtToEbitda.toFixed(2)}x`, note: "lower is better", source: "FMP" });
    if (netDebtToEbitda < 1) score += 0.5;
    else if (netDebtToEbitda < 3) score += 0.25;
    else if (netDebtToEbitda < 5) score += 0;
    else {
      score -= 0.5;
      notes.push("elevated leverage (net debt/EBITDA > 5x)");
    }
  } else if (debtToEquity !== null) {
    metrics.push({ label: "Debt / equity", value: `${debtToEquity.toFixed(2)}x`, note: "Net debt/EBITDA unavailable — using D/E", source: fmp ? "FMP" : "Finnhub" });
    if (debtToEquity < 0.5) score += 0.25;
    else if (debtToEquity < 1.5) score += 0;
    else if (debtToEquity < 3) score -= 0.25;
    else {
      score -= 0.5;
      notes.push("elevated debt/equity");
    }
  }

  if (interestCoverage !== null) {
    metrics.push({ label: "Interest coverage (EBIT/interest)", value: `${interestCoverage.toFixed(1)}x`, source: "FMP" });
    if (interestCoverage > 8) score += 0.25;
    else if (interestCoverage < 4) {
      score -= 0.25;
      notes.push("thin interest coverage");
    }
  }

  if (fcfMargin !== null) {
    metrics.push({ label: "Free cash flow margin", value: fmtPct(fcfMargin), source: "FMP" });
    if (fcfMargin > 0.15) score += 0.5;
    else if (fcfMargin > 0) score += 0.25;
    else if (revenueGrowth !== null && revenueGrowth > 0.2) {
      score -= 0.1;
      notes.push("negative FCF margin, but plausibly growth/capex-driven given strong revenue growth");
    } else {
      score -= 0.5;
      notes.push("negative FCF margin");
    }
  }

  // ROE vs ROIC: the research note's core quality-vs-leverage-artifact check (Step 3, KQ3).
  if (roic !== null) {
    metrics.push({
      label: "ROIC",
      value: fmtPct(roic),
      note: fmp?.roicEstimated ? "derived: EBIT×(1-tax)/invested capital" : undefined,
      source: "FMP",
    });
    if (roic > APPROX_WACC + 0.05) score += 0.5;
    else if (roic > APPROX_WACC) score += 0.25;
    else {
      score -= 0.25;
      notes.push(`ROIC (${fmtPct(roic)}) at/below our ~${(APPROX_WACC * 100).toFixed(0)}% flat WACC approximation`);
    }
    if (roe !== null && roe - roic > 0.1) {
      score -= 0.5;
      notes.push(`ROE (${fmtPct(roe)}) well above ROIC — likely leverage/buyback-inflated rather than operationally driven`);
    }
  } else if (roe !== null) {
    metrics.push({ label: "ROE", value: fmtPct(roe), note: "ROIC unavailable — ROE alone is leverage-sensitive, read with caution", source: fmp ? "FMP" : "Finnhub" });
    if (roe > 0.2) score += 0.25;
    else if (roe < 0) {
      score -= 0.5;
      notes.push("negative ROE");
    }
  }

  score = Math.max(0, Math.min(5, Math.round(score * 10) / 10));
  const verdict = verdictFromScore(score);
  const summary =
    `${symbol}'s statement quality reads ${verdict} (${score.toFixed(1)}/5)` +
    (notes.length ? ` — ${notes.join("; ")}.` : ", based on the margin/leverage/cash-flow metrics below.") +
    (!fmp ? " Figures sourced from Finnhub's free-tier metric set (FMP not configured), so ROIC, net debt/EBITDA, and FCF margin are unavailable." : "");

  return { score, verdict, summary, metrics, sources: Array.from(sources), warnings };
}
