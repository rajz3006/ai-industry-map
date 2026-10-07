// Step 6: Chart / Technicals.
//
// Methodology per research_notes/.../step5_6_management_technicals.md: technicals inform
// execution/risk framing, not a moat-level verdict — this scores trend health (price vs
// SMA50/200, golden/death cross), whether the stock is overextended from its 200-day SMA,
// RSI(14) exhaustion, Bollinger %B, and a volume-confirmation read (Dow Theory's "volume should
// expand with the trend" rule), using OBV/Chaikin Money Flow/up-down-volume as the volume lens.
// Purely computed from the `bars` array — no network calls, so this step never has a data
// *provider* failure, only a data *sufficiency* failure (too little price history).

import type { Bar } from "@/lib/indicators";
import {
  sma,
  rsi,
  atr,
  bollinger,
  extensionFromSma,
  obv,
  chaikinMoneyFlow,
  upDownVolume,
  goldenCrossState,
} from "@/lib/indicators";
import type { StepMetric } from "./types";
import { verdictFromScore } from "./types";
import type { StepComputation } from "./scoreFinancials";

const MIN_BARS = 30; // below this, nothing here is meaningful — RSI/ATR alone need ~15-21

export function scoreTechnicals(symbol: string, bars: Bar[]): StepComputation {
  if (bars.length < MIN_BARS) {
    return {
      score: 2.5,
      verdict: "unknown",
      summary: `Only ${bars.length} daily bars available for ${symbol} — not enough price history for a meaningful technical read.`,
      metrics: [],
      sources: ["Alpaca daily bars"],
      warnings: [`Insufficient bar history for ${symbol} (${bars.length} bars, need >= ${MIN_BARS}) — Step 6 scored neutral/unknown.`],
    };
  }

  const closes = bars.map((b) => b.c);
  const latestClose = closes[closes.length - 1];
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const extension200 = extensionFromSma(closes, 200);
  const rsi14 = rsi(closes, 14);
  const atr14 = atr(bars, 14);
  const boll = bollinger(closes, 20, 2);
  const cross = goldenCrossState(closes);
  const cmfSeries = chaikinMoneyFlow(bars, 20);
  const cmf20 = cmfSeries.length ? cmfSeries[cmfSeries.length - 1] : null;
  const obvSeries = obv(bars);
  const upDown = upDownVolume(bars, 20);

  const metrics: StepMetric[] = [];
  const warnings: string[] = [];
  let score = 2.5;
  const notes: string[] = [];

  if (sma50 !== null) {
    const diffPct = ((latestClose - sma50) / sma50) * 100;
    metrics.push({ label: "Price vs 50-day SMA", value: `${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(1)}%`, source: "Alpaca daily bars" });
    if (latestClose > sma50) score += 0.5;
    else score -= 0.5;
  } else {
    warnings.push(`Not enough bars for a 50-day SMA on ${symbol}.`);
  }

  if (sma200 !== null) {
    const diffPct = ((latestClose - sma200) / sma200) * 100;
    metrics.push({ label: "Price vs 200-day SMA", value: `${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(1)}%`, source: "Alpaca daily bars" });
    if (latestClose > sma200) score += 0.5;
    else score -= 0.5;
  } else {
    warnings.push(`Not enough bars for a 200-day SMA on ${symbol} (need ~200, have ${bars.length}).`);
  }

  if (cross) {
    metrics.push({ label: "Golden/death cross (50 vs 200 SMA)", value: cross === "golden" ? "Golden (bullish)" : cross === "death" ? "Death (bearish)" : "Neutral" });
    if (cross === "golden") {
      score += 0.75;
      notes.push("50-day SMA above the 200-day (golden cross state)");
    } else if (cross === "death") {
      score -= 0.75;
      notes.push("50-day SMA below the 200-day (death cross state)");
    }
  }

  if (extension200 !== null) {
    const pct = extension200 * 100;
    metrics.push({ label: "Extension from 200-day SMA", value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, note: ">~25-50% is commonly read as overextended" });
    if (pct > 50) {
      score -= 1.0;
      notes.push("very overextended above its 200-day SMA — chasing risk is elevated");
    } else if (pct > 25) {
      score -= 0.5;
      notes.push("stretched above its 200-day SMA");
    } else if (pct < -15) {
      score -= 0.5;
      notes.push("well below its 200-day SMA — in a real downtrend, not just a dip");
    } else if (pct > -10) {
      score += 0.25;
    }
  }

  if (rsi14 !== null) {
    metrics.push({ label: "RSI (14)", value: rsi14.toFixed(0), note: ">70 overbought, <30 oversold (Wilder's guideline, not absolute)" });
    if (rsi14 >= 45 && rsi14 <= 65) score += 0.25;
    else if (rsi14 > 75) {
      score -= 0.5;
      notes.push("RSI deep in overbought territory");
    } else if (rsi14 < 25) {
      score -= 0.5;
      notes.push("RSI deep in oversold territory — weak momentum");
    }
  } else {
    warnings.push(`Not enough bars for RSI(14) on ${symbol}.`);
  }

  if (atr14 !== null) {
    metrics.push({ label: "ATR (14)", value: `$${atr14.toFixed(2)}`, note: `${((atr14 / latestClose) * 100).toFixed(1)}% of current price` });
  } else {
    warnings.push(`Not enough bars for ATR(14) on ${symbol}.`);
  }

  if (boll) {
    metrics.push({ label: "Bollinger %B", value: boll.percentB.toFixed(2), note: ">1 = above upper band, <0 = below lower band" });
    if (boll.percentB > 1) {
      score -= 0.25;
      notes.push("trading above its upper Bollinger band");
    } else if (boll.percentB < 0) {
      score -= 0.25;
      notes.push("trading below its lower Bollinger band");
    }
  }

  // Volume-pressure trio: the up/down volume ratio is the explicit metric the product owner
  // asked to surface — labeled clearly as a price-direction proxy, not real order-flow data.
  const ratioLabel = upDown.ratio === Infinity ? ">10" : upDown.ratio.toFixed(2);
  metrics.push({
    label: "20-day buy vs. sell volume",
    value: `${ratioLabel}x`,
    note: "up-volume / down-volume over the trailing 20 sessions — a price-direction/volume PROXY (OBV/Dow-Theory style), NOT real order-flow or Level-2 data",
    source: "Alpaca daily bars",
  });
  const trendingUp = sma50 !== null ? latestClose > sma50 : null;
  if (trendingUp !== null) {
    if (trendingUp && upDown.ratio > 1.5) {
      score += 0.5;
      notes.push("volume confirms the uptrend (heavier buy-side volume)");
    } else if (trendingUp && upDown.ratio < 0.67) {
      score -= 0.25;
      notes.push("uptrend lacks volume confirmation — heavier sell-side volume despite price being above its 50-day SMA");
    } else if (!trendingUp && upDown.ratio > 1.5) {
      score -= 0.25;
      notes.push("downtrend shows unusually heavy buy-side volume — possible early reversal, or just noise");
    }
  }

  if (cmf20 !== null) {
    metrics.push({ label: "Chaikin Money Flow (20)", value: cmf20.toFixed(2), note: ">0 = net buying pressure, <0 = net selling pressure" });
    if (cmf20 > 0.05) score += 0.25;
    else if (cmf20 < -0.05) score -= 0.25;
  }

  if (obvSeries.length >= 2) {
    const obvTrendUp = obvSeries[obvSeries.length - 1] > obvSeries[Math.max(0, obvSeries.length - 20)];
    metrics.push({ label: "On-balance volume (20-session trend)", value: obvTrendUp ? "Rising" : "Falling" });
  }

  score = Math.max(0, Math.min(5, Math.round(score * 10) / 10));
  const verdict = verdictFromScore(score);
  const summary =
    `${symbol}'s chart reads ${verdict} (${score.toFixed(1)}/5)` +
    (notes.length ? ` — ${notes.join("; ")}.` : ", based on trend, momentum, and volume metrics below.") +
    " Technicals here inform execution/risk timing, not the underlying investment thesis.";

  return { score, verdict, summary, metrics, sources: ["Alpaca daily bars"], warnings };
}
