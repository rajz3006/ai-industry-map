// Main scoring engine entry point for the Evaluator tab: evaluateSymbol() assembles the full
// 8-step EvaluationResult for one symbol. Steps 1-2 are curated reference data (moatIndustryData),
// steps 3-7 each hit their own provider(s) with graceful degradation, and step 8 is a pure
// function of steps 1-7 (see composite.ts). Every provider call is wrapped so one failure can
// never throw out of this function — a worst-case all-providers-down run still returns a
// complete, well-typed EvaluationResult (everything "unknown"/neutral, with warnings explaining
// why), which is the explicitly-designed honest degraded path for this feature, not an error.

import type { Bar } from "@/lib/indicators";
import { moatIndustryData } from "@/data/moatIndustryData";
import { STEP_NAMES, type EvaluationResult, type StepNumber, type StepScore } from "./types";
import { scoreFinancials, type StepComputation } from "./scoreFinancials";
import { scoreValuation } from "./scoreValuation";
import { scoreManagement } from "./scoreManagement";
import { scoreTechnicals } from "./scoreTechnicals";
import { scoreNews } from "./scoreNews";
import { computeComposite, computeRiskReward } from "./composite";

function toStepScore(step: StepNumber, computation: StepComputation): StepScore {
  return {
    step,
    name: STEP_NAMES[step],
    score: computation.score,
    verdict: computation.verdict,
    summary: computation.summary,
    metrics: computation.metrics,
    sources: computation.sources,
  };
}

function moatIndustrySteps(symbol: string): { moatStep: StepScore; industryStep: StepScore; warning?: string } {
  const entry = moatIndustryData[symbol.toUpperCase()];
  if (!entry) {
    const unknown = (step: StepNumber): StepScore => ({
      step,
      name: STEP_NAMES[step],
      score: 2.5,
      verdict: "unknown",
      summary: `No curated moat/industry research is available for ${symbol} yet.`,
      metrics: [],
      sources: [],
    });
    return { moatStep: unknown(1), industryStep: unknown(2), warning: `${symbol} is not in moatIndustryData.ts's curated 57-symbol set.` };
  }
  return {
    moatStep: { step: 1, name: STEP_NAMES[1], ...entry.moat },
    industryStep: { step: 2, name: STEP_NAMES[2], ...entry.industry },
  };
}

/** Wraps a step computation so a thrown error degrades to an "unknown" step rather than
 * failing the whole evaluation. Every provider call inside the individual score*.ts modules
 * already catches its own errors, but this is a last-resort backstop. */
async function safeStep(step: StepNumber, label: string, run: () => Promise<StepComputation>): Promise<{ stepScore: StepScore; warnings: string[] }> {
  try {
    const computation = await run();
    return { stepScore: toStepScore(step, computation), warnings: computation.warnings };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      stepScore: {
        step,
        name: STEP_NAMES[step],
        score: 2.5,
        verdict: "unknown",
        summary: `${label} could not be computed (unexpected error) — scored neutral.`,
        metrics: [],
        sources: [],
      },
      warnings: [`${label} threw an unexpected error: ${message}`],
    };
  }
}

export async function evaluateSymbol(symbol: string, bars: Bar[], opts: { fast: boolean } = { fast: false }): Promise<EvaluationResult> {
  const dataWarnings: string[] = [];
  const sym = symbol.toUpperCase();

  const { moatStep, industryStep, warning: moatIndustryWarning } = moatIndustrySteps(sym);
  if (moatIndustryWarning) dataWarnings.push(moatIndustryWarning);

  const latestClose = bars.length > 0 ? bars[bars.length - 1].c : null;

  const [financials, valuation, management, newsStep] = await Promise.all([
    safeStep(3, "Step 3 (financial statement quality)", () => scoreFinancials(sym, opts)),
    safeStep(4, "Step 4 (valuation)", () => scoreValuation(sym, latestClose, opts)),
    safeStep(5, "Step 5 (management)", () => scoreManagement(sym, opts)),
    safeStep(7, "Step 7 (news/context)", () => scoreNews(sym, opts)),
  ]);
  dataWarnings.push(...financials.warnings, ...valuation.warnings, ...management.warnings, ...newsStep.warnings);

  let technicalsStep: StepScore;
  try {
    const computation = scoreTechnicals(sym, bars);
    technicalsStep = toStepScore(6, computation);
    dataWarnings.push(...computation.warnings);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    technicalsStep = {
      step: 6,
      name: STEP_NAMES[6],
      score: 2.5,
      verdict: "unknown",
      summary: "Step 6 (technicals) could not be computed (unexpected error) — scored neutral.",
      metrics: [],
      sources: [],
    };
    dataWarnings.push(`Step 6 (technicals) threw an unexpected error: ${message}`);
  }

  const stepsSoFar: StepScore[] = [moatStep, industryStep, financials.stepScore, valuation.stepScore, management.stepScore, technicalsStep, newsStep.stepScore];

  const { compositeScore, compositeVerdict } = computeComposite(stepsSoFar);

  let riskReward;
  try {
    riskReward = computeRiskReward(bars);
    if (riskReward === null && bars.length > 0) {
      dataWarnings.push(`Insufficient bar history for ${sym} to compute a risk/reward estimate (${bars.length} bars).`);
    } else if (bars.length === 0) {
      dataWarnings.push(`No price bars available for ${sym} — risk/reward and technicals are unavailable.`);
    }
  } catch (err) {
    riskReward = null;
    dataWarnings.push(`Risk/reward computation threw an unexpected error for ${sym}: ${err instanceof Error ? err.message : String(err)}`);
  }

  const compositeStep: StepScore = {
    step: 8,
    name: STEP_NAMES[8],
    score: compositeScore,
    verdict: compositeVerdict,
    summary:
      `Composite ${compositeScore.toFixed(1)}/5 (${compositeVerdict})` +
      (riskReward
        ? ` — risk/reward of ${riskReward.ratio.toFixed(2)}:1 (entry $${riskReward.entry.toFixed(2)}, target $${riskReward.target.toFixed(2)}, stop $${riskReward.stop.toFixed(2)})${
            riskReward.ratio >= 2
              ? ", which clears the usual 2:1 minimum"
              : ", which falls short of the usual 2:1 minimum"
          }.`
        : " — risk/reward unavailable (insufficient price history)."),
    metrics: [
      { label: "Composite score", value: `${compositeScore.toFixed(1)}/5` },
      { label: "Steps scored (not unknown)", value: `${stepsSoFar.filter((s) => s.verdict !== "unknown").length}/7` },
      ...(riskReward ? [{ label: "Risk/reward ratio", value: `${riskReward.ratio.toFixed(2)}:1` }] : []),
    ],
    sources: ["Derived from steps 1-7"],
  };

  const steps: StepScore[] = [...stepsSoFar, compositeStep].sort((a, b) => a.step - b.step);

  if (opts.fast) {
    dataWarnings.push(
      "Preview score based on 6 of 8 steps — open this symbol for the full evaluation including insider activity."
    );
  }

  return {
    symbol: sym,
    asOf: new Date().toISOString(),
    compositeScore,
    compositeVerdict,
    riskReward,
    steps,
    dataWarnings,
  };
}
