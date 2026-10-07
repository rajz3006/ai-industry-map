// Step 4: Valuation.
//
// Methodology per research_notes/.../step4_valuation.md: no single multiple is interpretable in
// isolation, so this triangulates trailing P/E, PEG, EV/EBITDA, and FCF yield when FMP has them,
// falls back to P/E and P/S from Finnhub otherwise, and adds a weak supplementary signal from
// the stock's position in its own 52-week range (a crude stand-in for the "percentile vs own
// multiple history" convention the research note describes — we don't have a multiple time
// series, only a price range, so this is explicitly weaker and labeled as such). Risk/reward
// (2:1-3:1 convention) is computed separately in composite.ts, not here — this step is the
// multiple-based "is the price reasonable" read only.

import type { StepMetric } from "./types";
import { verdictFromScore } from "./types";
import { getFundamentals, type FmpFundamentals } from "@/lib/fmp";
import { getFinnhubFundamentals, type FinnhubFundamentals } from "./finnhubFundamentals";
import type { StepComputation } from "./scoreFinancials";

function fmtX(n: number): string {
  return `${n.toFixed(1)}x`;
}

export async function scoreValuation(
  symbol: string,
  latestClose: number | null,
  opts: { fast: boolean } = { fast: false }
): Promise<StepComputation> {
  const warnings: string[] = [];
  let fmp: FmpFundamentals | null = null;
  try {
    fmp = await getFundamentals(symbol);
  } catch {
    warnings.push(`FMP fundamentals lookup threw for ${symbol} — continuing without it.`);
  }
  if (!fmp) {
    warnings.push("FMP_API_KEY not set (or FMP had no data) — Step 4 falls back to Finnhub's thinner metric set.");
  }

  let finnhub: FinnhubFundamentals | null = null;
  try {
    finnhub = await getFinnhubFundamentals(symbol, opts);
  } catch {
    warnings.push(`Finnhub fundamentals lookup threw for ${symbol} — continuing without it.`);
  }
  if (opts.fast && !finnhub && !fmp) {
    warnings.push("Finnhub /stock/metric not yet cached for this symbol — skipped in preview mode to avoid the shared rate limit; see full detail.");
  }

  const peTrailing = fmp?.peTrailing ?? finnhub?.peTTM ?? null;
  const peForward = fmp?.peForward ?? null;
  const peg = fmp?.peg ?? null;
  const evToEbitda = fmp?.evToEbitda ?? null;
  const fcfYield = fmp?.fcfYield ?? null;
  const priceToSales = fmp?.priceToSales ?? finnhub?.psTTM ?? null;
  const priceToBook = fmp?.priceToBook ?? finnhub?.pbAnnual ?? null;
  const week52High = finnhub?.week52High ?? null;
  const week52Low = finnhub?.week52Low ?? null;

  const haveAnything = peTrailing !== null || priceToSales !== null || evToEbitda !== null || fcfYield !== null;

  const metrics: StepMetric[] = [];
  const sources = new Set<string>();
  if (fmp) for (const s of fmp.sources) sources.add(s);
  if (finnhub) sources.add("Finnhub /stock/metric");

  if (!haveAnything) {
    return {
      score: 2.5,
      verdict: "unknown",
      summary: `No valuation multiples were available for ${symbol} from either FMP or Finnhub — scored neutral rather than penalized for missing data.`,
      metrics: [],
      sources: [],
      warnings,
    };
  }

  let score = 2.5;
  const notes: string[] = [];
  const isUnprofitable = peTrailing === null; // no trailing earnings to anchor P/E/PEG off of

  if (peTrailing !== null) {
    metrics.push({ label: "Trailing P/E", value: fmtX(peTrailing), note: "15x-30x commonly cited as 'normal'", source: fmp ? "FMP" : "Finnhub" });
    if (peTrailing < 15) score += 0.75;
    else if (peTrailing < 25) score += 0.25;
    else if (peTrailing < 40) score -= 0.25;
    else {
      score -= 0.75;
      notes.push("trailing P/E well above the typical 15x-30x band");
    }
  } else if (priceToSales !== null) {
    // Unprofitable/pre-earnings name — P/S is the standard substitute multiple (research note, KQ1).
    metrics.push({ label: "Price / sales", value: fmtX(priceToSales), note: "no trailing earnings — P/S used in place of P/E", source: fmp ? "FMP" : "Finnhub" });
    if (priceToSales < 3) score += 0.5;
    else if (priceToSales < 10) score += 0;
    else {
      score -= 0.5;
      notes.push("P/S implies the market is pricing in a lot of future growth with no current earnings");
    }
  }

  if (peForward !== null) {
    metrics.push({ label: "Forward P/E", value: fmtX(peForward), source: "FMP" });
  }

  if (peg !== null && !isUnprofitable) {
    metrics.push({ label: "PEG ratio", value: peg.toFixed(2), note: "~1.0 = fair value (Lynch heuristic)", source: "FMP" });
    if (peg < 1.0) score += 0.5;
    else if (peg < 2.0) score += 0;
    else {
      score -= 0.5;
      notes.push("PEG well above 1.0 — paying a premium relative to growth");
    }
  }

  if (evToEbitda !== null) {
    metrics.push({ label: "EV / EBITDA", value: fmtX(evToEbitda), note: "8x-14x typical for mature companies", source: "FMP" });
    if (evToEbitda < 10) score += 0.5;
    else if (evToEbitda < 15) score += 0.25;
    else if (evToEbitda < 25) score -= 0.25;
    else {
      score -= 0.5;
      notes.push("EV/EBITDA well above the typical mature-company band");
    }
  }

  if (fcfYield !== null) {
    metrics.push({ label: "FCF yield", value: `${(fcfYield * 100).toFixed(1)}%`, note: ">8% historically associated with strong long-run returns", source: "FMP" });
    if (fcfYield > 0.08) score += 0.75;
    else if (fcfYield > 0.04) score += 0.25;
    else if (fcfYield >= 0) score += 0;
    else {
      score -= 0.5;
      notes.push("negative FCF yield");
    }
  }

  if (priceToBook !== null) {
    metrics.push({ label: "Price / book", value: fmtX(priceToBook), source: fmp ? "FMP" : "Finnhub" });
  }

  // Weak supplementary signal: position in the stock's own 52-week price range, as a crude
  // stand-in for the "percentile vs. own multiple history" convention — we only have a price
  // range here, not a multiple time series, so this intentionally carries a small weight.
  if (week52High !== null && week52Low !== null && latestClose !== null && week52High > week52Low) {
    const pct = ((latestClose - week52Low) / (week52High - week52Low)) * 100;
    metrics.push({
      label: "Position in 52-week range",
      value: `${pct.toFixed(0)}th pct`,
      note: "0 = own 52wk low, 100 = own 52wk high — a price-range proxy, not a true multiple-history percentile",
      source: "Finnhub /stock/metric",
    });
    if (pct < 20) score += 0.25;
    else if (pct > 80) score -= 0.25;
  }

  score = Math.max(0, Math.min(5, Math.round(score * 10) / 10));
  const verdict = verdictFromScore(score);
  const summary =
    `${symbol}'s valuation reads ${verdict} (${score.toFixed(1)}/5)` +
    (notes.length ? ` — ${notes.join("; ")}.` : ", based on the multiples below.") +
    (!fmp ? " PEG, EV/EBITDA, and FCF yield are unavailable without FMP_API_KEY; scored on P/E and Finnhub's thinner set." : "");

  return { score, verdict, summary, metrics, sources: Array.from(sources), warnings };
}
