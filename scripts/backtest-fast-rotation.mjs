#!/usr/bin/env node
// Standalone CLI runner for the Fast Rotation backtest engine (src/lib/fastRotationBacktest.ts).
// Imports the shared engine directly — Node's native TS type-stripping plus that file's
// relative (non-"@/") imports mean no build step or tsconfig-paths tooling is needed here.
//
// Usage: node scripts/backtest-fast-rotation.mjs [--days=90] [--stopPct=1.25] [--targetPct=5]
//                                                 [--riskPct=1] [--maxPositionPct=25] [--maxPositions=5]
//                                                 [--trendFilterDays=0] [--macroDipThreshold=0]
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

const { loadBacktestBars, runBacktest } = await import(path.join(ROOT, "src/lib/fastRotationBacktest.ts"));

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = /^--([\w-]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
const config = {
  backtestDays: Number(args.days ?? 90),
  stopPct: Number(args.stopPct ?? 1.25) / 100,
  targetPct: Number(args.targetPct ?? 5) / 100,
  riskPct: Number(args.riskPct ?? 1) / 100,
  maxPositionPct: Number(args.maxPositionPct ?? 25) / 100,
  maxPositions: Number(args.maxPositions ?? 5),
  startingCash: Number(args.cash ?? 5000),
  trendFilterDays: Number(args.trendFilterDays ?? 0),
  // Default on (-1%): backtesting showed this raises the edge margin; the trend filter didn't,
  // so it stays opt-in. See trading_fast_rotation_strategy memory for the comparison.
  macroDipThreshold: Number(args.macroDipThreshold ?? -1) / 100,
};
const variantArg = args.variant ?? "both";
const variants = variantArg === "raw" ? ["raw"] : variantArg === "zscore" ? ["zscore"] : ["raw", "zscore"];

console.log(
  `Fetching ${57} symbols (${config.backtestDays}d window + warmup buffer, daily bars, split-adjusted, IEX feed)...`
);
const { bySymbol, simDates, fullRangeStart, fullRangeEnd } = await loadBacktestBars(config.backtestDays);
if (simDates.length === 0) {
  console.error("Not enough historical data returned to run this backtest — check Alpaca keys/plan.");
  process.exit(1);
}
console.log(
  `Data: ${fullRangeStart} .. ${fullRangeEnd} (${bySymbol.size} symbols). Simulating ${simDates.length} sessions from ${simDates[0]} to ${simDates[simDates.length - 1]}.\n`
);
console.log(
  `Config: ${config.backtestDays}d window, stop -${(config.stopPct * 100).toFixed(2)}%, target +${(config.targetPct * 100).toFixed(2)}%, ` +
    `risk ${(config.riskPct * 100).toFixed(2)}%/trade, max position ${(config.maxPositionPct * 100).toFixed(0)}%, max ${config.maxPositions} positions, $${config.startingCash} start` +
    (config.trendFilterDays ? `, trend filter >${config.trendFilterDays}d SMA` : "") +
    (config.macroDipThreshold ? `, macro gate universe-median<=${(config.macroDipThreshold * 100).toFixed(2)}%` : "") +
    ".\n"
);

const VARIANT_LABEL = { raw: "Variant A — raw % losers", zscore: "Variant B — volatility-adjusted (z-score) losers" };

function printSummary(result) {
  console.log(`=== ${VARIANT_LABEL[result.variant]} ===`);
  console.log(`  Starting cash:      $${result.startingCash.toFixed(2)}`);
  console.log(`  Ending equity:      $${result.finalEquity.toFixed(2)}  (${result.totalReturnPct >= 0 ? "+" : ""}${result.totalReturnPct.toFixed(2)}%)`);
  console.log(`  Trades opened:      ${result.numTradesOpened}`);
  console.log(`  Trades closed:      ${result.numClosed}  (${result.numTargets} target / ${result.numStops} stop)`);
  console.log(`  Win rate (closed):  ${result.winRate === null ? "n/a" : result.winRate.toFixed(1) + "%"}`);
  console.log(`  Avg hold (closed):  ${result.avgHoldDays === null ? "n/a" : result.avgHoldDays.toFixed(1) + " sessions"}`);
  console.log(`  Max concurrent:     ${result.maxConcurrent} / ${config.maxPositions}`);
  console.log(`  Still open at end:  ${result.openAtEnd ?? result.openPositions.length}  (unrealized P&L $${result.unrealizedPnl.toFixed(2)})`);
  console.log(`  Realized P&L:       $${result.realizedPnl.toFixed(2)}`);
  console.log();
}

const results = variants.map((v) => runBacktest(bySymbol, simDates, config, v));
for (const r of results) printSummary(r);

const outDir = path.join(ROOT, "scripts/output");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = path.join(outDir, `backtest-${stamp}.json`);
writeFileSync(outFile, JSON.stringify({ config, generatedAt: new Date().toISOString(), results }, null, 2));
console.log(`Full trade log + equity curve written to ${path.relative(ROOT, outFile)}`);
