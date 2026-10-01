#!/usr/bin/env node
// Standalone backtest for the "Fast Rotation" strategy (see memory: trading_fast_rotation_strategy.md).
// Daily top-5-losers rotation, buy near close, stop at -1.25%, target at +5%, risk-based sizing
// capped at 25%/position, max 5 concurrent positions. Runs both selection variants (raw % vs
// volatility-adjusted) over the same window so you can compare them.
//
// Usage: node scripts/backtest-fast-rotation.mjs [--days=90] [--stopPct=1.25] [--targetPct=5]
//                                                 [--riskPct=1] [--maxPositionPct=25] [--maxPositions=5]
//                                                 [--variant=both|raw|zscore] [--cash=5000]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// --- env (.env.local isn't auto-loaded outside `next dev`) ---
function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  let text;
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const { alpacaGetMultiBars } = await import(path.join(ROOT, "src/lib/alpaca.ts"));
const { allUSSymbols } = await import(path.join(ROOT, "src/data/tickers.ts"));

// --- CLI args ---
function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = /^--([\w-]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
const CONFIG = {
  backtestDays: Number(args.days ?? 90),
  stopPct: Number(args.stopPct ?? 1.25) / 100,
  targetPct: Number(args.targetPct ?? 5) / 100,
  riskPct: Number(args.riskPct ?? 1) / 100,
  maxPositionPct: Number(args.maxPositionPct ?? 25) / 100,
  maxPositions: Number(args.maxPositions ?? 5),
  startingCash: Number(args.cash ?? 5000),
  variant: args.variant ?? "both",
  minTradeNotional: 10,
};
const VOL_WINDOW = 20;
const MIN_CLOSES_REQUIRED = VOL_WINDOW + 1; // matches src/app/api/opportunities/route.ts

const NY_DATE_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });

// --- fetch bars (extra lookback buffer for z-score warmup + holidays) ---
const FETCH_CALENDAR_DAYS = CONFIG.backtestDays + 90;
console.log(
  `Fetching ${allUSSymbols.length} symbols, ${FETCH_CALENDAR_DAYS}d lookback (daily bars, split-adjusted, IEX feed)...`
);
const now = Date.now();
const raw = await alpacaGetMultiBars(allUSSymbols, {
  timeframe: "1Day",
  start: new Date(now - FETCH_CALENDAR_DAYS * 86_400_000).toISOString(),
  end: new Date(now).toISOString(),
  limit: 10_000,
  adjustment: "split",
});

/** @type {Map<string, {dates: string[], closes: number[], highs: number[], lows: number[], dateIndex: Map<string, number>}>} */
const bySymbol = new Map();
const globalDateSet = new Set();
for (const [sym, bars] of Object.entries(raw)) {
  const sorted = bars.slice().sort((a, b) => a.t.localeCompare(b.t));
  const dates = [];
  const closes = [];
  const highs = [];
  const lows = [];
  const dateIndex = new Map();
  for (const b of sorted) {
    const d = NY_DATE_FMT.format(new Date(b.t));
    dateIndex.set(d, dates.length);
    dates.push(d);
    closes.push(b.c);
    highs.push(b.h);
    lows.push(b.l);
    globalDateSet.add(d);
  }
  bySymbol.set(sym, { dates, closes, highs, lows, dateIndex });
}
const globalDates = Array.from(globalDateSet).sort();
if (globalDates.length < MIN_CLOSES_REQUIRED + CONFIG.backtestDays / 3) {
  console.error("Not enough historical data returned to run this backtest — check Alpaca keys/plan.");
  process.exit(1);
}

const lastDate = globalDates[globalDates.length - 1];
const backtestStartStr = NY_DATE_FMT.format(new Date(new Date(lastDate).getTime() - CONFIG.backtestDays * 86_400_000));
const simDates = globalDates.filter((d) => d >= backtestStartStr);
console.log(
  `Data: ${globalDates[0]} .. ${lastDate} (${globalDates.length} sessions). Simulating ${simDates.length} sessions from ${simDates[0]} to ${lastDate}.\n`
);

function stddev(returns) {
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

/** Replicates src/app/api/opportunities/route.ts's changePercent/zScore exactly, for a given symbol+date. */
function metricsFor(sym, date) {
  const s = bySymbol.get(sym);
  if (!s) return null;
  const idx = s.dateIndex.get(date);
  if (idx === undefined || idx < 1) return null;
  const latest = s.closes[idx];
  const prev = s.closes[idx - 1];
  if (prev === 0) return null;
  const changePercent = ((latest - prev) / prev) * 100;
  let zScore = null;
  if (idx + 1 >= MIN_CLOSES_REQUIRED) {
    const window = s.closes.slice(idx + 1 - MIN_CLOSES_REQUIRED, idx + 1);
    const dailyReturns = [];
    for (let i = 1; i < window.length; i++) {
      if (window[i - 1] === 0) continue;
      dailyReturns.push(((window[i] - window[i - 1]) / window[i - 1]) * 100);
    }
    if (dailyReturns.length >= VOL_WINDOW - 2) {
      const sd = stddev(dailyReturns);
      zScore = sd > 0 ? changePercent / sd : null;
    }
  }
  return { changePercent, zScore, idx };
}

function barOn(sym, date) {
  const s = bySymbol.get(sym);
  if (!s) return null;
  const idx = s.dateIndex.get(date);
  if (idx === undefined) return null;
  return { close: s.closes[idx], high: s.highs[idx], low: s.lows[idx] };
}

function runVariant(label, rankFn) {
  let cash = CONFIG.startingCash;
  /** @type {{symbol:string, entryDate:string, entryPrice:number, shares:number, stopPrice:number, targetPrice:number}[]} */
  let positions = [];
  const closedTrades = [];
  const equityCurve = [];
  let maxConcurrent = 0;
  let skippedFullSlots = 0;
  const lastKnownClose = new Map();

  for (const date of simDates) {
    // 1. Check open positions for stop/target (position was entered on a strictly earlier date,
    //    so there's always at least one prior session's worth of price action to check against).
    const stillOpen = [];
    for (const pos of positions) {
      const bar = barOn(pos.symbol, date);
      if (!bar) {
        stillOpen.push(pos); // halted/no print that day — leave it open, check again next session
        continue;
      }
      lastKnownClose.set(pos.symbol, bar.close);
      let exit = null;
      if (bar.low <= pos.stopPrice) exit = { price: pos.stopPrice, reason: "stop" }; // stop wins ties
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

    // 2. Mark-to-market equity ahead of today's buys (for risk-based sizing below).
    const equityNow = () =>
      cash + positions.reduce((sum, p) => sum + p.shares * (barOn(p.symbol, date)?.close ?? lastKnownClose.get(p.symbol) ?? p.entryPrice), 0);

    // 3. Rank today's candidates, excluding symbols already held.
    const held = new Set(positions.map((p) => p.symbol));
    const candidates = [];
    for (const sym of allUSSymbols) {
      if (held.has(sym)) continue;
      const m = metricsFor(sym, date);
      if (!m) continue;
      candidates.push({ symbol: sym, ...m });
    }
    const ranked = rankFn(candidates);

    // 4. Buy into open slots, worst-ranked first, until full or out of candidates.
    let slots = CONFIG.maxPositions - positions.length;
    if (ranked.length > slots) skippedFullSlots += ranked.length - slots > 0 ? 1 : 0;
    for (const c of ranked) {
      if (slots <= 0) break;
      const bar = barOn(c.symbol, date);
      if (!bar) continue;
      const entryPrice = bar.close;
      const stopPrice = entryPrice * (1 - CONFIG.stopPct);
      const targetPrice = entryPrice * (1 + CONFIG.targetPct);
      const eq = equityNow();
      const riskDollar = CONFIG.riskPct * eq;
      const notionalByRisk = riskDollar / CONFIG.stopPct; // = riskDollar / (stopDistance/entryPrice)
      const notionalCap = CONFIG.maxPositionPct * eq;
      const notional = Math.min(notionalByRisk, notionalCap, cash);
      if (notional < CONFIG.minTradeNotional) continue;
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
  const unrealizedPnl = positions.reduce((s, p) => s + (lastKnownClose.get(p.symbol) - p.entryPrice) * p.shares, 0);

  return {
    label,
    config: CONFIG,
    startingCash: CONFIG.startingCash,
    finalEquity,
    totalReturnPct: ((finalEquity - CONFIG.startingCash) / CONFIG.startingCash) * 100,
    numTradesOpened: numClosed + positions.length,
    numClosed,
    numStops,
    numTargets,
    winRate,
    avgHoldDays,
    maxConcurrent,
    openAtEnd: positions.length,
    realizedPnl,
    unrealizedPnl,
    closedTrades,
    openPositions: positions,
    equityCurve,
  };
}

function rankRaw(candidates) {
  return candidates
    .slice()
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, CONFIG.maxPositions);
}
function rankZScore(candidates) {
  return candidates
    .filter((c) => c.zScore !== null && c.zScore < 0)
    .sort((a, b) => a.zScore - b.zScore)
    .slice(0, CONFIG.maxPositions);
}

function printSummary(result) {
  console.log(`=== ${result.label} ===`);
  console.log(`  Starting cash:      $${result.startingCash.toFixed(2)}`);
  console.log(`  Ending equity:      $${result.finalEquity.toFixed(2)}  (${result.totalReturnPct >= 0 ? "+" : ""}${result.totalReturnPct.toFixed(2)}%)`);
  console.log(`  Trades opened:      ${result.numTradesOpened}`);
  console.log(`  Trades closed:      ${result.numClosed}  (${result.numTargets} target / ${result.numStops} stop)`);
  console.log(`  Win rate (closed):  ${result.winRate === null ? "n/a" : result.winRate.toFixed(1) + "%"}`);
  console.log(`  Avg hold (closed):  ${result.avgHoldDays === null ? "n/a" : result.avgHoldDays.toFixed(1) + " sessions"}`);
  console.log(`  Max concurrent:     ${result.maxConcurrent} / ${CONFIG.maxPositions}`);
  console.log(`  Still open at end:  ${result.openAtEnd}  (unrealized P&L $${result.unrealizedPnl.toFixed(2)})`);
  console.log(`  Realized P&L:       $${result.realizedPnl.toFixed(2)}`);
  console.log();
}

console.log(
  `Config: ${CONFIG.backtestDays}d window, stop -${(CONFIG.stopPct * 100).toFixed(2)}%, target +${(CONFIG.targetPct * 100).toFixed(2)}%, ` +
    `risk ${(CONFIG.riskPct * 100).toFixed(2)}%/trade, max position ${(CONFIG.maxPositionPct * 100).toFixed(0)}%, max ${CONFIG.maxPositions} positions, $${CONFIG.startingCash} start.\n`
);

const results = [];
if (CONFIG.variant === "both" || CONFIG.variant === "raw") {
  results.push(runVariant("Variant A — raw % losers", rankRaw));
}
if (CONFIG.variant === "both" || CONFIG.variant === "zscore") {
  results.push(runVariant("Variant B — volatility-adjusted (z-score) losers", rankZScore));
}
for (const r of results) printSummary(r);

const outDir = path.join(ROOT, "scripts/output");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = path.join(outDir, `backtest-${stamp}.json`);
writeFileSync(outFile, JSON.stringify({ config: CONFIG, generatedAt: new Date().toISOString(), results }, null, 2));
console.log(`Full trade log + equity curve written to ${path.relative(ROOT, outFile)}`);
