// "Technical range" for the Markets tab — a price band derived purely from chart/technical
// metrics, as a separate column alongside the fundamentals-only range in entryRange.ts.
// Deliberately kept apart rather than blended into one number, so a reader can tell whether
// a "good entry" read is coming from the business's numbers or from its chart — they can
// (and often do) disagree, and that disagreement is itself informative.
//
// Unlike the fundamental range, this needs no external API calls — it's pure arithmetic over
// the same daily bars /api/entry-range already has loaded — so it's computed fresh on every
// request instead of cached 24h; there's no batching/rate-limit concern to manage here.
//
// Methodology: anchor on the 20-day Bollinger lower band (the standard technical
// mean-reversion "oversold" reference — see src/lib/indicators.ts's bollinger()), then shift
// that anchor by up to 10% using Step 6's own technicals score (trend vs SMA50/200,
// golden/death cross, RSI exhaustion, volume confirmation — see scoreTechnicals.ts): a
// stock already reading technically strong needs less of a pullback to count as a
// reasonable entry, a weak one needs more. Then take a tight +-8% band around that anchor.
//
// Critical detail: `bars`' last entry can be TODAY's still-forming session (loadBarSet()
// pulls daily bars up through "now," and Alpaca's current-day bar updates live during market
// hours — see /api/closing's own notes on this). Computing the Bollinger band and technicals
// score from bars that include today's own move means today's rally/selloff drags the very
// reference line it's being compared against, making "touched its support band" trivially
// true on almost every up day (observed in production: nearly every row showed "touched"
// regardless of direction). To keep the reference a genuine PRIOR benchmark, both the
// Bollinger calc and the technicals score here deliberately use bars through yesterday's
// close only — excluding the last bar — never today's. (Step 6 elsewhere in the app
// intentionally includes today's bar, since "what do today's technicals look like right
// now" is a different, valid question; this is specifically about not judging today's move
// against a line partly drawn from today's own move.)

import type { Bar } from "@/lib/indicators";
import { bollinger } from "@/lib/indicators";
import { scoreTechnicals } from "./scoreTechnicals";
import type { StepVerdict } from "./types";

const MIN_BARS = 30; // matches scoreTechnicals.ts's own floor for a meaningful read
const TECH_ANCHOR_SWING = 0.1;
const ENTRY_BAND_HALF_WIDTH = 0.08;

export interface TechnicalRange {
  symbol: string;
  bollingerLower: number;
  bollingerUpper: number;
  priceLow: number;
  priceHigh: number;
  technicalsScore: number;
  technicalsVerdict: StepVerdict;
}

export function computeTechnicalRange(symbol: string, bars: Bar[]): TechnicalRange | null {
  // Drop the last (possibly still-forming) bar — see the file header. `bars` is expected
  // sorted ascending, as loadBarSet() returns it.
  const referenceBars = bars.slice(0, -1);
  if (referenceBars.length < MIN_BARS) return null;
  const closes = referenceBars.map((b) => b.c);
  const boll = bollinger(closes, 20, 2);
  if (!boll || boll.lower <= 0) return null;

  const tech = scoreTechnicals(symbol, referenceBars);
  const techFactor = (tech.score - 2.5) / 2.5; // -1..+1
  const anchor = boll.lower * (1 + techFactor * TECH_ANCHOR_SWING);
  if (anchor <= 0) return null;

  return {
    symbol: symbol.toUpperCase(),
    bollingerLower: boll.lower,
    bollingerUpper: boll.upper,
    priceLow: anchor * (1 - ENTRY_BAND_HALF_WIDTH),
    priceHigh: anchor * (1 + ENTRY_BAND_HALF_WIDTH),
    technicalsScore: tech.score,
    technicalsVerdict: tech.verdict,
  };
}
