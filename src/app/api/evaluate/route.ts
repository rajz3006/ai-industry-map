import { NextResponse } from "next/server";
import { allUSSymbols } from "@/data/tickers";
import { mapWithConcurrency } from "@/lib/finnhub";
import { AlpacaError } from "@/lib/alpaca";
import { evaluateSymbol } from "@/lib/evaluation/score";
import { loadEvaluationBars } from "@/lib/evaluation/evalBars";
import type { EvaluationResult } from "@/lib/evaluation/types";

// Defense in depth for the serverless execution ceiling on Vercel: bulk mode now runs the
// "fast" preview path (see computeEvaluation below), which measured well under this limit for
// all 57 symbols, but cap it explicitly anyway. NOTE for future maintainers: 60s is already at
// or past Vercel's Hobby-plan ceiling for serverless functions (Hobby tops out around 10-60s
// depending on config) — don't raise this further without first confirming the deployment's
// actual plan/tier allows it; Pro plans allow higher ceilings but still require this export to
// opt in.
export const maxDuration = 60;

// Caching/concurrency rationale (see src/lib/evaluation/README.md and the per-step scoring
// modules for the underlying provider behavior):
//
// - Fundamentals (FMP), moat/industry research, and even most management/news signals don't
//   change intraday, so a 45-minute in-process TTL cache keeps the Evaluator tab responsive
//   without re-hitting FMP/Finnhub/SEC EDGAR/Alpaca on every click — chosen in the middle of
//   the 30-60 min range this feature's spec called reasonable for the bulk composite cache.
// - Bulk mode runs a "fast" preview evaluation (evaluateSymbol(..., {fast: true})) that skips
//   only the expensive per-Form-4 XML insider-cluster lookup inside Steps 5/7 (see
//   managementSignals.ts, scoreManagement.ts, scoreNews.ts) — that N+1-per-symbol XML fetch,
//   repeated across 57 symbols, was measured at ~182s for the whole bulk request before this
//   fix, which would blow past Vercel's serverless execution ceiling. Single-symbol detail mode
//   always runs the full 8-step evaluation ({fast: false}), since a per-row click can afford
//   the real lookup and the user explicitly wants the complete read.
// - Fast and full results differ (fast is missing Step 5's real signal and Step 7's insider
//   bonus — see score.ts), so they are cached SEPARATELY, keyed by `${symbol}:${mode}`. A
//   full-mode request must never be silently satisfied by a fast-mode cache entry — that would
//   serve an incomplete result where the user expects the full 8-step detail.
// - Computing the full 8-step evaluation for all 57 symbols on every bulk request would still be
//   slow and rate-limit-risky even with the fast path (each symbol still hits FMP + Finnhub(x2)
//   + SEC EDGAR for 8-K items + a shared Alpaca multi-bar fetch), so the bulk path runs through
//   mapWithConcurrency with a bounded concurrency of 4 — matching src/app/api/filings/route.ts's
//   SYMBOL_CONCURRENCY.
const CACHE_TTL_MS = 45 * 60_000;
const BULK_CONCURRENCY = 4;

type EvalMode = "fast" | "full";

interface CacheEntry {
  result: EvaluationResult;
  computedAt: number;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<EvaluationResult>>();

function cacheKey(symbol: string, mode: EvalMode): string {
  return `${symbol}:${mode}`;
}

async function computeEvaluation(symbol: string, mode: EvalMode): Promise<EvaluationResult> {
  // loadEvaluationBars() fetches/caches ALL 57 symbols' bars in one batched Alpaca request (see
  // evalBars.ts), so this is cheap even when called once per symbol across a bulk pass — only
  // the first caller in a given 30-minute window actually hits the network.
  const bySymbol = await loadEvaluationBars().catch(() => new Map<string, never>());
  const bars = bySymbol.get(symbol.toUpperCase()) ?? [];
  return evaluateSymbol(symbol, bars, { fast: mode === "fast" });
}

/** Shared cache both the single-symbol detail mode and the bulk mode call into, keyed by
 * `${symbol}:${mode}` so a fast/preview result never satisfies a full-detail request (and vice
 * versa). Coalesces concurrent requests for the same symbol+mode (e.g. a bulk pass and a
 * simultaneous detail click) onto one in-flight computation rather than duplicating provider
 * calls. */
async function getOrComputeEvaluation(symbol: string, mode: EvalMode): Promise<EvaluationResult> {
  const sym = symbol.toUpperCase();
  const key = cacheKey(sym, mode);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.computedAt < CACHE_TTL_MS) return cached.result;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = computeEvaluation(sym, mode)
    .then((result) => {
      cache.set(key, { result, computedAt: Date.now() });
      return result;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, promise);
  return promise;
}

export interface BulkEvaluationRow {
  symbol: string;
  compositeScore: number;
  compositeVerdict: EvaluationResult["compositeVerdict"];
  riskReward: EvaluationResult["riskReward"];
  asOf: string;
}

/**
 * GET /api/evaluate?symbol=XXX -> full EvaluationResult JSON for that one symbol (this is the
 * exact shape+param name src/components/StockEvaluator.tsx's fetchEvaluation() calls).
 * GET /api/evaluate (no `symbol`) or ?symbols=all -> BulkEvaluationRow[] covering all 57
 * symbols in src/data/tickers.ts's allUSSymbols, for the table's at-a-glance Score/Verdict
 * columns without a per-row click.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolParam = searchParams.get("symbol");

  try {
    if (symbolParam) {
      const symbol = symbolParam.toUpperCase();
      if (!allUSSymbols.includes(symbol)) {
        return NextResponse.json({ error: `Unknown symbol: ${symbol}` }, { status: 404 });
      }
      const result = await getOrComputeEvaluation(symbol, "full");
      return NextResponse.json(result);
    }

    // Bulk/lightweight mode: no `symbol` param, or `symbols=all` (the only documented value).
    const results = await mapWithConcurrency(allUSSymbols, BULK_CONCURRENCY, async (symbol): Promise<EvaluationResult> => {
      try {
        return await getOrComputeEvaluation(symbol, "fast");
      } catch (err) {
        // One symbol's total failure shouldn't take down the whole bulk response — surface it
        // as an honest "unknown" row instead of dropping it or 500ing the whole request.
        return {
          symbol,
          asOf: new Date().toISOString(),
          compositeScore: 2.5,
          compositeVerdict: "unknown",
          riskReward: null,
          steps: [],
          dataWarnings: [`Evaluation failed for ${symbol}: ${err instanceof Error ? err.message : String(err)}`],
        };
      }
    });

    const rows: BulkEvaluationRow[] = results.map((r) => ({
      symbol: r.symbol,
      compositeScore: r.compositeScore,
      compositeVerdict: r.compositeVerdict,
      riskReward: r.riskReward,
      asOf: r.asOf,
    }));

    return NextResponse.json(rows);
  } catch (err) {
    const status = err instanceof AlpacaError ? err.status ?? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error computing evaluation" },
      { status }
    );
  }
}
