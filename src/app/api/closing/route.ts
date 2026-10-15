import { NextResponse } from "next/server";
import { allTickerRows } from "@/data/tickers";
import { loadBarSet, nodeMeta } from "@/lib/moversData";
import { loadEvaluationBars } from "@/lib/evaluation/evalBars";
import { evaluateSymbol } from "@/lib/evaluation/score";
import { mapWithConcurrency } from "@/lib/finnhub";
import { AlpacaError } from "@/lib/alpaca";
import { LIVE_FUNDAMENTALS_ONLY_OPTIONS, type StepVerdict } from "@/lib/evaluation/types";

// The intraday dip screen behind the Stock Picker tab: stocks that dropped in today's
// session so far (on the latest available price, not just the close), filtered to names
// whose fundamentals (evaluation step 3), valuation (step 4), and technicals (step 6) all
// read at or above the reader's thresholds, ranked by composite quality. This is a
// screening tool, not a recommendation — every candidate carries its reasons so the reader
// can judge.
//
// Uses LIVE_FUNDAMENTALS_ONLY_OPTIONS (skipExpensive: true, skipLiveFundamentals: false),
// NOT the Evaluator tab's bulk-preview options. This route only ever evaluates symbols
// that already cleared the day's drop filter — typically a handful, not all 57 — so it can
// afford live Finnhub fundamentals (unlike the Evaluator tab's 57-symbol bulk pass) while
// still skipping the expensive SEC Form-4 insider lookup (Step 5), which this route never
// reads anyway. This matters: the old shared "fast" flag coupled those two concerns
// together, so this route previously ran with Finnhub fundamentals cache-only — any
// symbol whose cache happened to be cold came back "unknown" on fundamentals/valuation,
// which fails a "≥ good" gate silently. That's why stocks that visibly dropped 1%+
// intraday could vanish from this tab with no explanation. See EvaluateOptions in
// src/lib/evaluation/types.ts for the full rationale.

export interface ClosingCandidate {
  symbol: string;
  nodeId: string;
  name: string;
  layer: string;
  price: number;
  /** % change vs previous close. */
  changePct: number;
  /** (close - dayHigh) / dayHigh — how far the stock faded from its intraday high. */
  offHighPct: number;
  /** (dayHigh - dayLow) / close — intraday range as % of price. */
  dayRangePct: number;
  /** changePct / trailingStdDevPct — how unusual today's move is relative to the stock's
   * own volatility (same formula as the Opportunities tab's z-score). Null if insufficient
   * price history. */
  zScore: number | null;
  financialsVerdict: StepVerdict;
  financialsScore: number;
  valuationVerdict: StepVerdict;
  valuationScore: number;
  technicalsVerdict: StepVerdict;
  technicalsScore: number;
  compositeScore: number;
  compositeVerdict: StepVerdict;
  trailingStdDevPct: number | null;
  reasons: string[];
}

export interface ClosingResponse {
  asOf: string;
  sessionDate: string;
  /** How many US symbols had usable bar data at all (the universe size, not the drop-filter pool). */
  evaluated: number;
  /** How many symbols cleared the drop filter and were sent through fundamentals/valuation/technicals scoring. */
  dropped: number;
  candidates: ClosingCandidate[];
  /** Dropped symbols excluded because one of the three gated steps came back "unknown" (no
   * data) rather than a real reading — i.e. possibly-qualifying candidates hidden by a data
   * gap, not a failed quality check. Surfaced so the reader isn't misled into thinking a thin
   * candidate list means "nothing qualifies" when it may partly mean "couldn't tell." */
  excludedForDataGap: number;
  /** Dropped symbols that had real readings on all three gated steps but didn't clear at
   * least one threshold. */
  excludedForQuality: number;
  /** The filter thresholds actually applied — echoed so the UI can display them. */
  filters: ClosingFilters;
}

export type DropBasis = "pct" | "zscore";

export interface ClosingFilters {
  dropBasis: DropBasis;
  minDropPct: number;
  minZScore: number;
  minFundamentals: StepVerdict;
  minValuation: StepVerdict;
  minTechnicals: StepVerdict;
}

// Candidate gates — the defaults the tab ships with; the UI lets the reader change them.
const DEFAULT_DROP_BASIS: DropBasis = "pct";
const DEFAULT_MIN_DROP_PCT = 1.0; // dropped at least 1% in the session
const DEFAULT_MIN_ZSCORE = 1.0; // today's drop at least 1 standard deviation vs. the stock's own 20-day daily volatility
const DEFAULT_MIN_VERDICT: StepVerdict = "good";
// Valuation defaults looser than fundamentals/technicals on purpose: the point is to screen
// out candidates whose valuation reads outright weak/poor (richly overpriced even for a
// dip), not to require the stock be cheap outright — a "neutral" valuation on an otherwise
// strong/good dip is still a defensible candidate, per the review that prompted this gate.
const DEFAULT_MIN_VALUATION: StepVerdict = "neutral";

// Ranked so "at least X" comparisons work; unknown never passes any threshold.
const VERDICT_RANK: Record<StepVerdict, number> = {
  strong: 5,
  good: 4,
  neutral: 3,
  weak: 2,
  poor: 1,
  unknown: 0,
};

const VALID_VERDICTS: StepVerdict[] = ["strong", "good", "neutral", "weak", "poor"];

function parseVerdictParam(value: string | null, fallback: StepVerdict): StepVerdict {
  const v = (value ?? "").toLowerCase();
  return VALID_VERDICTS.includes(v as StepVerdict) ? (v as StepVerdict) : fallback;
}

function parseFilters(searchParams: URLSearchParams): ClosingFilters {
  const dropBasisRaw = searchParams.get("dropBasis");
  const dropBasis: DropBasis = dropBasisRaw === "zscore" ? "zscore" : DEFAULT_DROP_BASIS;

  const rawDrop = Number(searchParams.get("minDrop"));
  const minDropPct = Number.isFinite(rawDrop) ? Math.min(50, Math.max(0, rawDrop)) : DEFAULT_MIN_DROP_PCT;

  const rawZ = Number(searchParams.get("minZ"));
  const minZScore = Number.isFinite(rawZ) ? Math.min(10, Math.max(0, rawZ)) : DEFAULT_MIN_ZSCORE;

  return {
    dropBasis,
    minDropPct,
    minZScore,
    minFundamentals: parseVerdictParam(searchParams.get("minFund"), DEFAULT_MIN_VERDICT),
    minValuation: parseVerdictParam(searchParams.get("minVal"), DEFAULT_MIN_VALUATION),
    minTechnicals: parseVerdictParam(searchParams.get("minTech"), DEFAULT_MIN_VERDICT),
  };
}

const VOL_WINDOW = 20;
const MIN_CLOSES_REQUIRED = VOL_WINDOW + 1;
const EVAL_CONCURRENCY = 4;
// Usable any time the market's open, so a shorter TTL than the Evaluator tab's 45 minutes
// keeps verdicts from going stale mid-session.
const EVAL_CACHE_TTL_MS = 10 * 60_000;

interface EvalCacheEntry {
  financialsVerdict: StepVerdict;
  financialsScore: number;
  valuationVerdict: StepVerdict;
  valuationScore: number;
  technicalsVerdict: StepVerdict;
  technicalsScore: number;
  compositeScore: number;
  compositeVerdict: StepVerdict;
  computedAt: number;
}

const evalCache = new Map<string, EvalCacheEntry>();

function stddev(returns: number[]): number {
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

function fmtPct(x: number): string {
  return `${x >= 0 ? "+" : ""}${x.toFixed(2)}%`;
}

export async function GET(request: Request) {
  try {
    const filters = parseFilters(new URL(request.url).searchParams);
    const [{ bySymbol, dates }, evalBars] = await Promise.all([loadBarSet(), loadEvaluationBars()]);
    if (dates.length < 2) {
      return NextResponse.json({ error: "Not enough historical bar data available yet" }, { status: 503 });
    }
    const sessionDate = dates[dates.length - 1];

    interface Row {
      symbol: string;
      nodeId: string;
      name: string;
      layer: string;
      price: number;
      changePct: number;
      offHighPct: number;
      dayRangePct: number;
      trailingStdDevPct: number | null;
      zScore: number | null;
    }

    const rows: Row[] = [];
    const seen = new Set<string>();
    for (const t of allTickerRows) {
      if (!t.isUS || seen.has(t.symbol)) continue;
      const bars = bySymbol.get(t.symbol);
      if (!bars || bars.length < 2) continue;
      seen.add(t.symbol);
      const latest = bars[bars.length - 1];
      const prev = bars[bars.length - 2];
      if (prev.c === 0 || latest.c <= 0 || latest.h <= 0) continue;

      const closes = bars.map((b) => b.c);
      let trailingStdDevPct: number | null = null;
      if (closes.length >= MIN_CLOSES_REQUIRED) {
        const window = closes.slice(-MIN_CLOSES_REQUIRED);
        const rets: number[] = [];
        for (let i = 1; i < window.length; i++) {
          if (window[i - 1] === 0) continue;
          rets.push(((window[i] - window[i - 1]) / window[i - 1]) * 100);
        }
        if (rets.length >= VOL_WINDOW - 2) trailingStdDevPct = stddev(rets);
      }

      const { name, layer } = nodeMeta(t.nodeId);
      const changePct = ((latest.c - prev.c) / prev.c) * 100;
      rows.push({
        symbol: t.symbol,
        nodeId: t.nodeId,
        name,
        layer,
        price: latest.c,
        changePct,
        offHighPct: ((latest.c - latest.h) / latest.h) * 100,
        dayRangePct: ((latest.h - latest.l) / latest.c) * 100,
        trailingStdDevPct,
        zScore: trailingStdDevPct && trailingStdDevPct > 0 ? changePct / trailingStdDevPct : null,
      });
    }

    // Two drop bases, reader's choice: a flat % (simple, but treats a volatile tech name's
    // routine daily noise the same as a genuinely unusual move in a quiet one) or a z-score
    // (today's move relative to the stock's OWN 20-day volatility — the same normalization
    // the Opportunities tab already uses, and the more statistically honest "this is actually
    // unusual for this stock" read). z-score mode skips any symbol with insufficient history
    // to compute one, since there's nothing to normalize against.
    const dropped =
      filters.dropBasis === "zscore"
        ? rows.filter((r) => r.zScore !== null && r.zScore <= -filters.minZScore)
        : rows.filter((r) => r.changePct <= -filters.minDropPct);

    type EvalOutcome =
      | { kind: "candidate"; candidate: ClosingCandidate }
      | { kind: "excluded"; reason: "data-gap" | "quality" }
      | { kind: "error" };

    const outcomes = await mapWithConcurrency(dropped, EVAL_CONCURRENCY, async (r): Promise<EvalOutcome> => {
      try {
        const cached = evalCache.get(r.symbol);
        let entry: EvalCacheEntry | null = null;
        if (cached && Date.now() - cached.computedAt < EVAL_CACHE_TTL_MS) {
          entry = cached;
        } else {
          const bars = evalBars.get(r.symbol.toUpperCase()) ?? [];
          const result = await evaluateSymbol(r.symbol, bars, LIVE_FUNDAMENTALS_ONLY_OPTIONS);
          const byStep = new Map(result.steps.map((s) => [s.step, s]));
          const fin = byStep.get(3);
          const val = byStep.get(4);
          const tech = byStep.get(6);
          entry = {
            financialsVerdict: fin?.verdict ?? "unknown",
            financialsScore: fin?.score ?? 2.5,
            valuationVerdict: val?.verdict ?? "unknown",
            valuationScore: val?.score ?? 2.5,
            technicalsVerdict: tech?.verdict ?? "unknown",
            technicalsScore: tech?.score ?? 2.5,
            compositeScore: result.compositeScore,
            compositeVerdict: result.compositeVerdict,
            computedAt: Date.now(),
          };
          evalCache.set(r.symbol, entry);
        }

        const hasDataGap =
          entry.financialsVerdict === "unknown" || entry.valuationVerdict === "unknown" || entry.technicalsVerdict === "unknown";

        const passes =
          VERDICT_RANK[entry.financialsVerdict] >= VERDICT_RANK[filters.minFundamentals] &&
          VERDICT_RANK[entry.valuationVerdict] >= VERDICT_RANK[filters.minValuation] &&
          VERDICT_RANK[entry.technicalsVerdict] >= VERDICT_RANK[filters.minTechnicals];

        if (!passes) return { kind: "excluded", reason: hasDataGap ? "data-gap" : "quality" };

        const reasons = [
          `Down ${fmtPct(r.changePct)} in the session${r.zScore !== null ? ` (${r.zScore.toFixed(1)}σ vs its own 20-day volatility)` : ""}${r.offHighPct <= -0.5 ? `, fading ${fmtPct(r.offHighPct)} off the day high` : ""} (intraday range ${r.dayRangePct.toFixed(1)}%)`,
          `Fundamentals read ${entry.financialsVerdict} (${entry.financialsScore.toFixed(1)}/5 on financial-statement quality)`,
          `Valuation reads ${entry.valuationVerdict} (${entry.valuationScore.toFixed(1)}/5 — not just a quality dip, not obviously overpriced for it either)`,
          `Technicals read ${entry.technicalsVerdict} (${entry.technicalsScore.toFixed(1)}/5 on chart/indicators)`,
        ];

        return {
          kind: "candidate",
          candidate: {
            symbol: r.symbol,
            nodeId: r.nodeId,
            name: r.name,
            layer: r.layer,
            price: r.price,
            changePct: r.changePct,
            offHighPct: r.offHighPct,
            dayRangePct: r.dayRangePct,
            zScore: r.zScore,
            financialsVerdict: entry.financialsVerdict,
            financialsScore: entry.financialsScore,
            valuationVerdict: entry.valuationVerdict,
            valuationScore: entry.valuationScore,
            technicalsVerdict: entry.technicalsVerdict,
            technicalsScore: entry.technicalsScore,
            compositeScore: entry.compositeScore,
            compositeVerdict: entry.compositeVerdict,
            trailingStdDevPct: r.trailingStdDevPct,
            reasons,
          },
        };
      } catch {
        return { kind: "error" };
      }
    });

    const candidates = (
      outcomes.filter((o): o is { kind: "candidate"; candidate: ClosingCandidate } => o.kind === "candidate").map((o) => o.candidate)
    ).sort((a, b) => b.compositeScore - a.compositeScore || a.changePct - b.changePct); // deeper dip breaks ties

    const excludedForDataGap = outcomes.filter((o) => o.kind === "excluded" && o.reason === "data-gap").length;
    const excludedForQuality = outcomes.filter((o) => o.kind === "excluded" && o.reason === "quality").length;

    const response: ClosingResponse = {
      asOf: new Date().toISOString(),
      sessionDate,
      evaluated: rows.length,
      dropped: dropped.length,
      candidates,
      excludedForDataGap,
      excludedForQuality,
      filters,
    };
    return NextResponse.json(response);
  } catch (err) {
    const status = err instanceof AlpacaError ? err.status ?? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error building closing candidates" },
      { status }
    );
  }
}
