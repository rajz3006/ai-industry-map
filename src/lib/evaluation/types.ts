// Shared contract for the 8-step stock evaluation framework (the "Evaluator" tab).
// Every piece of this feature (data providers, scoring engine, API route, UI) imports
// these types rather than redefining them, so the per-step shape stays identical
// end to end. See reports/Stock evaluation framework metrics.md for the methodology
// each step implements, and research_notes/Stock evaluation framework metrics/*.md
// for the underlying sourced metrics/thresholds per step.

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type StepVerdict = "strong" | "good" | "neutral" | "weak" | "poor" | "unknown";

export interface StepMetric {
  label: string;
  value: string; // pre-formatted for display, e.g. "63.8x", "+34.2% YoY", "1.80x"
  note?: string; // short context, e.g. "vs hardware median 25.1x"
  source?: string; // e.g. "Finnhub /stock/metric", "SEC EDGAR 8-K", "Alpaca daily bars"
}

export interface StepScore {
  step: StepNumber;
  name: string; // e.g. "Business & Moat"
  score: number; // 0-5, unknown/no-data should still return a number (use 2.5 neutral) but set verdict "unknown"
  verdict: StepVerdict;
  summary: string; // 1-3 sentence plain-English explanation of why this score, referencing the actual metrics below
  metrics: StepMetric[];
  sources: string[]; // citation labels or URLs backing this step's data/thresholds
}

export interface RiskReward {
  entry: number;
  target: number; // bull-case reference price
  stop: number; // downside/stop reference price
  ratio: number; // (target - entry) / (entry - stop), rounded to 2dp
  note: string; // how target/stop were derived (heuristic, not a guarantee)
}

export interface EvaluationResult {
  symbol: string;
  asOf: string; // ISO 8601 timestamp when this evaluation was computed
  compositeScore: number; // 0-5 weighted average across available steps
  compositeVerdict: StepVerdict;
  riskReward: RiskReward | null; // null if insufficient price history
  steps: StepScore[]; // always length 8, ordered by `step` ascending
  dataWarnings: string[]; // e.g. "FMP_API_KEY not set — valuation step limited to Finnhub fields"
}

export const STEP_NAMES: Record<StepNumber, string> = {
  1: "Business & Moat",
  2: "Industry Structure & Cycle",
  3: "Financial Statement Quality",
  4: "Valuation",
  5: "Management & Capital Allocation",
  6: "Chart / Technicals",
  7: "News & Market Context",
  8: "Composite Score & Risk/Reward",
};

// Default equal weighting across the 8 steps for the composite (Step 8). If a step's
// verdict is "unknown" (no data available), the composite excludes that step and
// renormalizes weights across the remaining steps rather than penalizing missing data
// as if it were a bad score.
export const DEFAULT_STEP_WEIGHTS: Record<StepNumber, number> = {
  1: 1,
  2: 1,
  3: 1,
  4: 1,
  5: 1,
  6: 1,
  7: 1,
  8: 0, // step 8 IS the composite — it never weights itself
};

export function verdictFromScore(score: number): StepVerdict {
  if (score >= 4.25) return "strong";
  if (score >= 3.25) return "good";
  if (score >= 2.25) return "neutral";
  if (score >= 1.25) return "weak";
  return "poor";
}
