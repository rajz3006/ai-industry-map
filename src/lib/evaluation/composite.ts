// Step 8: Composite Score & Risk/Reward, plus the riskReward heuristic consumed by the API
// route. Per the orchestrator's clarification (UI-team feedback): Step 8's `score` field MUST
// equal the top-level `compositeScore` exactly — it's a narrative wrapper around steps 1-7,
// not a 9th input into its own weighting (DEFAULT_STEP_WEIGHTS already encodes this: weight 0
// for step 8).
//
// Composite = weighted average of steps 1-7's scores using DEFAULT_STEP_WEIGHTS, renormalized
// across only the steps whose verdict isn't "unknown" (per types.ts's documented behavior).
//
// Risk/reward follows the 2:1-3:1 convention from research_notes/.../step7_8_news_scoring.md
// (Q7/Q8): entry = latest close; target = 52-week high when we have a full year of bars, else
// entry + 2xATR; stop = the tighter (closer to entry, i.e. more conservative on $ risked) of a
// nearby swing low or entry - 1.5xATR, with guards against degenerate near-zero-risk cases.

import type { Bar } from "@/lib/indicators";
import { atr, swingHighLow } from "@/lib/indicators";
import { DEFAULT_STEP_WEIGHTS, verdictFromScore, type RiskReward, type StepNumber, type StepScore } from "./types";

const MIN_BARS_FOR_RISK_REWARD = 20; // need a usable ATR(14) + a short swing-low window at minimum
const ATR_PERIOD = 14;

export function computeComposite(stepScores: StepScore[]): { compositeScore: number; compositeVerdict: ReturnType<typeof verdictFromScore> } {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const s of stepScores) {
    if (s.step === 8) continue; // step 8 never weights itself
    if (s.verdict === "unknown") continue; // renormalize across known steps only
    const w = DEFAULT_STEP_WEIGHTS[s.step as StepNumber];
    weightedSum += s.score * w;
    weightTotal += w;
  }
  const compositeScore = weightTotal > 0 ? Math.max(0, Math.min(5, Math.round((weightedSum / weightTotal) * 10) / 10)) : 2.5;
  const compositeVerdict = weightTotal > 0 ? verdictFromScore(compositeScore) : "unknown";
  return { compositeScore, compositeVerdict };
}

export function computeRiskReward(bars: Bar[]): RiskReward | null {
  if (bars.length < MIN_BARS_FOR_RISK_REWARD) return null;

  const entry = bars[bars.length - 1].c;
  const atrVal = atr(bars, ATR_PERIOD);
  if (atrVal === null || atrVal <= 0) return null;

  // Target: 52-week high when we have a full year of bars, else an ATR-projected target.
  const full52w = bars.length >= 252 ? swingHighLow(bars, 252) : null;
  let target = full52w ? full52w.high : entry + 2 * atrVal;
  if (target <= entry) target = entry + 2 * atrVal; // guard: today's own high can equal the 52wk high
  if (target <= entry) target = entry + 0.01; // last-resort guard against a literally-zero ATR edge case

  // Stop: the tighter (closer to entry, i.e. smaller $ risk) of a nearby swing low or an
  // ATR-based stop, guarding against a swing low that's degenerately close to (or above) entry.
  const swingLookback = Math.min(60, bars.length);
  const swing = swingHighLow(bars, swingLookback);
  const atrStop = entry - 1.5 * atrVal;
  let stop = atrStop;
  let stopNote = "ATR(14)-based stop (entry - 1.5x ATR)";
  if (swing && swing.low < entry) {
    const minMeaningfulRisk = 0.5 * atrVal; // avoid a near-zero-risk denominator from a degenerate swing low
    if (entry - swing.low >= minMeaningfulRisk && swing.low > atrStop) {
      stop = swing.low;
      stopNote = `nearest swing low over the trailing ${swingLookback} sessions (tighter than the ATR-based stop)`;
    }
  }
  if (entry - stop <= 0) return null; // can't compute a meaningful ratio

  const ratio = Math.round(((target - entry) / (entry - stop)) * 100) / 100;
  const note =
    `Heuristic swing levels, not a guarantee of future price action. Target: ${
      full52w ? "52-week high" : "entry + 2x ATR(14) (fewer than 252 bars of history available)"
    }. Stop: ${stopNote}. Risk/reward convention: 2:1 is commonly cited as the floor, 3:1 as solid practice.`;

  return { entry: round2(entry), target: round2(target), stop: round2(stop), ratio, note };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
