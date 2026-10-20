// "Technical range" for the Markets tab — v3: an institutional accumulation-zone read.
//
// What this is: "where has real buying interest shown up on this chart?" — answered from
// three independent structure reads, kept separate from the fundamentals column on purpose:
//
//   1. Volume profile: the price levels where the most shares actually changed hands over
//      the trailing 12 months. Each day's volume is DISTRIBUTED across the price bins its
//      high–low range spans (v2 dumped it all into the midpoint bin, which made nodes
//      spikier and less accurate than the seal implied). The highest-volume node BELOW the
//      current price is where institutional-size interest clustered — revealed support.
//   2. Swing lows: recent fractal swing lows (a low that is the lowest of N bars on each
//      side) — the levels where sellers exhausted most recently.
//   3. Anchored VWAP: volume-weighted average price anchored at the most significant recent
//      swing low (tracked by bar INDEX, not by searching the series for a matching price —
//      v2's value search could silently anchor to an older bar with an identical low).
//
// The zone center is the volume-weighted confluence of those three. Then the money-flow
// read shifts it — this is the buyer-vs-seller answer:
//
//   - Chaikin Money Flow (20d): > +0.05 = accumulation (buyers in control), < −0.05 =
//     distribution (sellers in control).
//   - Up/down volume ratio (20d): volume on up-days vs down-days — which side was heavier.
//   - OBV trend (60d): is cumulative money flow rising or falling over a LONGER horizon?
//     v2 read OBV over the same 20 days as the other two, triple-counting one signal;
//     the 60d window is the deliberately independent vote.
//
// Accumulation shifts the zone UP (a technically strong stock needs less of a pullback to
// be a reasonable entry); distribution shifts it DOWN (demand a deeper discount). The shift
// is capped at the SMALLER of 12% and 1× ATR — a percent-only cap meant ~2 ATR of shift for
// a volatile name and ~10 ATR for a quiet one; now the modulation scales with volatility.
// The shifted center is additionally never allowed to sit at/above the current price.
//
// Width comes from ATR(20) — the stock's own recent volatility sets the zone width, not an
// arbitrary percentage.
//
// Zone integrity rules (v3):
// - Only anchors BELOW the current price can form the zone. An anchor at/above price
//   (anchored VWAP in a downtrend, the point of control after a selloff, a swing low the
//   price just broke under) is overhead supply, not support — it's excluded with an
//   explicit warning, and if NOTHING sits below price there is no zone (null), rather
//   than an "entry range" floating above the market.
// - The ✓ verified seal now requires what it claims: a ≥200-session profile, ≥2 clustered
//   anchors, and all three money-flow inputs present. Anything less is "estimated".
//
// Honesty notes (surfaced in tooltips, not buried):
// - Up/down volume is a price×volume PROXY for buyer-vs-seller pressure, not true Level 2
//   order-flow data — this app has no tape feed. Read as "which side was heavier."
// - Volume is only as complete as the Alpaca feed behind it: the caller passes which feed
//   produced the bars and the output discloses it (IEX ≈ 2–3% of consolidated tape; SIP =
//   the full tape). See alpacaDataFeed() in @/lib/alpaca.
// - The reference bars exclude today's still-forming session, so the zone is a genuine
//   PRIOR benchmark — but only when the session is actually still forming. The caller
//   decides (session-aware: isLastBarForming in moversData.ts); a completed session is
//   never dropped, so the zone doesn't lag a day behind every evening and weekend.

import type { Bar } from "@/lib/indicators";
import { atr, chaikinMoneyFlow, obv, upDownVolume } from "@/lib/indicators";

const MIN_BARS = 60; // need enough history for a meaningful volume profile
const PROFILE_BARS = 252; // trailing 12 months for the volume profile
const PROFILE_BINS = 48; // finer than v2's 24 — with range distribution, resolution is real
const FULL_PROFILE_BARS = 200; // below this the profile window is materially short of a year
const FRACTAL_N = 5; // swing-low fractal: lowest of N bars each side
const SWING_LOOKBACK = 90; // look for swing lows in the trailing 90 bars
const OBV_TREND_DAYS = 60; // the longer-horizon money-flow vote (see header)
const MONEY_FLOW_CAP = 0.12; // absolute max zone shift from the money-flow read
const ATR_WIDTH_MULT = 0.75; // zone half-width = 0.75 × ATR(20)

export type MoneyFlowVerdict = "accumulation" | "distribution" | "neutral";

export interface TechnicalRangeOptions {
  /** Drop the final bar because it is today's still-forming session. Decided by the
   * caller, which can see bar timestamps and the session clock; defaults to true to
   * preserve the historical behavior for callers that don't know. */
  dropFormingBar?: boolean;
  /** Which Alpaca feed produced the bars' volume — disclosed in the output lines. */
  feed?: "iex" | "sip";
}

export interface TechnicalRange {
  symbol: string;
  priceLow: number;
  priceHigh: number;
  /** The confluence center the touch logic compares against. */
  referenceLevel: number;
  volumeNode: number | null;
  poc: number | null;
  swingLow: number | null;
  anchoredVwap: number | null;
  atr: number | null;
  cmf: number | null;
  upDownRatio: number | null;
  obvTrend: "rising" | "falling" | "flat" | null;
  moneyFlow: MoneyFlowVerdict;
  moneyFlowScore: number; // -1..1
  zoneShift: number; // applied shift, as a fraction
  profileBars: number; // sessions the volume profile actually covered
  seal: "verified" | "estimated";
  /** Human-readable lines for the tooltip — every input that moved the number. */
  lines: string[];
  warnings: string[];
}

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

interface SwingLow {
  level: number;
  index: number; // bar index of the low — the AVWAP anchor, tracked directly
}

/** Fractal swing lows: bar i is a swing low if its low is the lowest of FRACTAL_N bars
 * on each side. Returns the most recent ones (up to `maxCount`), newest first. */
function fractalSwingLows(bars: Bar[], maxCount = 3): SwingLow[] {
  const out: SwingLow[] = [];
  const start = Math.max(FRACTAL_N, bars.length - SWING_LOOKBACK);
  for (let i = bars.length - 1 - FRACTAL_N; i >= start; i--) {
    let isLow = true;
    for (let j = i - FRACTAL_N; j <= i + FRACTAL_N; j++) {
      if (j === i || j < 0 || j >= bars.length) continue;
      if (bars[j].l < bars[i].l) { isLow = false; break; }
    }
    if (isLow) {
      out.push({ level: bars[i].l, index: i });
      if (out.length >= maxCount) break;
    }
  }
  return out;
}

/** Volume profile over the trailing bars: each bar's volume is distributed across the
 * price bins its high–low range overlaps, in proportion to the overlap — the standard
 * daily-bar approximation of an intraday profile. Returns the point of control
 * (highest-volume price), the highest-volume node below `refPrice`, and how many
 * sessions actually went into the profile. */
function volumeProfile(bars: Bar[], refPrice: number): { poc: number | null; supportNode: number | null; barsUsed: number } {
  const slice = bars.slice(-PROFILE_BARS);
  if (slice.length < MIN_BARS) return { poc: null, supportNode: null, barsUsed: slice.length };
  let lo = Infinity, hi = -Infinity;
  for (const b of slice) { if (b.l < lo) lo = b.l; if (b.h > hi) hi = b.h; }
  if (!(hi > lo)) return { poc: null, supportNode: null, barsUsed: slice.length };
  const bins = new Array<number>(PROFILE_BINS).fill(0);
  const width = (hi - lo) / PROFILE_BINS;
  for (const b of slice) {
    const vol = b.v || 0;
    if (vol <= 0) continue;
    if (b.h <= b.l) {
      const idx = Math.min(PROFILE_BINS - 1, Math.max(0, Math.floor((b.l - lo) / width)));
      bins[idx] += vol;
      continue;
    }
    const first = Math.max(0, Math.floor((b.l - lo) / width));
    const last = Math.min(PROFILE_BINS - 1, Math.floor((b.h - lo) / width));
    for (let i = first; i <= last; i++) {
      const binLo = lo + i * width;
      const binHi = binLo + width;
      const overlap = Math.min(b.h, binHi) - Math.max(b.l, binLo);
      if (overlap > 0) bins[i] += vol * (overlap / (b.h - b.l));
    }
  }
  const center = (i: number) => lo + (i + 0.5) * width;
  let pocIdx = 0;
  for (let i = 1; i < PROFILE_BINS; i++) if (bins[i] > bins[pocIdx]) pocIdx = i;
  let nodeIdx = -1;
  for (let i = 0; i < PROFILE_BINS; i++) {
    if (center(i) < refPrice && (nodeIdx === -1 || bins[i] > bins[nodeIdx])) nodeIdx = i;
  }
  return {
    poc: center(pocIdx),
    supportNode: nodeIdx === -1 ? null : center(nodeIdx),
    barsUsed: slice.length,
  };
}

/** Anchored VWAP from bar index `anchorIdx` to the end. */
function anchoredVwap(bars: Bar[], anchorIdx: number): number | null {
  let pv = 0, v = 0;
  for (let i = Math.max(0, anchorIdx); i < bars.length; i++) {
    const tp = (bars[i].h + bars[i].l + bars[i].c) / 3;
    const vol = bars[i].v || 0;
    pv += tp * vol;
    v += vol;
  }
  return v > 0 ? pv / v : null;
}

export function computeTechnicalRange(symbol: string, bars: Bar[], options?: TechnicalRangeOptions): TechnicalRange | null {
  // Drop the last bar only when the caller says it's today's still-forming session — the
  // zone must be a PRIOR benchmark, but a completed session is a legitimate benchmark.
  const ref = options?.dropFormingBar === false ? bars.slice() : bars.slice(0, -1);
  if (ref.length < MIN_BARS) return null;
  const sym = symbol.toUpperCase();
  const lines: string[] = [];
  const warnings: string[] = [];
  const lastClose = ref[ref.length - 1].c;

  // --- Structure: volume profile, swing lows, anchored VWAP --------------------------------
  const { poc, supportNode, barsUsed: profileBars } = volumeProfile(ref, lastClose);
  const swings = fractalSwingLows(ref);
  const swingLow = swings.length > 0 ? swings[0].level : null;
  // Anchor VWAP at the lowest swing low in the window (the most significant recent base),
  // using the bar index recorded when the fractal was found.
  let vwap: number | null = null;
  if (swings.length > 0) {
    const anchor = swings.reduce((a, b) => (b.level < a.level ? b : a));
    vwap = anchoredVwap(ref, anchor.index);
  }

  const allAnchors: { level: number; weight: number; label: string }[] = [];
  if (supportNode !== null) allAnchors.push({ level: supportNode, weight: 3, label: "volume node" });
  if (swingLow !== null) allAnchors.push({ level: swingLow, weight: 2, label: "swing low" });
  if (vwap !== null) allAnchors.push({ level: vwap, weight: 2, label: "anchored VWAP" });
  if (poc !== null) allAnchors.push({ level: poc, weight: 1, label: "point of control" });

  // Only structure BELOW the current price can be an entry zone. Anything at/above price
  // is overhead supply (resistance), not support — exclude it, say so, and if nothing is
  // left below price there is honestly no accumulation zone to show.
  const anchors = allAnchors.filter((a) => a.level < lastClose);
  for (const a of allAnchors) {
    if (a.level >= lastClose) {
      warnings.push(`${a.label} ${fmtMoney(a.level)} sits at/above the current price — overhead supply, not support; excluded from the zone.`);
    }
  }
  if (anchors.length === 0) return null;

  // Confluence clustering: the zone is where independent reads AGREE. An anchor sitting far
  // from the rest (e.g. a volume node from a base built months ago, 30% below today's
  // structure) is stale structure, not near-term support — drop it from the center with an
  // explicit warning rather than letting it drag the zone somewhere untradable. Cluster
  // tolerance scales with the stock's own volatility (2 × ATR).
  const atrEarly = atr(ref, 20);
  const clusterTol = atrEarly !== null && atrEarly > 0 ? atrEarly * 2 : lastClose * 0.1;
  const sorted = [...anchors].sort((a, b) => a.level - b.level);
  let best: typeof anchors = [sorted[0]];
  let bestWeight = sorted[0].weight;
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i; j < sorted.length; j++) {
      if (sorted[j].level - sorted[i].level > clusterTol) break;
      const cluster = sorted.slice(i, j + 1);
      const w = cluster.reduce((s, a) => s + a.weight, 0);
      if (w > bestWeight) { best = cluster; bestWeight = w; }
    }
  }
  const dropped = anchors.filter((a) => !best.includes(a));
  for (const d of dropped) {
    warnings.push(`${d.label} ${fmtMoney(d.level)} sits outside the confluence cluster — treated as stale structure, excluded from the zone center.`);
  }
  const cluster = best.length > 0 ? best : anchors;

  let wSum = 0, lvSum = 0;
  for (const a of cluster) { lvSum += a.level * a.weight; wSum += a.weight; }
  const confluence = lvSum / wSum;
  lines.push(`Confluence ${fmtMoney(confluence)} from ${cluster.map((a) => `${a.label} ${fmtMoney(a.level)}`).join(", ")}`);
  lines.push(`Volume profile over ${profileBars} sessions (~${Math.round(profileBars / 21)} months), each day's volume distributed across its high–low range`);
  if (supportNode !== null) lines.push(`Highest-volume node below price: ${fmtMoney(supportNode)} — where the most shares changed hands`);
  if (poc !== null) lines.push(`Point of control: ${fmtMoney(poc)}`);
  if (options?.feed === "iex") {
    warnings.push("Volume source: IEX exchange feed only (~2–3% of consolidated tape) — volume-derived levels are indicative, not full-market.");
  } else if (options?.feed === "sip") {
    lines.push("Volume source: SIP consolidated tape (all US exchanges).");
  }

  // --- Money flow: buyer vs seller ----------------------------------------------------------
  const cmfArr = chaikinMoneyFlow(ref, 20);
  const cmf = cmfArr.length > 0 ? cmfArr[cmfArr.length - 1] : null;
  const udv = upDownVolume(ref, 20);
  const obvArr = obv(ref);
  let obvTrend: TechnicalRange["obvTrend"] = null;
  if (obvArr.length >= OBV_TREND_DAYS + 1) {
    const recent = obvArr[obvArr.length - 1];
    const past = obvArr[obvArr.length - 1 - OBV_TREND_DAYS];
    obvTrend = recent > past ? "rising" : recent < past ? "falling" : "flat";
  }

  // Composite money-flow score: CMF and up/down volume are correlated short-window (20d)
  // reads and are presented as such; the OBV trend over 60d is the independent vote.
  let score = 0, votes = 0;
  if (cmf !== null) {
    score += Math.max(-1, Math.min(1, cmf / 0.2));
    votes++;
    lines.push(`Chaikin Money Flow (20d): ${cmf >= 0 ? "+" : ""}${cmf.toFixed(3)} ${cmf > 0.05 ? "(accumulation — buyers in control)" : cmf < -0.05 ? "(distribution — sellers in control)" : "(neutral)"}`);
  } else {
    warnings.push("Chaikin Money Flow unavailable.");
  }
  if (udv.ratio !== 1 || udv.upVolume > 0 || udv.downVolume > 0) {
    const uv = udv.ratio === Infinity ? 1 : Math.max(-1, Math.min(1, (udv.ratio - 1) / 1.5));
    score += uv;
    votes++;
    const ratioStr = udv.ratio === Infinity ? "∞" : udv.ratio.toFixed(2);
    lines.push(`Up/down volume (20d): ${ratioStr}x ${udv.ratio > 1.2 ? "(buyers heavier)" : udv.ratio < 0.8 ? "(sellers heavier)" : "(balanced)"} — price×volume proxy, not true order-flow data`);
  }
  if (obvTrend !== null) {
    score += obvTrend === "rising" ? 1 : obvTrend === "falling" ? -1 : 0;
    votes++;
    lines.push(`On-Balance Volume trend (60d): ${obvTrend}`);
  }
  const moneyFlowScore = votes > 0 ? score / votes : 0;
  const moneyFlow: MoneyFlowVerdict = moneyFlowScore > 0.25 ? "accumulation" : moneyFlowScore < -0.25 ? "distribution" : "neutral";
  lines.push(`Money-flow read: ${moneyFlow} (composite score ${moneyFlowScore >= 0 ? "+" : ""}${moneyFlowScore.toFixed(2)})`);

  // Shift cap: the smaller of the absolute 12% cap and 1× ATR as a fraction of price, so
  // the modulation represents the same amount of "the stock's own movement" for every name.
  const atrVal = atrEarly;
  const atrPct = atrVal !== null && atrVal > 0 && lastClose > 0 ? atrVal / lastClose : null;
  const shiftCap = atrPct !== null ? Math.min(MONEY_FLOW_CAP, atrPct) : MONEY_FLOW_CAP;
  const zoneShift = Math.max(-shiftCap, Math.min(shiftCap, moneyFlowScore * shiftCap));
  let center = confluence * (1 + zoneShift);
  if (zoneShift !== 0) {
    lines.push(`Zone shifted ${(zoneShift * 100).toFixed(1)}% ${zoneShift > 0 ? "up (accumulation — less pullback needed)" : "down (distribution — demanding a deeper discount)"}${shiftCap < MONEY_FLOW_CAP ? ` — shift capped at 1× ATR (${(shiftCap * 100).toFixed(1)}%) so it scales with volatility` : ""}`);
  }
  // An entry zone's center never sits at/above the market, however strong accumulation is.
  if (center >= lastClose) {
    center = lastClose * 0.99;
    warnings.push("Money-flow shift capped at the current price — the accumulation zone already reaches the market.");
  }

  // --- Width from ATR ------------------------------------------------------------------------
  const halfWidth = atrVal !== null && atrVal > 0 ? atrVal * ATR_WIDTH_MULT : center * 0.05;
  if (atrVal !== null && atrVal > 0) {
    lines.push(`Zone width ±${fmtMoney(halfWidth)} = 0.75 × ATR(20) ${fmtMoney(atrVal)} (the stock's own volatility sets the width)`);
  } else {
    warnings.push("ATR unavailable — fell back to ±5% width.");
  }

  const priceLow = center - halfWidth;
  const priceHigh = center + halfWidth;
  if (!(priceLow > 0 && priceHigh >= priceLow)) return null;

  // Verified means the inputs actually support the claim: a near-full-year profile, at
  // least two independent structure anchors in confluence, and all three money-flow reads.
  const seal: TechnicalRange["seal"] =
    cluster.length >= 2 && votes === 3 && profileBars >= FULL_PROFILE_BARS ? "verified" : "estimated";
  if (seal === "estimated") {
    if (profileBars < FULL_PROFILE_BARS) {
      warnings.push(`Volume profile covers ${profileBars} sessions (< ${FULL_PROFILE_BARS}) — shorter than a full year, so the zone is estimated.`);
    }
    warnings.push("Fewer independent anchors/inputs than the verified standard — treat the zone as approximate.");
  }

  return {
    symbol: sym,
    priceLow,
    priceHigh,
    referenceLevel: center,
    volumeNode: supportNode,
    poc,
    swingLow,
    anchoredVwap: vwap,
    atr: atrVal,
    cmf,
    upDownRatio: udv.ratio === Infinity ? null : udv.ratio,
    obvTrend,
    moneyFlow,
    moneyFlowScore,
    zoneShift,
    profileBars,
    seal,
    lines,
    warnings,
  };
}
