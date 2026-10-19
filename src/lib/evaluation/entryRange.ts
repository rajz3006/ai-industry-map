// "Fundamental range" for the Markets tab: a fair-value price band computed purely from a
// company's own numbers — financial-statement quality (Step 3), its valuation multiple
// (Step 4's raw P/E or P/S, not the Step 4 verdict itself), and news/market context (Step
// 7) — explicitly excluding moat/industry (Steps 1-2, qualitative), management (Step 5),
// chart technicals, and composite/risk-reward (Step 8, that's position sizing, a Trade Desk
// concern). Chart technicals get their OWN separate, purely-metrics-based range instead —
// see technicalRange.ts — rather than being blended into this one, so a reader can tell
// whether a "good entry" read is coming from the business's numbers or from its chart. This
// does NOT replace Step 4's verdict or the Evaluator tab's methodology — it's a separate,
// simpler derived signal for "what price would this be a reasonable entry at," independent
// of any stop/target/risk-sizing math.
//
// Methodology (a documented heuristic, not a valuation model — see the Markets tab's own
// disclaimer copy):
//   1. Start from the midpoint of the same "typical" multiple band scoreValuation.ts already
//      cites (15x-30x trailing P/E for a profitable company -> midpoint 22.5x; 2x-8x P/S for
//      one that isn't -> midpoint 5x) as a single fair-multiple anchor, not a band — a 15x-30x
//      SPAN used directly as the "entry range" would mean the price could double before
//      leaving it, which isn't a usable entry zone.
//   2. Move that anchor up or down by up to 30% based on financial-statement quality (Step
//      3's 0-5 score) — a higher-quality business earns a richer "fair" multiple, a weaker
//      one a cheaper one. At the extremes this still lands roughly inside the original
//      15x-30x/2x-8x band, just as a point rather than its full span.
//   3. Move it a further 15% based on news/market context (Step 7's 0-5 score) — bad recent
//      news (SEC red flags, a thin/negative coverage read) demands a bigger discount before
//      the price looks like a reasonable entry; good news needs less of one.
//   4. Build a narrow +-10% band around that single adjusted anchor — the actual "entry
//      range" — and convert it to a dollar price range using the company's own implied
//      per-share earnings/revenue (today's close / today's multiple — algebraically the same
//      number FMP/Finnhub would report as trailing EPS or revenue/share, derived without a
//      separate fetch). That implied per-share figure barely moves day to day, so the
//      resulting price range stays valid as a reference all session even though it's
//      computed once.
//   5. Sanity-check the result against the current price (see MAX_ANCHOR_DIVERGENCE below):
//      a cyclical business at a temporary trailing-earnings peak (e.g. a memory-chip maker
//      mid-upcycle) can have an artificially LOW trailing P/E, which inflates the implied
//      EPS this math backs out of it, and multiplying that inflated EPS by a "normal"
//      multiple produces a price divorced from reality (observed in production: Micron's
//      range came out ~$1,860-$2,280 against an actual price around $900). Rather than show
//      a number implying a 50%+ move just to reach it, this returns unavailable instead — an
//      honest "can't tell" beats a precise-looking but implausible figure.
//
// Cached 24h per symbol (module-level Map — see AGENTS.md on this app's in-memory cache
// convention; there's no database, so this resets on a cold serverless start, same tradeoff
// every other cache in this app already accepts).

import { getFinnhubFundamentals } from "./finnhubFundamentals";
import { scoreFinancials } from "./scoreFinancials";
import { scoreNews } from "./scoreNews";
import { FULL_EVAL_OPTIONS, type StepVerdict } from "./types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const MID_PE = 22.5; // midpoint of scoreValuation.ts's 15x-30x "typical" trailing P/E band
const MID_PS = 5; // midpoint of its 2x-8x P/S band for unprofitable names
// How far quality/news can move the single fair-multiple anchor, as a fraction of its value.
const QUALITY_ANCHOR_SWING = 0.3;
const NEWS_ANCHOR_SWING = 0.15;
// Half-width of the final price band around that anchor — the actual "entry range" span.
const ENTRY_BAND_HALF_WIDTH = 0.1;
// If the computed range sits more than this far (as a fraction) from the current price on
// its nearest edge, treat the multiple-to-price conversion as unreliable rather than show it.
const MAX_ANCHOR_DIVERGENCE = 0.5;

/** True if `anchorPrice` is inside [low, high], or within MAX_ANCHOR_DIVERGENCE of whichever
 * edge is closer — i.e. the range is still a plausible near-term reference, not a number
 * that would require an implausible move to ever matter. */
function withinPlausibleReach(anchorPrice: number, low: number, high: number): boolean {
  if (anchorPrice >= low && anchorPrice <= high) return true;
  const nearestEdge = anchorPrice < low ? low : high;
  return Math.abs(nearestEdge - anchorPrice) / anchorPrice <= MAX_ANCHOR_DIVERGENCE;
}

export interface FundamentalRange {
  symbol: string;
  metric: "P/E" | "P/S";
  currentMultiple: number;
  fairMultipleLow: number;
  fairMultipleHigh: number;
  priceLow: number;
  priceHigh: number;
  financialsScore: number;
  financialsVerdict: StepVerdict;
  newsScore: number;
  newsVerdict: StepVerdict;
  computedAt: number;
}

interface CacheEntry {
  range: FundamentalRange | null; // null = computed, but no usable multiple to anchor a range on
  computedAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Returns the cached fundamental range for `symbol` if it was computed within the last
 * 24h, otherwise undefined (meaning: not yet computed today, caller should queue it). */
export function getCachedFundamentalRange(symbol: string): CacheEntry | undefined {
  const hit = cache.get(symbol.toUpperCase());
  if (!hit || Date.now() - hit.computedAt >= CACHE_TTL_MS) return undefined;
  return hit;
}

/** Computes (and caches) the fundamental range for one symbol. `anchorPrice` should be a
 * recent close — used only to back out the implied per-share earnings/revenue figure from
 * the live multiple, not as part of the range itself (the range is multiple-based, not a
 * simple markdown off today's price). */
export async function computeFundamentalRange(symbol: string, anchorPrice: number | null): Promise<FundamentalRange | null> {
  const sym = symbol.toUpperCase();

  const [fundamentals, financials, news] = await Promise.all([
    getFinnhubFundamentals(sym, FULL_EVAL_OPTIONS).catch(() => null),
    scoreFinancials(sym, FULL_EVAL_OPTIONS).catch(() => null),
    scoreNews(sym, FULL_EVAL_OPTIONS).catch(() => null),
  ]);

  const financialsScore = financials?.score ?? 2.5;
  const financialsVerdict = financials?.verdict ?? "unknown";
  const newsScore = news?.score ?? 2.5;
  const newsVerdict = news?.verdict ?? "unknown";

  const qualityFactor = (financialsScore - 2.5) / 2.5; // -1..+1
  const newsFactor = (newsScore - 2.5) / 2.5; // -1..+1
  const anchorShift = 1 + qualityFactor * QUALITY_ANCHOR_SWING + newsFactor * NEWS_ANCHOR_SWING;

  function buildRange(metric: "P/E" | "P/S", multiple: number | null, midMultiple: number): FundamentalRange | null {
    if (multiple === null || multiple <= 0 || anchorPrice === null || anchorPrice <= 0) return null;
    const impliedPerShare = anchorPrice / multiple;
    const fairAnchor = midMultiple * anchorShift;
    const fairLow = fairAnchor * (1 - ENTRY_BAND_HALF_WIDTH);
    const fairHigh = fairAnchor * (1 + ENTRY_BAND_HALF_WIDTH);
    if (fairLow <= 0 || fairHigh <= fairLow) return null;
    const priceLow = fairLow * impliedPerShare;
    const priceHigh = fairHigh * impliedPerShare;
    if (!withinPlausibleReach(anchorPrice, priceLow, priceHigh)) return null;
    return {
      symbol: sym,
      metric,
      currentMultiple: multiple,
      fairMultipleLow: fairLow,
      fairMultipleHigh: fairHigh,
      priceLow,
      priceHigh,
      financialsScore,
      financialsVerdict,
      newsScore,
      newsVerdict,
      computedAt: Date.now(),
    };
  }

  const range = buildRange("P/E", fundamentals?.peTTM ?? null, MID_PE) ?? buildRange("P/S", fundamentals?.psTTM ?? null, MID_PS);
  cache.set(sym, { range, computedAt: Date.now() });
  return range;
}
