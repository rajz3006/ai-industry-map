// Fast Rotation strategy backtest engine — daily top-5-losers rotation, locked spec per
// memory: trading_fast_rotation_strategy.md. Ported from scripts/backtest-fast-rotation.mjs
// so the app's "Fast Rotation" tab and the CLI script share the exact same math.
//
// Pure simulation functions operate on already-loaded bar data so parameter tweaks (stop %,
// target %, sizing) never require a re-fetch — only changing the day count does.

// Relative imports (not "@/...") so this file can also be loaded directly by plain Node —
// scripts/backtest-fast-rotation.mjs imports it without any Next.js/tsconfig-paths tooling.
import { alpacaGetMultiBars, type AlpacaBar } from "./alpaca.ts";
import { allUSSymbols } from "../data/tickers.ts";

const VOL_WINDOW = 20;
const MIN_CLOSES_REQUIRED = VOL_WINDOW + 1; // matches src/app/api/opportunities/route.ts
const NY_DATE_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });
const BAR_FETCH_BUFFER_DAYS = 120; // extra lookback for z-score/trend-filter warmup + holidays, beyond the requested window
const BAR_CACHE_TTL_MS = 15 * 60_000;

export interface OhlcSeries {
  dates: string[];
  closes: number[];
  highs: number[];
  lows: number[];
  dateIndex: Map<string, number>;
}

export interface BacktestConfig {
  backtestDays: number;
  stopPct: number; // fraction, e.g. 0.0125 for 1.25%
  targetPct: number; // fraction, e.g. 0.05 for 5%
  riskPct: number; // fraction, e.g. 0.01 for 1%
  maxPositionPct: number; // fraction, e.g. 0.25 for 25%
  maxPositions: number;
  startingCash: number;
  /** "Bullish/Buy signal" proxy: require close > this many trailing days' SMA to be eligible.
   * 0 disables. No historical analyst-rating data exists to backtest an actual "Buy" rating,
   * so a trend filter (price above its own longer-term average) stands in for it — same idea
   * Minervini/O'Neil use: don't buy a dip in a name whose longer-term trend is already broken. */
  trendFilterDays: number;
  /** "One-off macro/geopolitical dip, not company-specific" proxy: only buy on days where the
   * whole 57-symbol universe's median change% is at or below this (a broad red day implies the
   * move isn't one stock's own bad news). 0 disables — any day is eligible to buy on. */
  macroDipThreshold: number; // fraction, e.g. -0.01 for "universe median <= -1%"
}

export type SelectionVariant = "raw" | "zscore";

export interface ClosedTrade {
  symbol: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  reason: "stop" | "target";
  shares: number;
  pnl: number;
  pnlPct: number;
}

export interface OpenPositionResult {
  symbol: string;
  entryDate: string;
  entryPrice: number;
  shares: number;
  stopPrice: number;
  targetPrice: number;
  lastPrice: number;
  unrealizedPnl: number;
}

export interface EquityPoint {
  date: string;
  equity: number;
  cash: number;
  openPositions: number;
}

export interface BacktestResult {
  variant: SelectionVariant;
  startingCash: number;
  finalEquity: number;
  totalReturnPct: number;
  numTradesOpened: number;
  numClosed: number;
  numStops: number;
  numTargets: number;
  winRate: number | null;
  avgHoldDays: number | null;
  maxConcurrent: number;
  realizedPnl: number;
  unrealizedPnl: number;
  closedTrades: ClosedTrade[];
  openPositions: OpenPositionResult[];
  equityCurve: EquityPoint[];
}

function stddev(returns: number[]): number {
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

export function buildOhlcSeries(raw: Record<string, AlpacaBar[]>): { bySymbol: Map<string, OhlcSeries>; dates: string[] } {
  const bySymbol = new Map<string, OhlcSeries>();
  const dateSet = new Set<string>();
  for (const [sym, bars] of Object.entries(raw)) {
    const sorted = bars.slice().sort((a, b) => a.t.localeCompare(b.t));
    const dates: string[] = [];
    const closes: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const dateIndex = new Map<string, number>();
    for (const b of sorted) {
      const d = NY_DATE_FMT.format(new Date(b.t));
      dateIndex.set(d, dates.length);
      dates.push(d);
      closes.push(b.c);
      highs.push(b.h);
      lows.push(b.l);
      dateSet.add(d);
    }
    bySymbol.set(sym, { dates, closes, highs, lows, dateIndex });
  }
  return { bySymbol, dates: Array.from(dateSet).sort() };
}

function metricsFor(
  bySymbol: Map<string, OhlcSeries>,
  symbol: string,
  date: string
): { changePercent: number; zScore: number | null } | null {
  const s = bySymbol.get(symbol);
  if (!s) return null;
  const idx = s.dateIndex.get(date);
  if (idx === undefined || idx < 1) return null;
  const latest = s.closes[idx];
  const prev = s.closes[idx - 1];
  if (prev === 0) return null;
  const changePercent = ((latest - prev) / prev) * 100;
  let zScore: number | null = null;
  if (idx + 1 >= MIN_CLOSES_REQUIRED) {
    const window = s.closes.slice(idx + 1 - MIN_CLOSES_REQUIRED, idx + 1);
    const dailyReturns: number[] = [];
    for (let i = 1; i < window.length; i++) {
      if (window[i - 1] === 0) continue;
      dailyReturns.push(((window[i] - window[i - 1]) / window[i - 1]) * 100);
    }
    if (dailyReturns.length >= VOL_WINDOW - 2) {
      const sd = stddev(dailyReturns);
      zScore = sd > 0 ? changePercent / sd : null;
    }
  }
  return { changePercent, zScore };
}

/** True if `symbol` closed above its own trailing `days`-session SMA on `date` (the "still
 * bullish" trend gate). Insufficient history fails conservatively (treated as not bullish). */
function trendOk(bySymbol: Map<string, OhlcSeries>, symbol: string, date: string, days: number): boolean {
  if (!days) return true;
  const s = bySymbol.get(symbol);
  if (!s) return false;
  const idx = s.dateIndex.get(date);
  if (idx === undefined || idx + 1 < days) return false;
  const window = s.closes.slice(idx + 1 - days, idx + 1);
  const sma = window.reduce((a, b) => a + b, 0) / window.length;
  return s.closes[idx] > sma;
}

/** Median daily change% across every symbol with a valid prior close on `date` — a cheap proxy
 * for "was this a broad, macro-driven red day" vs. "this one name cratered on its own news." */
function universeMedianChangePct(bySymbol: Map<string, OhlcSeries>, date: string): number | null {
  const changes: number[] = [];
  for (const s of bySymbol.values()) {
    const idx = s.dateIndex.get(date);
    if (idx === undefined || idx < 1) continue;
    const prev = s.closes[idx - 1];
    if (prev === 0) continue;
    changes.push(((s.closes[idx] - prev) / prev) * 100);
  }
  if (changes.length === 0) return null;
  changes.sort((a, b) => a - b);
  const mid = Math.floor(changes.length / 2);
  return changes.length % 2 === 0 ? (changes[mid - 1] + changes[mid]) / 2 : changes[mid];
}

function barOn(bySymbol: Map<string, OhlcSeries>, symbol: string, date: string): { close: number; high: number; low: number } | null {
  const s = bySymbol.get(symbol);
  if (!s) return null;
  const idx = s.dateIndex.get(date);
  if (idx === undefined) return null;
  return { close: s.closes[idx], high: s.highs[idx], low: s.lows[idx] };
}

function rankCandidates(
  candidates: { symbol: string; changePercent: number; zScore: number | null }[],
  variant: SelectionVariant,
  maxPositions: number
) {
  if (variant === "raw") {
    return candidates.slice().sort((a, b) => a.changePercent - b.changePercent).slice(0, maxPositions);
  }
  return candidates
    .filter((c) => c.zScore !== null && c.zScore < 0)
    .sort((a, b) => (a.zScore as number) - (b.zScore as number))
    .slice(0, maxPositions);
}

export function runBacktest(
  bySymbol: Map<string, OhlcSeries>,
  simDates: string[],
  config: BacktestConfig,
  variant: SelectionVariant
): BacktestResult {
  let cash = config.startingCash;
  let positions: { symbol: string; entryDate: string; entryPrice: number; shares: number; stopPrice: number; targetPrice: number }[] = [];
  const closedTrades: ClosedTrade[] = [];
  const equityCurve: EquityPoint[] = [];
  let maxConcurrent = 0;
  const lastKnownClose = new Map<string, number>();

  for (const date of simDates) {
    const stillOpen: typeof positions = [];
    for (const pos of positions) {
      const bar = barOn(bySymbol, pos.symbol, date);
      if (!bar) {
        stillOpen.push(pos);
        continue;
      }
      lastKnownClose.set(pos.symbol, bar.close);
      let exit: { price: number; reason: "stop" | "target" } | null = null;
      if (bar.low <= pos.stopPrice) exit = { price: pos.stopPrice, reason: "stop" }; // stop wins same-day ties
      else if (bar.high >= pos.targetPrice) exit = { price: pos.targetPrice, reason: "target" };
      if (exit) {
        const pnl = (exit.price - pos.entryPrice) * pos.shares;
        cash += exit.price * pos.shares;
        closedTrades.push({
          symbol: pos.symbol,
          entryDate: pos.entryDate,
          entryPrice: pos.entryPrice,
          exitDate: date,
          exitPrice: exit.price,
          reason: exit.reason,
          shares: pos.shares,
          pnl,
          pnlPct: (pnl / (pos.entryPrice * pos.shares)) * 100,
        });
      } else {
        stillOpen.push(pos);
      }
    }
    positions = stillOpen;

    const equityNow = () =>
      cash +
      positions.reduce(
        (sum, p) => sum + p.shares * (barOn(bySymbol, p.symbol, date)?.close ?? lastKnownClose.get(p.symbol) ?? p.entryPrice),
        0
      );

    // Macro-dip gate: if the whole universe isn't down at least this much today, skip buying
    // entirely — a lone red name on an otherwise calm/green day reads as company-specific risk,
    // not the "broad one-off" dip this filter is meant to admit.
    const macroOk =
      !config.macroDipThreshold ||
      (() => {
        const median = universeMedianChangePct(bySymbol, date);
        return median !== null && median <= config.macroDipThreshold * 100;
      })();

    const held = new Set(positions.map((p) => p.symbol));
    const candidates: { symbol: string; changePercent: number; zScore: number | null }[] = [];
    if (macroOk) {
      for (const sym of allUSSymbols) {
        if (held.has(sym)) continue;
        if (!trendOk(bySymbol, sym, date, config.trendFilterDays)) continue;
        const m = metricsFor(bySymbol, sym, date);
        if (!m) continue;
        candidates.push({ symbol: sym, ...m });
      }
    }
    const ranked = rankCandidates(candidates, variant, config.maxPositions);

    let slots = config.maxPositions - positions.length;
    for (const c of ranked) {
      if (slots <= 0) break;
      const bar = barOn(bySymbol, c.symbol, date);
      if (!bar) continue;
      const entryPrice = bar.close;
      const stopPrice = entryPrice * (1 - config.stopPct);
      const targetPrice = entryPrice * (1 + config.targetPct);
      const eq = equityNow();
      const riskDollar = config.riskPct * eq;
      const notionalByRisk = riskDollar / config.stopPct;
      const notionalCap = config.maxPositionPct * eq;
      const notional = Math.min(notionalByRisk, notionalCap, cash);
      if (notional < 10) continue; // dust guard
      const shares = notional / entryPrice;
      cash -= shares * entryPrice;
      positions.push({ symbol: c.symbol, entryDate: date, entryPrice, shares, stopPrice, targetPrice });
      lastKnownClose.set(c.symbol, entryPrice);
      slots--;
    }
    maxConcurrent = Math.max(maxConcurrent, positions.length);
    equityCurve.push({ date, equity: equityNow(), cash, openPositions: positions.length });
  }

  const finalEquity = equityCurve.length ? equityCurve[equityCurve.length - 1].equity : cash;
  const numClosed = closedTrades.length;
  const numStops = closedTrades.filter((t) => t.reason === "stop").length;
  const numTargets = closedTrades.filter((t) => t.reason === "target").length;
  const winRate = numClosed > 0 ? (numTargets / numClosed) * 100 : null;
  const avgHoldDays =
    numClosed > 0
      ? closedTrades.reduce((s, t) => s + (simDates.indexOf(t.exitDate) - simDates.indexOf(t.entryDate)), 0) / numClosed
      : null;
  const realizedPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
  const openPositions: OpenPositionResult[] = positions.map((p) => {
    const lastPrice = lastKnownClose.get(p.symbol) ?? p.entryPrice;
    return {
      symbol: p.symbol,
      entryDate: p.entryDate,
      entryPrice: p.entryPrice,
      shares: p.shares,
      stopPrice: p.stopPrice,
      targetPrice: p.targetPrice,
      lastPrice,
      unrealizedPnl: (lastPrice - p.entryPrice) * p.shares,
    };
  });
  const unrealizedPnl = openPositions.reduce((s, p) => s + p.unrealizedPnl, 0);

  return {
    variant,
    startingCash: config.startingCash,
    finalEquity,
    totalReturnPct: ((finalEquity - config.startingCash) / config.startingCash) * 100,
    numTradesOpened: numClosed + openPositions.length,
    numClosed,
    numStops,
    numTargets,
    winRate,
    avgHoldDays,
    maxConcurrent,
    realizedPnl,
    unrealizedPnl,
    closedTrades,
    openPositions,
    equityCurve,
  };
}

let barCache: { key: number; data: { bySymbol: Map<string, OhlcSeries>; simDates: string[]; fullRangeStart: string; fullRangeEnd: string }; fetchedAt: number } | null = null;

export async function loadBacktestBars(
  backtestDays: number
): Promise<{ bySymbol: Map<string, OhlcSeries>; simDates: string[]; fullRangeStart: string; fullRangeEnd: string }> {
  if (barCache && barCache.key === backtestDays && Date.now() - barCache.fetchedAt < BAR_CACHE_TTL_MS) {
    return barCache.data;
  }
  const fetchDays = backtestDays + BAR_FETCH_BUFFER_DAYS;
  const now = Date.now();
  const raw = await alpacaGetMultiBars(allUSSymbols, {
    timeframe: "1Day",
    start: new Date(now - fetchDays * 86_400_000).toISOString(),
    end: new Date(now).toISOString(),
    limit: 10_000,
    adjustment: "split",
  });
  const { bySymbol, dates } = buildOhlcSeries(raw);
  if (dates.length === 0) {
    const empty = { bySymbol, simDates: [], fullRangeStart: "", fullRangeEnd: "" };
    barCache = { key: backtestDays, data: empty, fetchedAt: Date.now() };
    return empty;
  }
  const lastDate = dates[dates.length - 1];
  const backtestStartStr = NY_DATE_FMT.format(new Date(new Date(lastDate).getTime() - backtestDays * 86_400_000));
  const simDates = dates.filter((d) => d >= backtestStartStr);
  const data = { bySymbol, simDates, fullRangeStart: dates[0], fullRangeEnd: lastDate };
  barCache = { key: backtestDays, data, fetchedAt: Date.now() };
  return data;
}
