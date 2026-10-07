// Step 5: Management & Capital Allocation.
//
// Methodology per research_notes/.../step5_6_management_technicals.md: the highest-signal
// insider pattern is a cluster buy (3+ distinct insiders, open-market code-"P" buys, short
// window — already computed by getInsiderClusterSignal), and Mauboussin's buyback-quality test
// (repurchases accretive when done below intrinsic value, value-destructive near peaks) is
// explicitly out of scope here since we don't have a per-period intrinsic-value estimate to
// compare the buyback dollar figure against — this step surfaces the buyback figure as a
// capital-return signal, not a timing-quality judgment, and says so in the summary.

import type { StepMetric } from "./types";
import { verdictFromScore } from "./types";
import { getInsiderClusterSignal, getBuybackSignal } from "./managementSignals";
import type { StepComputation } from "./scoreFinancials";

export async function scoreManagement(symbol: string, opts: { fast: boolean } = { fast: false }): Promise<StepComputation> {
  const warnings: string[] = [];
  const metrics: StepMetric[] = [];
  const sources = new Set<string>(["SEC EDGAR Form 4"]);

  // Fast/preview mode (bulk evaluation of all 57 symbols): getInsiderClusterSignal fetches each
  // Form 4's raw XML individually per symbol to resolve the reporting-owner CIK — this is the
  // dominant cost of a bulk pass (see src/app/api/evaluate/route.ts). Skip it entirely here and
  // force this step to "unknown" rather than silently scoring it on buyback data alone, which
  // would mislabel an incomplete read as a confident one. Full single-symbol detail mode still
  // runs the real lookup.
  if (opts.fast) {
    const buyback = await getBuybackSignal(symbol).catch(() => ({ repurchasedTtm: null, note: "Buyback lookup failed." }));
    metrics.push({
      label: "Insider cluster buy (90d)",
      value: "Not checked (preview mode)",
      note: "Insider cluster-buy check skipped in preview mode — see full detail for this symbol.",
      source: "SEC EDGAR Form 4",
    });
    if (buyback.repurchasedTtm !== null) {
      sources.add("FMP cash-flow-statement");
      metrics.push({
        label: "Buybacks (TTM)",
        value: `$${(buyback.repurchasedTtm / 1e6).toFixed(0)}M`,
        note: "capital-return signal only — this does not assess whether buybacks were accretive",
        source: "FMP cash-flow-statement",
      });
    } else {
      metrics.push({ label: "Buybacks (TTM)", value: "n/a", note: buyback.note, source: "FMP cash-flow-statement" });
    }
    warnings.push(`Insider cluster-buy check skipped in preview mode — see full detail for this symbol.`);
    return {
      score: 2.5,
      verdict: "unknown",
      summary: `Step 5 (management) is scored "unknown" in preview mode — the insider cluster-buy check is skipped for bulk speed. Open ${symbol}'s full detail for the complete read.`,
      metrics,
      sources: Array.from(sources),
      warnings,
    };
  }

  let insiderFailed = false;
  const insider = await getInsiderClusterSignal(symbol).catch(() => {
    insiderFailed = true;
    return { clusterBuy: false, buyCount90d: 0, details: "Insider cluster-buy lookup failed." };
  });
  if (insiderFailed || insider.details.includes("lookup failed")) {
    warnings.push(`SEC EDGAR insider lookup failed for ${symbol} — Step 5 scored without it.`);
  }

  const buyback = await getBuybackSignal(symbol).catch(() => ({ repurchasedTtm: null, note: "Buyback lookup failed." }));
  if (buyback.repurchasedTtm === null) {
    warnings.push(`Buyback data unavailable for ${symbol}: ${buyback.note}`);
  } else {
    sources.add("FMP cash-flow-statement");
  }

  let score = 2.5;
  const notes: string[] = [];

  metrics.push({
    label: "Insider cluster buy (90d)",
    value: insider.clusterBuy ? "Yes" : insider.buyCount90d > 0 ? `${insider.buyCount90d} buyer(s), below threshold` : "None",
    note: insider.details,
    source: "SEC EDGAR Form 4",
  });
  if (insider.clusterBuy) {
    score += 1.25;
    notes.push("cluster buy detected — historically associated with stronger forward returns than isolated buys");
  } else if (insider.buyCount90d > 0) {
    score += 0.25;
    notes.push("some insider open-market buying, but below the 3-buyer cluster threshold");
  }

  if (buyback.repurchasedTtm !== null) {
    metrics.push({
      label: "Buybacks (TTM)",
      value: `$${(buyback.repurchasedTtm / 1e6).toFixed(0)}M`,
      note: "capital-return signal only — this does not assess whether buybacks were accretive (bought below intrinsic value) or not, which needs a valuation-timing history we don't have here",
      source: "FMP cash-flow-statement",
    });
    if (buyback.repurchasedTtm > 0) score += 0.5;
  } else {
    metrics.push({ label: "Buybacks (TTM)", value: "n/a", note: buyback.note, source: "FMP cash-flow-statement" });
  }

  const haveAnySignal = insider.buyCount90d > 0 || insider.details.length > 0 || buyback.repurchasedTtm !== null;
  if (!haveAnySignal) {
    return {
      score: 2.5,
      verdict: "unknown",
      summary: `No management/capital-allocation signal was available for ${symbol} — scored neutral rather than penalized for missing data.`,
      metrics,
      sources: Array.from(sources),
      warnings,
    };
  }

  score = Math.max(0, Math.min(5, Math.round(score * 10) / 10));
  const verdict = verdictFromScore(score);
  const summary =
    `${symbol}'s capital-allocation read is ${verdict} (${score.toFixed(1)}/5)` +
    (notes.length ? ` — ${notes.join("; ")}.` : ".") +
    (buyback.repurchasedTtm === null ? " Buyback figure unavailable (FMP_API_KEY not set)." : "");

  return { score, verdict, summary, metrics, sources: Array.from(sources), warnings };
}
