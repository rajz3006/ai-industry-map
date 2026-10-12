import { NextResponse } from "next/server";
import { allTickerRows } from "@/data/tickers";
import { loadBarSet, nodeMeta } from "@/lib/moversData";
import { loadEvaluationBars } from "@/lib/evaluation/evalBars";
import { evaluateSymbol } from "@/lib/evaluation/score";
import { mapWithConcurrency } from "@/lib/finnhub";
import { AlpacaError } from "@/lib/alpaca";
import type { StepVerdict } from "@/lib/evaluation/types";

// The end-of-day screen behind the Closing Bell tab: stocks that dropped in today's
// session, filtered to names whose fundamentals (evaluation step 3) and technicals
// (step 6) both read strong/good, ranked by composite quality. This is a screening tool,
// not a recommendation — every candidate carries its reasons so the reader can judge.

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
  financialsVerdict: StepVerdict;
  financialsScore: number;
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
  evaluated: number;
  candidates: ClosingCandidate[];
  /** The filter thresholds actually applied — echoed so the UI can display them. */
  filters: ClosingFilters;
}

export interface ClosingFilters {
  minDropPct: number;
  minFundamentals: StepVerdict;
  minTechnicals: StepVerdict;
}

// Candidate gates — the defaults the tab ships with; the UI lets the reader change them.
const DEFAULT_MIN_DROP_PCT = 1.0; // dropped at least 1% in the session
const DEFAULT_MIN_VERDICT: StepVerdict = "good";

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

function parseVerdictParam(value: string | null): StepVerdict {
  const v = (value ?? "").toLowerCase();
  return VALID_VERDICTS.includes(v as StepVerdict) ? (v as StepVerdict) : DEFAULT_MIN_VERDICT;
}

function parseFilters(searchParams: URLSearchParams): ClosingFilters {
  const rawDrop = Number(searchParams.get("minDrop"));
  const minDropPct =
    Number.isFinite(rawDrop) ? Math.min(50, Math.max(0, rawDrop)) : DEFAULT_MIN_DROP_PCT;
  return {
    minDropPct,
    minFundamentals: parseVerdictParam(searchParams.get("minFund")),
    minTechnicals: parseVerdictParam(searchParams.get("minTech")),
  };
}

const VOL_WINDOW = 20;
const MIN_CLOSES_REQUIRED = VOL_WINDOW + 1;
const EVAL_CONCURRENCY = 4;
// Timing-sensitive near the close, so a shorter TTL than the Evaluator tab's 45 minutes.
const EVAL_CACHE_TTL_MS = 10 * 60_000;

interface EvalCacheEntry {
  financialsVerdict: StepVerdict;
  financialsScore: number;
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
      rows.push({
        symbol: t.symbol,
        nodeId: t.nodeId,
        name,
        layer,
        price: latest.c,
        changePct: ((latest.c - prev.c) / prev.c) * 100,
        offHighPct: ((latest.c - latest.h) / latest.h) * 100,
        dayRangePct: ((latest.h - latest.l) / latest.c) * 100,
        trailingStdDevPct,
      });
    }

    const dropped = rows.filter((r) => r.changePct <= -filters.minDropPct);

    const evaluated = await mapWithConcurrency(dropped, EVAL_CONCURRENCY, async (r): Promise<ClosingCandidate | null> => {
      try {
        const cached = evalCache.get(r.symbol);
        let entry: EvalCacheEntry | null = null;
        if (cached && Date.now() - cached.computedAt < EVAL_CACHE_TTL_MS) {
          entry = cached;
        } else {
          const bars = evalBars.get(r.symbol.toUpperCase()) ?? [];
          const result = await evaluateSymbol(r.symbol, bars, { fast: true });
          const byStep = new Map(result.steps.map((s) => [s.step, s]));
          const fin = byStep.get(3);
          const tech = byStep.get(6);
          entry = {
            financialsVerdict: fin?.verdict ?? "unknown",
            financialsScore: fin?.score ?? 2.5,
            technicalsVerdict: tech?.verdict ?? "unknown",
            technicalsScore: tech?.score ?? 2.5,
            compositeScore: result.compositeScore,
            compositeVerdict: result.compositeVerdict,
            computedAt: Date.now(),
          };
          evalCache.set(r.symbol, entry);
        }

        if (VERDICT_RANK[entry.financialsVerdict] < VERDICT_RANK[filters.minFundamentals]) return null;
        if (VERDICT_RANK[entry.technicalsVerdict] < VERDICT_RANK[filters.minTechnicals]) return null;

        const reasons = [
          `Down ${fmtPct(r.changePct)} in the session${r.offHighPct <= -0.5 ? `, fading ${fmtPct(r.offHighPct)} off the day high` : ""} (intraday range ${r.dayRangePct.toFixed(1)}%)`,
          `Fundamentals read ${entry.financialsVerdict} (${entry.financialsScore.toFixed(1)}/5 on financial-statement quality)`,
          `Technicals read ${entry.technicalsVerdict} (${entry.technicalsScore.toFixed(1)}/5 on chart/indicators)`,
        ];

        return {
          symbol: r.symbol,
          nodeId: r.nodeId,
          name: r.name,
          layer: r.layer,
          price: r.price,
          changePct: r.changePct,
          offHighPct: r.offHighPct,
          dayRangePct: r.dayRangePct,
          financialsVerdict: entry.financialsVerdict,
          financialsScore: entry.financialsScore,
          technicalsVerdict: entry.technicalsVerdict,
          technicalsScore: entry.technicalsScore,
          compositeScore: entry.compositeScore,
          compositeVerdict: entry.compositeVerdict,
          trailingStdDevPct: r.trailingStdDevPct,
          reasons,
        };
      } catch {
        return null;
      }
    });

    // Rank by composite quality (deeper dip breaks ties).
    const candidates = (evaluated.filter(Boolean) as ClosingCandidate[]).sort(
      (a, b) => b.compositeScore - a.compositeScore || a.changePct - b.changePct
    );

    const response: ClosingResponse = {
      asOf: new Date().toISOString(),
      sessionDate,
      evaluated: rows.length,
      candidates,
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
