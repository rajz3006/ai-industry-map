// Shared contract for the 8-step stock evaluation framework (the "Evaluator" tab).
// Every piece of this feature (data providers, scoring engine, API route, UI) imports
// these types rather than redefining them, so the per-step shape stays identical
// end to end. See reports/Stock evaluation framework metrics.md for the methodology
// each step implements, and research_notes/Stock evaluation framework metrics/*.md
// for the underlying sourced metrics/thresholds per step.

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Two independent performance knobs for evaluateSymbol(), deliberately separate rather than
// one combined "fast" flag (which this feature originally had — see git history). They were
// coupled together because the Evaluator tab's bulk 57-symbol preview wants both skipped for
// latency, but a caller evaluating a much smaller candidate set (e.g. Closing Bell, which only
// evaluates symbols that already cleared a same-day drop filter) can afford live Steps 3/4
// fundamentals while still skipping the expensive insider lookup it doesn't even read.
export interface EvaluateOptions {
  /** Skip Step 5's full insider-cluster XML lookup (forces it "unknown") and Step 7's insider
   * re-surfacing + live /company-news fetch — the slow, SEC-XML/rate-limit-heavy path. Does
   * NOT affect Steps 3/4. */
  skipExpensive: boolean;
  /** Skip Steps 3/4's live Finnhub /stock/metric fetch, using only whatever's already cached
   * (returns "unknown" for an uncached symbol instead of waiting on a live fetch). Set this
   * independently of skipExpensive — a caller can want live fundamentals (this false) while
   * still skipping the insider lookup (skipExpensive true), which is exactly what fixed a real
   * bug: Closing Bell previously used the combined "fast" flag, which silently starved its
   * fundamentals/valuation gate of live data and made genuinely-dropped stocks vanish from the
   * screen whenever their Finnhub cache happened to be cold. */
  skipLiveFundamentals: boolean;
}

export const FULL_EVAL_OPTIONS: EvaluateOptions = { skipExpensive: false, skipLiveFundamentals: false };
// Matches the Evaluator tab's original bulk/"fast" preview behavior exactly.
export const BULK_PREVIEW_OPTIONS: EvaluateOptions = { skipExpensive: true, skipLiveFundamentals: true };
// Closing Bell's combination: skip the insider lookup it doesn't read, keep live fundamentals.
export const LIVE_FUNDAMENTALS_ONLY_OPTIONS: EvaluateOptions = { skipExpensive: true, skipLiveFundamentals: false };

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
