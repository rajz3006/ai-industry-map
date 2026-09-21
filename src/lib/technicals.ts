// Rules-based technical signal engine. Pure functions over daily closes (oldest → newest).
// Classifies each indicator as bullish / neutral / bearish and rolls them into a composite
// signal. This is a transparent, backward-looking read of price action — not financial
// advice and not a buy/sell recommendation.

export type Signal = "bullish" | "neutral" | "bearish";

export interface IndicatorSignal {
  name: string;
  value: string;
  signal: Signal;
  detail: string;
}

export interface TechnicalsResult {
  overall: Signal;
  score: number; // sum of indicator votes: +1 bullish, -1 bearish, 0 neutral
  indicators: IndicatorSignal[];
  pointsUsed: number;
  unavailable?: string;
}

const MIN_POINTS = 35; // enough for MACD(12,26,9)

function sma(values: number[], n: number): number | null {
  if (values.length < n) return null;
  const slice = values.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / n;
}

function ema(values: number[], n: number): number[] {
  // Returns the full EMA series; seeds with the SMA of the first n values.
  const k = 2 / (n + 1);
  const out: number[] = [];
  if (values.length < n) return out;
  let prev = values.slice(0, n).reduce((a, b) => a + b, 0) / n;
  out.push(prev);
  for (let i = n; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function rsi(values: number[], n = 14): number | null {
  if (values.length < n + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = values.length - n; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

function fmt(n: number, digits = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function computeTechnicals(closes: number[]): TechnicalsResult {
  const clean = closes.filter((c) => typeof c === "number" && c > 0);
  if (clean.length < MIN_POINTS) {
    return {
      overall: "neutral",
      score: 0,
      indicators: [],
      pointsUsed: clean.length,
      unavailable: `Not enough daily history (${clean.length} sessions; need ${MIN_POINTS}) for reliable signals.`,
    };
  }

  const indicators: IndicatorSignal[] = [];
  const last = clean[clean.length - 1];

  // 1) Trend vs medium-term average: price relative to SMA-50 (or SMA-20 if history is short).
  const longN = clean.length >= 60 ? 50 : 20;
  const longAvg = sma(clean, longN)!;
  const distPct = ((last - longAvg) / longAvg) * 100;
  const trendSignal: Signal = distPct > 1 ? "bullish" : distPct < -1 ? "bearish" : "neutral";
  indicators.push({
    name: `Trend vs SMA-${longN}`,
    value: `${distPct >= 0 ? "+" : ""}${fmt(distPct)}%`,
    signal: trendSignal,
    detail:
      trendSignal === "bullish"
        ? `Price holds above its ${longN}-day average — uptrend intact.`
        : trendSignal === "bearish"
          ? `Price sits below its ${longN}-day average — downtrend intact.`
          : `Price is within 1% of its ${longN}-day average — trend undecided.`,
  });

  // 2) Short vs long momentum: SMA-20 relative to SMA-50 (golden/death-cross proxy).
  const sma20 = sma(clean, 20)!;
  const sma50 = longN === 50 ? longAvg : null;
  if (sma50 !== null) {
    const crossPct = ((sma20 - sma50) / sma50) * 100;
    const crossSignal: Signal = crossPct > 0.5 ? "bullish" : crossPct < -0.5 ? "bearish" : "neutral";
    indicators.push({
      name: "SMA-20 vs SMA-50",
      value: `${crossPct >= 0 ? "+" : ""}${fmt(crossPct)}%`,
      signal: crossSignal,
      detail:
        crossSignal === "bullish"
          ? "Short-term average above the long-term average — momentum favors buyers."
          : crossSignal === "bearish"
            ? "Short-term average below the long-term average — momentum favors sellers."
            : "Averages are intertwined — no clear momentum edge.",
    });
  }

  // 3) RSI-14 momentum: overbought / oversold extremes.
  const rsiVal = rsi(clean, 14)!;
  const rsiSignal: Signal = rsiVal >= 70 ? "bearish" : rsiVal <= 30 ? "bullish" : "neutral";
  indicators.push({
    name: "RSI-14",
    value: fmt(rsiVal, 1),
    signal: rsiSignal,
    detail:
      rsiSignal === "bearish"
        ? "Above 70 — overbought; rallies have tended to stall from here."
        : rsiSignal === "bullish"
          ? "Below 30 — oversold; selling pressure looks exhausted."
          : "Between 30 and 70 — no momentum extreme.",
  });

  // 4) MACD(12,26,9) histogram: trend-acceleration confirmation.
  const ema12 = ema(clean, 12);
  const ema26 = ema(clean, 26);
  const macdLine = ema12.slice(ema12.length - ema26.length).map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const hist = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];
  const histScale = Math.abs(last) > 0 ? hist / last : 0;
  const macdSignal: Signal = hist > 0 ? "bullish" : hist < 0 ? "bearish" : "neutral";
  indicators.push({
    name: "MACD histogram",
    value: `${hist >= 0 ? "+" : ""}${fmt(histScale * 100, 3)}%`,
    signal: macdSignal,
    detail:
      macdSignal === "bullish"
        ? "MACD line above its signal line — upside momentum is accelerating."
        : macdSignal === "bearish"
          ? "MACD line below its signal line — downside momentum is accelerating."
          : "MACD is flat against its signal line — momentum stalled.",
  });

  const score = indicators.reduce(
    (acc, i) => acc + (i.signal === "bullish" ? 1 : i.signal === "bearish" ? -1 : 0),
    0
  );
  const overall: Signal = score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";

  return { overall, score, indicators, pointsUsed: clean.length };
}

export const SIGNAL_COPY: Record<Signal, { label: string; blurb: string }> = {
  bullish: {
    label: "Bullish",
    blurb: "Most price-action signals point up. Backward-looking only — not a recommendation.",
  },
  neutral: {
    label: "Neutral",
    blurb: "Signals are mixed or flat. No clear technical edge either way.",
  },
  bearish: {
    label: "Bearish",
    blurb: "Most price-action signals point down. Backward-looking only — not a recommendation.",
  },
};
