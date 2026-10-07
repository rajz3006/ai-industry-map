// Development-only mock evaluation generator.
//
// The real 8-step evaluation pipeline and its `/api/evaluate` route are being built by
// another agent in parallel with this UI. This file lets `StockEvaluator.tsx` be built and
// visually verified against the exact `EvaluationResult` shape *right now*, without waiting
// on that route to exist. `fetchEvaluation()` in StockEvaluator only falls back to this when
// the real fetch 404s or throws.
//
// This is a development convenience, not production data. Once `/api/evaluate` is confirmed
// stable, this file and the fallback branch that calls it in StockEvaluator.tsx should be
// removed by the integration pass — real failures should then surface as a genuine "error"
// state instead of silently resolving to synthesized numbers.

import {
  STEP_NAMES,
  verdictFromScore,
  type EvaluationResult,
  type RiskReward,
  type StepMetric,
  type StepNumber,
  type StepScore,
  type StepVerdict,
} from "./types";

/** Tiny deterministic PRNG seeded from the symbol string: stable across re-renders/refetches
 * for a given symbol (so the UI doesn't flicker between different fake numbers), but varies
 * believably across all 57 tracked symbols. */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  let state = h || 1;
  return () => {
    // xorshift-ish LCG step, folded into [0, 1).
    state = (state * 1103515245 + 12345) | 0;
    return ((state >>> 0) % 100000) / 100000;
  };
}

function pick<T>(rand: () => number, items: T[]): T {
  return items[Math.floor(rand() * items.length) % items.length];
}

function randRange(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(5, Math.round(n * 10) / 10));
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function fmtX(n: number): string {
  return `${n.toFixed(1)}x`;
}

interface StepTemplate {
  step: StepNumber;
  buildMetrics: (rand: () => number) => StepMetric[];
  buildSummary: (symbol: string, score: number, verdict: StepVerdict) => string;
  sources: string[];
}

const STEP_TEMPLATES: StepTemplate[] = [
  {
    step: 1,
    buildMetrics: (rand) => [
      {
        label: "Gross margin",
        value: `${randRange(rand, 38, 78).toFixed(1)}%`,
        note: "vs mapped-sector median ~48%",
        source: "Finnhub /stock/metric",
      },
      { label: "Market share trend", value: pick(rand, ["Gaining", "Stable", "Slipping"]), note: "3-yr trend" },
      { label: "Switching costs", value: pick(rand, ["High", "Moderate", "Low"]) },
    ],
    buildSummary: (symbol, score, verdict) =>
      `${symbol}'s competitive position reads ${verdict} — margin structure and switching-cost profile put moat durability at ${score.toFixed(1)}/5.`,
    sources: ["Finnhub /stock/metric", "10-K MD&A"],
  },
  {
    step: 2,
    buildMetrics: (rand) => [
      { label: "Industry cycle phase", value: pick(rand, ["Early upcycle", "Mid-cycle", "Late-cycle", "Downcycle"]) },
      { label: "Capex intensity", value: `${randRange(rand, 8, 35).toFixed(1)}% of revenue`, source: "SEC EDGAR cash-flow statement" },
      { label: "Supply/demand balance", value: pick(rand, ["Tight", "Balanced", "Oversupplied"]) },
    ],
    buildSummary: (symbol, score, verdict) =>
      `The structural backdrop for ${symbol}'s industry looks ${verdict} right now, scoring ${score.toFixed(1)}/5 on cycle positioning and capacity balance.`,
    sources: ["SEC EDGAR", "Industry capex trackers"],
  },
  {
    step: 3,
    buildMetrics: (rand) => [
      { label: "Revenue growth (YoY)", value: fmtPct(randRange(rand, -8, 45)), source: "Finnhub financials-as-reported" },
      { label: "Free cash flow margin", value: `${randRange(rand, -5, 30).toFixed(1)}%` },
      { label: "Net debt / EBITDA", value: fmtX(randRange(rand, 0, 3.5)), note: "lower is better" },
    ],
    buildSummary: (symbol, score, verdict) =>
      `Statement quality for ${symbol} comes in ${verdict}: growth, cash conversion and leverage together score ${score.toFixed(1)}/5.`,
    sources: ["Finnhub financials-as-reported", "SEC EDGAR 10-Q/10-K"],
  },
  {
    step: 4,
    buildMetrics: (rand) => [
      { label: "Forward P/E", value: fmtX(randRange(rand, 10, 65)), note: "vs peer median", source: "Finnhub /stock/metric" },
      { label: "EV/EBITDA", value: fmtX(randRange(rand, 6, 40)) },
      { label: "PEG ratio", value: randRange(rand, 0.6, 3.2).toFixed(2) },
    ],
    buildSummary: (symbol, score, verdict) =>
      `On a relative-valuation basis ${symbol} looks ${verdict} (${score.toFixed(1)}/5) against its own growth rate and peer multiples.`,
    sources: ["Finnhub /stock/metric", "Peer-group comps"],
  },
  {
    step: 5,
    buildMetrics: (rand) => [
      { label: "Insider buying (12mo)", value: pick(rand, ["Net buyers", "Mixed", "Net sellers"]), source: "SEC EDGAR Form 4" },
      { label: "Buyback/dividend trend", value: pick(rand, ["Expanding", "Steady", "Cut/suspended"]) },
      { label: "ROIC", value: `${randRange(rand, -4, 32).toFixed(1)}%` },
    ],
    buildSummary: (symbol, score, verdict) =>
      `Capital allocation under ${symbol}'s management reads ${verdict} — insider activity and return on invested capital support a ${score.toFixed(1)}/5.`,
    sources: ["SEC EDGAR Form 4", "Finnhub /stock/metric"],
  },
  {
    step: 6,
    buildMetrics: (rand) => [
      { label: "vs 50-day MA", value: fmtPct(randRange(rand, -22, 22)), source: "Alpaca daily bars" },
      { label: "vs 200-day MA", value: fmtPct(randRange(rand, -35, 35)) },
      { label: "RSI (14)", value: randRange(rand, 20, 80).toFixed(0) },
    ],
    buildSummary: (symbol, score, verdict) =>
      `Chart structure on ${symbol} is ${verdict} — trend and momentum readings combine to a ${score.toFixed(1)}/5 technical score.`,
    sources: ["Alpaca daily bars"],
  },
  {
    step: 7,
    buildMetrics: (rand) => [
      { label: "Headline sentiment (30d)", value: pick(rand, ["Positive", "Mixed", "Negative"]), source: "News digest" },
      { label: "Analyst revisions (30d)", value: pick(rand, ["Upgraded", "Unchanged", "Downgraded"]) },
      { label: "Upcoming catalyst", value: pick(rand, ["Earnings <10d", "Product event", "None flagged"]) },
    ],
    buildSummary: (symbol, score, verdict) =>
      `Recent news and market context around ${symbol} skews ${verdict} (${score.toFixed(1)}/5) — see headlines before acting on this alone.`,
    sources: ["News digest", "Analyst revision trackers"],
  },
];

function buildRiskReward(rand: () => number): RiskReward {
  const entry = Math.round(randRange(rand, 15, 420) * 100) / 100;
  const upsidePct = randRange(rand, 8, 35);
  const downsidePct = randRange(rand, 5, 20);
  const target = Math.round(entry * (1 + upsidePct / 100) * 100) / 100;
  const stop = Math.round(entry * (1 - downsidePct / 100) * 100) / 100;
  const ratio = Math.round(((target - entry) / (entry - stop)) * 100) / 100;
  return {
    entry,
    target,
    stop,
    ratio,
    note: "Heuristic swing levels derived from trailing volatility and the valuation/technicals steps above — not a guarantee of future price action.",
  };
}

/** Synthesizes a plausible-looking, deterministic (per symbol) `EvaluationResult` for UI
 * development and visual QA, matching the real shape exactly. Composite score/verdict are
 * computed the same way the real engine is documented to: an equal-weighted average across
 * steps 1-7 (step 8 narrates that composite rather than feeding back into it). */
export function buildMockEvaluation(symbol: string): EvaluationResult {
  const rand = seededRandom(symbol);

  const steps: StepScore[] = STEP_TEMPLATES.map((tpl) => {
    const score = clampScore(randRange(rand, 1.2, 4.9));
    const verdict = verdictFromScore(score);
    return {
      step: tpl.step,
      name: STEP_NAMES[tpl.step],
      score,
      verdict,
      summary: tpl.buildSummary(symbol, score, verdict),
      metrics: tpl.buildMetrics(rand),
      sources: tpl.sources,
    };
  });

  const compositeScore = clampScore(steps.reduce((sum, s) => sum + s.score, 0) / steps.length);
  const compositeVerdict = verdictFromScore(compositeScore);
  const riskReward = buildRiskReward(rand);

  const step8: StepScore = {
    step: 8,
    name: STEP_NAMES[8],
    score: compositeScore,
    verdict: compositeVerdict,
    summary: `Across the seven upstream reads, ${symbol} composites to ${compositeScore.toFixed(1)}/5 (${compositeVerdict}). Swing reference: entry ${riskReward.entry.toFixed(2)}, target ${riskReward.target.toFixed(2)}, stop ${riskReward.stop.toFixed(2)} (${riskReward.ratio.toFixed(2)}x reward:risk).`,
    metrics: [
      { label: "Composite score", value: `${compositeScore.toFixed(1)}/5` },
      { label: "Reward:risk ratio", value: `${riskReward.ratio.toFixed(2)}x` },
      { label: "Steps scored", value: `${steps.length}/8` },
    ],
    sources: ["Derived from steps 1-7"],
  };

  const dataWarnings = [
    "Mock data — /api/evaluate is not available yet; scores and metrics below are synthesized for UI development only.",
  ];
  if (rand() < 0.3) {
    dataWarnings.push("FMP_API_KEY not set — valuation step would be limited to Finnhub fields in the real evaluation.");
  }

  return {
    symbol,
    asOf: new Date().toISOString(),
    compositeScore,
    compositeVerdict,
    riskReward,
    steps: [...steps, step8],
    dataWarnings,
  };
}
