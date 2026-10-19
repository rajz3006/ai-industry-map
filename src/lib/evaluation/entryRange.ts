// "Fundamental range" for the Markets tab — v2: an intrinsic-value entry band.
//
// What this is: a Buffett/Munger-style answer to "what is this business actually worth
// today, based on its own earnings power?" — computed by the intrinsic-value engine in
// intrinsicValue.ts (owner-earnings DCF + Greenwald EPV + earnings-yield anchor,
// triangulated into a band). No peer multiples anywhere: the only "market" input is the
// risk-free Treasury yield inside the discount rate, which is a required-return input, not
// a comparison.
//
// What this is NOT: the old v1 heuristic (a fixed 22.5x P/E anchor shifted by scores) is
// gone. That approach backed implied EPS out of the live price and multiplied it by an
// assumed multiple — circular, and it produced the implausible Micron-style ranges the
// plausibility guard had to swallow. The v2 engine values the business's cash flows
// directly, so a wide gap between the range and the price is signal (cheap/expensive),
// not a bug to hide.
//
// From intrinsic value to ENTRY range (Graham's margin of safety): the band edges are
// discounted by a margin of safety — 25% base, widened when uncertainty is higher (bad
// news read, high leverage). The tooltip shows the exact MOS used and why.
//
// Trust seal: "verified" = full FMP statement data, healthy balance sheet, no estimation;
// "estimated" = fallback data, estimated inputs, extreme model-implied move, or high
// leverage; "insufficient" (no range shown) = the business has no positive owner earnings
// to value — an honest "cannot be valued on earnings" rather than a sales-multiple guess.
//
// Cached 24h per symbol (module-level Map — same in-memory convention as the rest of the
// app; resets on a cold serverless start).

import { getRiskFreeRate } from "@/lib/fmp";
import { computeIntrinsicValue, MOS_BASE, type IntrinsicValueBreakdown } from "./intrinsicValue";
import { getFundamentals } from "@/lib/fmp";
import { scoreNews } from "./scoreNews";
import { FULL_EVAL_OPTIONS, type StepVerdict } from "./types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const MOS_NEWS_WIDEN = 0.1; // bad news (score < 2) => demand a bigger discount
const MOS_LEVERAGE_WIDEN = 0.05; // net debt > 4x EBITDA => extra cushion
const MOS_CAP = 0.45;
const EXTREME_MOVE_DOWNGRADE = 3; // model implying >3x move either way => seal to "estimated"

export type RangeSeal = "verified" | "estimated";

export interface FundamentalRange {
  symbol: string;
  /** Entry band: what price would be a reasonable entry — IV band after margin of safety. */
  priceLow: number;
  priceHigh: number;
  /** Intrinsic-value band before the margin of safety. */
  ivLow: number;
  ivHigh: number;
  ivBase: number;
  marginOfSafety: number;
  mosReasons: string[];
  seal: RangeSeal;
  /** Full methodology breakdown for the tooltip. */
  breakdown: IntrinsicValueBreakdown;
  newsScore: number;
  newsVerdict: StepVerdict;
  computedAt: number;
}

interface CacheEntry {
  range: FundamentalRange | null; // null = computed, but the business can't be valued on earnings
  computedAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Returns the cached fundamental range for `symbol` if computed within 24h, else undefined. */
export function getCachedFundamentalRange(symbol: string): CacheEntry | undefined {
  const hit = cache.get(symbol.toUpperCase());
  if (!hit || Date.now() - hit.computedAt >= CACHE_TTL_MS) return undefined;
  return hit;
}

/** Computes (and caches) the fundamental range. `anchorPrice` is used only for Finnhub
 * fallbacks and plausibility context — the range itself comes from the company's cash
 * flows, not from today's price. */
export async function computeFundamentalRange(symbol: string, anchorPrice: number | null): Promise<FundamentalRange | null> {
  const sym = symbol.toUpperCase();

  const [riskFree, news, fmp] = await Promise.all([
    getRiskFreeRate().catch(() => ({ rate: 0.045, asOf: null as string | null, source: "assumption" as const })),
    scoreNews(sym, FULL_EVAL_OPTIONS).catch(() => null),
    getFundamentals(sym).catch(() => null),
  ]);

  const newsScore = news?.score ?? 2.5;
  const newsVerdict = news?.verdict ?? "unknown";

  const iv = await computeIntrinsicValue(sym, anchorPrice, riskFree).catch(() => null);
  if (!iv) {
    cache.set(sym, { range: null, computedAt: Date.now() });
    return null;
  }

  // --- Margin of safety ---------------------------------------------------------------
  let mos = MOS_BASE;
  const mosReasons: string[] = [`base ${(MOS_BASE * 100).toFixed(0)}% (Graham's margin-of-safety convention)`];
  if (newsScore < 2) {
    mos += MOS_NEWS_WIDEN;
    mosReasons.push(`+${(MOS_NEWS_WIDEN * 100).toFixed(0)}% — negative news read (score ${newsScore.toFixed(1)}/5) = higher uncertainty`);
  }
  const netDebtToEbitda = fmp?.netDebtToEbitda ?? null;
  if (netDebtToEbitda !== null && netDebtToEbitda > 4) {
    mos += MOS_LEVERAGE_WIDEN;
    mosReasons.push(`+${(MOS_LEVERAGE_WIDEN * 100).toFixed(0)}% — leverage ${netDebtToEbitda.toFixed(1)}x net debt/EBITDA`);
  }
  mos = Math.min(mos, MOS_CAP);

  const priceLow = iv.perShareLow * (1 - mos);
  const priceHigh = iv.perShareHigh * (1 - mos);
  if (!(priceLow > 0 && priceHigh >= priceLow)) {
    cache.set(sym, { range: null, computedAt: Date.now() });
    return null;
  }

  // --- Trust seal -----------------------------------------------------------------------
  let seal: RangeSeal = iv.dataQuality === "full" ? "verified" : "estimated";
  const sealNotes: string[] = [];
  if (iv.dataQuality !== "full") sealNotes.push("fallback data (Finnhub) — not full statements");
  if (netDebtToEbitda !== null && netDebtToEbitda > 4) {
    seal = "estimated";
    sealNotes.push("high leverage — model less certain");
  }
  if (anchorPrice && anchorPrice > 0) {
    const impliedMove = priceHigh < anchorPrice ? anchorPrice / priceHigh : priceLow / anchorPrice;
    if (impliedMove > EXTREME_MOVE_DOWNGRADE) {
      seal = "estimated";
      sealNotes.push(`model implies a >${EXTREME_MOVE_DOWNGRADE}x move — check for one-off earnings or broken growth assumptions`);
    }
  }
  if (iv.warnings.length > 0 && iv.dataQuality === "full") {
    // estimation warnings on otherwise-full data still deserve honesty, but don't fail the seal
    // unless they're material — the tooltip carries them regardless.
  }

  const range: FundamentalRange = {
    symbol: sym,
    priceLow,
    priceHigh,
    ivLow: iv.perShareLow,
    ivHigh: iv.perShareHigh,
    ivBase: iv.perShareBase,
    marginOfSafety: mos,
    mosReasons,
    seal,
    breakdown: { ...iv, warnings: [...iv.warnings, ...sealNotes.map((s) => `Seal note: ${s}`)] },
    newsScore,
    newsVerdict,
    computedAt: Date.now(),
  };
  cache.set(sym, { range, computedAt: Date.now() });
  return range;
}
