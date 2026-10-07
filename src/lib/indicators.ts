// Pure swing-trader indicator math over daily bars (oldest → newest).
// No I/O, no dependencies. Used by the earnings-research API route.
// RSI uses Wilder's smoothing; MACD uses the classic 12/26/9 EMA recipe.

export interface Bar {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface DatedBar extends Bar {
  date: string; // YYYY-MM-DD
}

function clean(values: number[]): number[] {
  return values.filter((v) => typeof v === "number" && Number.isFinite(v) && v > 0);
}

/** Simple moving average of the last n values, or null when history is short. */
export function sma(values: number[], n: number): number | null {
  const v = clean(values);
  if (v.length < n) return null;
  const slice = v.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / n;
}

/** Full EMA series, seeded with the SMA of the first n values. */
export function emaSeries(values: number[], n: number): number[] {
  const v = clean(values);
  if (v.length < n) return [];
  const k = 2 / (n + 1);
  const out: number[] = [];
  let prev = v.slice(0, n).reduce((a, b) => a + b, 0) / n;
  out.push(prev);
  for (let i = n; i < v.length; i++) {
    prev = v[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

/** Last value of the n-period EMA, or null when history is short. */
export function ema(values: number[], n: number): number | null {
  const s = emaSeries(values, n);
  return s.length ? s[s.length - 1] : null;
}

/** Wilder's smoothed RSI(n). Null when fewer than n+1 closes. */
export function rsi(closes: number[], n = 14): number | null {
  const v = clean(closes);
  if (v.length < n + 1) return null;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= n; i++) {
    const diff = v[i] - v[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= n;
  avgLoss /= n;
  for (let i = n + 1; i < v.length; i++) {
    const diff = v[i] - v[i - 1];
    avgGain = (avgGain * (n - 1) + Math.max(diff, 0)) / n;
    avgLoss = (avgLoss * (n - 1) + Math.max(-diff, 0)) / n;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

/** Classic MACD(12,26,9). Null when fewer than 34 closes. */
export function macd(closes: number[]): MacdResult | null {
  const v = clean(closes);
  if (v.length < 34) return null;
  const e12 = emaSeries(v, 12);
  const e26 = emaSeries(v, 26);
  const macdLine = e12.slice(e12.length - e26.length).map((x, i) => x - e26[i]);
  const signalLine = emaSeries(macdLine, 9);
  if (!signalLine.length) return null;
  const m = macdLine[macdLine.length - 1];
  const s = signalLine[signalLine.length - 1];
  return { macd: m, signal: s, histogram: m - s };
}

export interface BollingerResult {
  upper: number;
  middle: number;
  lower: number;
  percentB: number; // (price - lower) / (upper - lower); >1 = above upper band
  bandwidthPct: number; // (upper - lower) / middle * 100
}

/** Bollinger(20,2) from the last n closes. Null when history is short. */
export function bollinger(closes: number[], n = 20, k = 2): BollingerResult | null {
  const v = clean(closes);
  if (v.length < n) return null;
  const slice = v.slice(-n);
  const middle = slice.reduce((a, b) => a + b, 0) / n;
  const variance = slice.reduce((a, b) => a + (b - middle) * (b - middle), 0) / n;
  const sd = Math.sqrt(variance);
  const upper = middle + k * sd;
  const lower = middle - k * sd;
  const last = slice[slice.length - 1];
  return {
    upper,
    middle,
    lower,
    percentB: upper === lower ? 0.5 : (last - lower) / (upper - lower),
    bandwidthPct: middle === 0 ? 0 : ((upper - lower) / middle) * 100,
  };
}

/** Wilder's ATR(n). Null when fewer than n+1 bars. */
export function atr(bars: Bar[], n = 20): number | null {
  if (bars.length < n + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const h = bars[i].h;
    const l = bars[i].l;
    const pc = bars[i - 1].c;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let val = trs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  for (let i = n; i < trs.length; i++) {
    val = (val * (n - 1) + trs[i]) / n;
  }
  return val;
}

/** Last session's volume relative to its n-session average. Null when short. */
export function volumeRatio(bars: Bar[], n = 20): number | null {
  const vols = bars.map((b) => b.v).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (vols.length < n) return null;
  const avg = vols.slice(-n).reduce((a, b) => a + b, 0) / n;
  if (avg === 0) return null;
  return vols[vols.length - 1] / avg;
}

/** Highest high / lowest low over the last `lookback` bars. */
export function swingHighLow(
  bars: Bar[],
  lookback: number
): { high: number; low: number } | null {
  if (bars.length < lookback || lookback < 1) return null;
  const slice = bars.slice(-lookback);
  return {
    high: Math.max(...slice.map((b) => b.h)),
    low: Math.min(...slice.map((b) => b.l)),
  };
}

export interface GapZone {
  type: "up" | "down";
  low: number;
  high: number;
  date: string; // date of the bar that opened the gap
}

/** (lastClose / SMA(period) - 1) as a decimal, e.g. 0.23 = 23% above the moving average.
 * Null when there isn't enough history for the requested SMA period. */
export function extensionFromSma(closes: number[], period: number): number | null {
  const avg = sma(closes, period);
  const v = clean(closes);
  if (avg === null || avg === 0 || v.length === 0) return null;
  return v[v.length - 1] / avg - 1;
}

/** On-Balance Volume: a running total that adds the session's volume when close > prior close,
 * subtracts it when close < prior close, and leaves it unchanged on an unchanged close. Returns
 * one value per input bar (first value is always 0, since there's no prior close to compare). */
export function obv(bars: { c: number; v: number }[]): number[] {
  const out: number[] = [];
  let running = 0;
  for (let i = 0; i < bars.length; i++) {
    if (i > 0) {
      if (bars[i].c > bars[i - 1].c) running += bars[i].v;
      else if (bars[i].c < bars[i - 1].c) running -= bars[i].v;
    }
    out.push(running);
  }
  return out;
}

/** Chaikin Money Flow: Money Flow Multiplier = ((C-L)-(H-C))/(H-L) per bar, Money Flow Volume =
 * multiplier * volume, CMF = rolling-sum(MFV, period) / rolling-sum(volume, period). Returns one
 * value per bar from index `period - 1` onward; earlier indices are omitted (insufficient window).
 * A bar with H===L (no range) contributes a multiplier of 0 rather than dividing by zero. */
export function chaikinMoneyFlow(bars: { h: number; l: number; c: number; v: number }[], period = 20): number[] {
  const mfv = bars.map((b) => {
    const range = b.h - b.l;
    const multiplier = range === 0 ? 0 : (b.c - b.l - (b.h - b.c)) / range;
    return multiplier * b.v;
  });
  const out: number[] = [];
  for (let i = period - 1; i < bars.length; i++) {
    let mfvSum = 0;
    let volSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      mfvSum += mfv[j];
      volSum += bars[j].v;
    }
    out.push(volSum === 0 ? 0 : mfvSum / volSum);
  }
  return out;
}

export interface UpDownVolume {
  upVolume: number;
  downVolume: number;
  ratio: number;
}

/**
 * Sums volume on "buyer" days (close > prior close) vs. "seller" days (close < prior close) over
 * the trailing `lookback` bars. This is a price-direction/volume PROXY for buyer-vs-seller size —
 * NOT true bid/ask order-flow data, since this app has no Level 2 / tape feed. It's the standard
 * up-volume/down-volume heuristic (same spirit as OBV and Dow Theory's volume-confirmation rule),
 * read as "which side was heavier," not a literal measurement of resting buy/sell order size.
 * ratio = upVolume / downVolume; guarded against divide-by-zero: Infinity only when there's up
 * volume and zero down volume, 1 when both are zero (no directional bars in the window at all).
 */
export function upDownVolume(bars: { c: number; v: number }[], lookback = 20): UpDownVolume {
  const start = Math.max(1, bars.length - lookback);
  let upVolume = 0;
  let downVolume = 0;
  for (let i = start; i < bars.length; i++) {
    if (bars[i].c > bars[i - 1].c) upVolume += bars[i].v;
    else if (bars[i].c < bars[i - 1].c) downVolume += bars[i].v;
  }
  let ratio: number;
  if (downVolume === 0 && upVolume === 0) ratio = 1;
  else if (downVolume === 0) ratio = Infinity;
  else ratio = upVolume / downVolume;
  return { upVolume, downVolume, ratio };
}

/** Golden/death cross state from SMA50 vs SMA200: "golden" when the 50-day sits above the 200-day
 * (bullish), "death" when below (bearish). There's no third crossing state to detect without the
 * prior bar's SMAs, so "neutral" is reserved for the (practically impossible with real float data)
 * exact-equal case; null when there's insufficient history to compute either SMA. */
export function goldenCrossState(closes: number[]): "golden" | "death" | "neutral" | null {
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  if (sma50 === null || sma200 === null) return null;
  if (sma50 > sma200) return "golden";
  if (sma50 < sma200) return "death";
  return "neutral";
}

/**
 * Finds price gaps in the last `lookback` bars that were never filled afterwards.
 * Gap up: bar's low > previous bar's high → zone (prevHigh, low).
 * Gap down: bar's high < previous bar's low → zone (high, prevLow).
 * A zone counts as filled if any later bar traded through it.
 */
export function unfilledGaps(bars: DatedBar[], lookback = 60): GapZone[] {
  if (bars.length < 2) return [];
  const start = Math.max(1, bars.length - lookback);
  const zones: GapZone[] = [];
  for (let i = start; i < bars.length; i++) {
    const prev = bars[i - 1];
    const cur = bars[i];
    const rest = bars.slice(i + 1);
    if (cur.l > prev.h) {
      // Gap up — filled if any later bar's low dips back into/below the zone top.
      const filled = rest.some((b) => b.l <= cur.l);
      if (!filled) zones.push({ type: "up", low: prev.h, high: cur.l, date: cur.date });
    } else if (cur.h < prev.l) {
      // Gap down — filled if any later bar's high reaches back into/above the zone bottom.
      const filled = rest.some((b) => b.h >= cur.h);
      if (!filled) zones.push({ type: "down", low: cur.h, high: prev.l, date: cur.date });
    }
  }
  return zones;
}
