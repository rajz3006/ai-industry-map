import { NextResponse } from "next/server";
import { allTickerRows } from "@/data/tickers";
import { loadLongBarSet, isLastBarForming } from "@/lib/moversData";
import { alpacaDataFeed } from "@/lib/alpaca";
import { mapWithConcurrency } from "@/lib/finnhub";
import { computeFundamentalRange, getCachedFundamentalRange, type FundamentalRange } from "@/lib/evaluation/entryRange";
import { computeTechnicalRange, type TechnicalRange } from "@/lib/evaluation/technicalRange";

// Backs the Markets tab's two "entry range" columns.
//
// Fundamental range: the full tracked universe (~90 symbols) is too much to live-compute in
// one request — each symbol costs a Finnhub fundamentals call plus Steps 3 and 7 of the
// evaluation framework (the latter including a per-symbol SEC EDGAR 8-K lookup) — so this
// route computes a bounded batch of whatever's missing or stale per call. The client
// (useEntryRanges) polls on a short interval while any symbols are still pending, so the
// whole universe fills in over a few requests rather than one slow one. Each entry is cached
// 24h (see entryRange.ts), so once a day's batch finishes, nothing recomputes until
// tomorrow — the one caveat being that this is an in-memory cache, not a database, so a
// Vercel cold start resets it (same tradeoff every other cache in this app already accepts).
//
// Technical range: pure arithmetic over daily bars — no external calls, no rate limit to
// manage, so it's computed for every symbol on every request instead of batched/cached.
// Bars come from the LONG bar set (~13 months): the volume profile promises a trailing
// 252 sessions, which the 190-day movers set cannot supply. The forming-bar decision is
// made here (session-aware — a completed session is never dropped) and passed in, and so
// is the Alpaca feed, so volume-derived output can disclose its source.
export const maxDuration = 60;

const BATCH_SIZE_PER_REQUEST = 12;
const CONCURRENCY = 3;

export type FundamentalRangeEntry = { status: "ready"; range: FundamentalRange } | { status: "unavailable" };
export type TechnicalRangeEntry = { status: "ready"; range: TechnicalRange } | { status: "unavailable" };

export interface SymbolRanges {
  // Absent = not yet computed today (still pending in the batch fill).
  fundamental?: FundamentalRangeEntry;
  technical: TechnicalRangeEntry;
}

export interface EntryRangeResponse {
  asOf: string;
  totalSymbols: number;
  /** How many symbols have a fundamental-range verdict (ready or unavailable) so far today —
   * the technical range is always complete, so this is what the client polls to finish. */
  computedToday: number;
  entries: Record<string, SymbolRanges>;
}

export async function GET() {
  try {
    const { bySymbol } = await loadLongBarSet();
    const feed = alpacaDataFeed();
    const symbols = Array.from(new Set(allTickerRows.filter((t) => t.isUS).map((t) => t.symbol)));

    const entries: Record<string, SymbolRanges> = {};
    const pendingFundamentals: string[] = [];
    for (const sym of symbols) {
      const bars = bySymbol.get(sym) ?? [];
      const technicalRange = computeTechnicalRange(sym, bars, {
        dropFormingBar: isLastBarForming(bars),
        feed,
      });
      entries[sym] = { technical: technicalRange ? { status: "ready", range: technicalRange } : { status: "unavailable" } };

      const cached = getCachedFundamentalRange(sym);
      if (cached) {
        entries[sym].fundamental = cached.range ? { status: "ready", range: cached.range } : { status: "unavailable" };
      } else {
        pendingFundamentals.push(sym);
      }
    }

    const toCompute = pendingFundamentals.slice(0, BATCH_SIZE_PER_REQUEST);
    await mapWithConcurrency(toCompute, CONCURRENCY, async (sym) => {
      const bars = bySymbol.get(sym);
      const anchorPrice = bars && bars.length > 0 ? bars[bars.length - 1].c : null;
      try {
        const range = await computeFundamentalRange(sym, anchorPrice);
        entries[sym].fundamental = range ? { status: "ready", range } : { status: "unavailable" };
      } catch {
        entries[sym].fundamental = { status: "unavailable" };
      }
    });

    const computedToday = Object.values(entries).filter((e) => e.fundamental !== undefined).length;

    const response: EntryRangeResponse = {
      asOf: new Date().toISOString(),
      totalSymbols: symbols.length,
      computedToday,
      entries,
    };
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error computing entry ranges" },
      { status: 500 }
    );
  }
}
