// "Technical range" for the Markets tab — v2: an institutional accumulation-zone read.
//
// What this is: "where has real buying interest shown up on this chart?" — answered from
// three independent structure reads, kept separate from the fundamentals column on purpose:
//
//   1. Volume profile: the price levels where the most shares actually changed hands over
//      the trailing 12 months. The highest-volume node BELOW the current price is where
//      institutional-size interest clustered — the market's own revealed support.
//   2. Swing lows: recent fractal swing lows (a low that is the lowest of N bars on each
//      side) — the levels where sellers exhausted most recently.
//   3. Anchored VWAP: volume-weighted average price anchored at the most significant recent
//      swing low — the institutional benchmark for "what the average buyer since the low
//      paid."
//
// The zone center is the volume-weighted confluence of those three. Then the money-flow
// read shifts it — this is the buyer-vs-seller answer:
//
//   - Chaikin Money Flow (20d): > +0.05 = accumulation (buyers in control), < −0.05 =
//     distribution (sellers in control).
//   - Up/down volume ratio (20d): volume on up-days vs down-days — which side was heavier.
//   - OBV trend (20d): is cumulative money flow rising or falling?
//
// Accumulation shifts the zone UP (a technically strong stock needs less of a pullback to
// be a reasonable entry); distribution shifts it DOWN (demand a deeper discount). The shift
// is capped at ±12% — money flow modulates the zone, it doesn't invent it.
//
// Width comes from ATR(20) — the stock's own recent volatility sets the zone width, not an
// arbitrary percentage.
//
// Honesty notes (surfaced in tooltips, not buried):
// - Up/down volume is a price×volume PROXY for buyer-vs-seller pressure, not true Level 2
//   order-flow data — this app has no tape feed. Read as "which side was heavier."
// - Like v1, the reference bars deliberately exclude today's still-forming session, so the
//   zone is a genuine PRIOR benchmark, never drawn from today's own move.

import type { Bar } from "@/lib/indicators";
import { atr, chaikinMoneyFlow, obv, upDownVolume } from "@/lib/indicators";

const MIN_BARS = 60; // need enough history for a meaningful volume profile
const PROFILE_BARS = 252; // trailing 12 months for the volume profile
const PROFILE_BINS = 24;
const FRACTAL_N = 5; // swing-low fractal: lowest of N bars each side
const SWING_LOOKBACK = 90; // look for swing lows in the trailing 90 bars
const MONEY_FLOW_CAP = 0.12; // max zone shift from the money-flow read
const ATR_WIDTH_MULT = 0.75; // zone half-width = 0.75 × ATR(20)

export type MoneyFlowVerdict = "accumulation" | "distribution" | "neutral";

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
  seal: "verified" | "estimated";
  /** Human-readable lines for the tooltip — every input that moved the number. */
  lines: string[];
  warnings: string[];
}

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** Fractal swing lows: bar i is a swing low if its low is the lowest of FRACTAL_N bars
 * on each side. Returns the most recent ones (up to `maxCount`), newest first. */
function fractalSwingLows(bars: Bar[], maxCount = 3): number[] {
  const out: number[] = [];
  const start = Math.max(FRACTAL_N, bars.length - SWING_LOOKBACK);
  for (let i = bars.length - 1 - FRACTAL_N; i >= start; i--) {
    let isLow = true;
    for (let j = i - FRACTAL_N; j <= i + FRACTAL_N; j++) {
      if (j === i || j < 0 || j >= bars.length) continue;
      if (bars[j].l < bars[i].l) { isLow = false; break; }
    }
    if (isLow) {
      out.push(bars[i].l);
      if (out.length >= maxCount) break;
    }
  }
  return out;
}

/** Volume profile over the trailing bars: returns the point of control (highest-volume
 * price) and the highest-volume node below `refPrice`. */
function volumeProfile(bars: Bar[], refPrice: number): { poc: number | null; supportNode: number | null } {
  const slice = bars.slice(-PROFILE_BARS);
  if (slice.length < MIN_BARS) return { poc: null, supportNode: null };
  let lo = Infinity, hi = -Infinity;
  for (const b of slice) { if (b.l < lo) lo = b.l; if (b.h > hi) hi = b.h; }
  if (!(hi > lo)) return { poc: null, supportNode: null };
  const bins = new Array<number>(PROFILE_BINS).fill(0);
  const width = (hi - lo) / PROFILE_BINS;
  for (const b of slice) {
    const mid = (b.h + b.l) / 2;
    const idx = Math.min(PROFILE_BINS - 1, Math.max(0, Math.floor((mid - lo) / width)));
    bins[idx] += b.v || 0;
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

export function computeTechnicalRange(symbol: string, bars: Bar[]): TechnicalRange | null {
  // Drop the last (possibly still-forming) bar — the zone must be a PRIOR benchmark.
  const ref = bars.slice(0, -1);
  if (ref.length < MIN_BARS) return null;
  const sym = symbol.toUpperCase();
  const lines: string[] = [];
  const warnings: string[] = [];
  const lastClose = ref[ref.length - 1].c;

  // --- Structure: volume profile, swing lows, anchored VWAP --------------------------------
  const { poc, supportNode } = volumeProfile(ref, lastClose);
  const swings = fractalSwingLows(ref);
  const swingLow = swings.length > 0 ? swings[0] : null;
  // Anchor VWAP at the lowest swing low in the window (the most significant recent base)
  let vwap: number | null = null;
  if (swings.length > 0) {
    const anchorLow = Math.min(...swings);
    let anchorIdx = 0;
    for (let i = 0; i < ref.length; i++) {
      if (ref[i].l === anchorLow) { anchorIdx = i; break; }
    }
    vwap = anchoredVwap(ref, anchorIdx);
  }

  const anchors: { level: number; weight: number; label: string }[] = [];
  if (supportNode !== null) anchors.push({ level: supportNode, weight: 3, label: "volume node" });
  if (swingLow !== null) anchors.push({ level: swingLow, weight: 2, label: "swing low" });
  if (vwap !== null) anchors.push({ level: vwap, weight: 2, label: "anchored VWAP" });
  if (poc !== null && poc < lastClose) anchors.push({ level: poc, weight: 1, label: "point of control" });
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
  if (supportNode !== null) lines.push(`Highest-volume node below price: ${fmtMoney(supportNode)} — where the most shares changed hands (trailing 12m)`);
  if (poc !== null) lines.push(`Point of control (12m): ${fmtMoney(poc)}`);

  // --- Money flow: buyer vs seller ----------------------------------------------------------
  const cmfArr = chaikinMoneyFlow(ref, 20);
  const cmf = cmfArr.length > 0 ? cmfArr[cmfArr.length - 1] : null;
  const udv = upDownVolume(ref, 20);
  const obvArr = obv(ref);
  let obvTrend: TechnicalRange["obvTrend"] = null;
  if (obvArr.length >= 21) {
    const recent = obvArr[obvArr.length - 1];
    const past = obvArr[obvArr.length - 21];
    obvTrend = recent > past ? "rising" : recent < past ? "falling" : "flat";
  }

  // Composite money-flow score: CMF ±, up/down volume, OBV trend — each votes −1..1
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
    lines.push(`On-Balance Volume trend (20d): ${obvTrend}`);
  }
  const moneyFlowScore = votes > 0 ? score / votes : 0;
  const moneyFlow: MoneyFlowVerdict = moneyFlowScore > 0.25 ? "accumulation" : moneyFlowScore < -0.25 ? "distribution" : "neutral";
  lines.push(`Money-flow read: ${moneyFlow} (composite score ${moneyFlowScore >= 0 ? "+" : ""}${moneyFlowScore.toFixed(2)})`);

  const zoneShift = Math.max(-MONEY_FLOW_CAP, Math.min(MONEY_FLOW_CAP, moneyFlowScore * MONEY_FLOW_CAP));
  const center = confluence * (1 + zoneShift);
  if (zoneShift !== 0) {
    lines.push(`Zone shifted ${(zoneShift * 100).toFixed(1)}% ${zoneShift > 0 ? "up (accumulation — less pullback needed)" : "down (distribution — demanding a deeper discount)"}`);
  }

  // --- Width from ATR ------------------------------------------------------------------------
  const atrVal = atrEarly;
  const halfWidth = atrVal !== null && atrVal > 0 ? atrVal * ATR_WIDTH_MULT : center * 0.05;
  if (atrVal !== null && atrVal > 0) {
    lines.push(`Zone width ±${fmtMoney(halfWidth)} = 0.75 × ATR(20) ${fmtMoney(atrVal)} (the stock's own volatility sets the width)`);
  } else {
    warnings.push("ATR unavailable — fell back to ±5% width.");
  }

  const priceLow = center - halfWidth;
  const priceHigh = center + halfWidth;
  if (!(priceLow > 0 && priceHigh >= priceLow)) return null;

  const seal: TechnicalRange["seal"] = cluster.length >= 2 && votes >= 2 ? "verified" : "estimated";
  if (seal === "estimated") warnings.push("Fewer independent anchors/inputs than ideal — treat the zone as approximate.");

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
    seal,
    lines,
    warnings,
  };
}
