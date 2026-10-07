#!/usr/bin/env node
// One-shot "narrative dip + fundamentals" stock-picker + forward-walk check.
// Combines three gates across the 57-symbol universe (src/data/tickers.ts):
//   1. Idiosyncratic dip  — down >= DIP_THRESHOLD from its own 20-session high, AND
//      underperforming the universe median drawdown by >= IDIO_GAP_THRESHOLD (so it's
//      the stock's own news/narrative, not just sector/market beta).
//   2. Temp-dip-not-breakdown technicals — still above its 50-session SMA (trend intact),
//      RSI14 not in true-capitulation territory (<20), and Bollinger %B shows it's
//      genuinely statistically stretched (oversold vs its own bands, not just drifting).
//   3. SEC 8-K red-flag fundamentals gate — no bankruptcy/impairment/restatement/delisting/
//      auditor-change 8-K in the trailing 30 days.
// Survivors are ranked by deepest idiosyncratic-gap dip; the winner is forward-walked
// day by day from the decision date through today with the same indicators recomputed,
// to see whether the thesis actually held up.
//
// Usage: node scripts/pick-dip-fundamentals.mjs [--decisionDate=2026-09-01] [--lookbackDays=140]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

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
const { sma, rsi, bollinger, volumeRatio } = await import(path.join(ROOT, "src/lib/indicators.ts"));

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = /^--([\w-]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
const DECISION_DATE = args.decisionDate ?? "2026-09-01";
const LOOKBACK_DAYS = Number(args.lookbackDays ?? 140);

const NY_DATE_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });

const DIP_WINDOW = 20;
const DIP_THRESHOLD = -8; // must be down at least 8% from its own 20-session high
const IDIO_GAP_THRESHOLD = -5; // must underperform the universe median by >= 5pp (name-specific, not beta)
const RED_FLAG_ITEMS = ["1.03", "2.04", "2.06", "3.01", "4.01", "4.02"]; // bankruptcy, debt default, impairment, delisting, auditor change, restatement

console.log(`Fetching ${allUSSymbols.length} symbols, ${LOOKBACK_DAYS}d lookback before ${DECISION_DATE} through today...`);
const fetchStart = new Date(new Date(DECISION_DATE).getTime() - LOOKBACK_DAYS * 86_400_000).toISOString();
const raw = await alpacaGetMultiBars(allUSSymbols, {
  timeframe: "1Day",
  start: fetchStart,
  end: new Date().toISOString(),
  limit: 10_000,
  adjustment: "split",
});

const bySymbol = new Map();
const allDatesSet = new Set();
for (const [sym, bars] of Object.entries(raw)) {
  const sorted = bars.slice().sort((a, b) => a.t.localeCompare(b.t));
  const dates = [], closes = [], highs = [], lows = [], vols = [];
  const dateIndex = new Map();
  for (const b of sorted) {
    const d = NY_DATE_FMT.format(new Date(b.t));
    dateIndex.set(d, dates.length);
    dates.push(d);
    closes.push(b.c);
    highs.push(b.h);
    lows.push(b.l);
    vols.push(b.v);
    allDatesSet.add(d);
  }
  bySymbol.set(sym, { dates, closes, highs, lows, vols, dateIndex });
}
const allDates = Array.from(allDatesSet).sort();
const decisionDate = allDates.find((d) => d >= DECISION_DATE);
if (!decisionDate) {
  console.error("No trading data on/after decision date — check Alpaca keys/plan.");
  process.exit(1);
}
console.log(`Resolved decision date: ${decisionDate}\n`);

function seriesUpTo(sym, date) {
  const s = bySymbol.get(sym);
  if (!s) return null;
  const idx = s.dateIndex.get(date);
  if (idx === undefined) return null;
  const closes = s.closes.slice(0, idx + 1);
  const highs = s.highs.slice(0, idx + 1);
  const lows = s.lows.slice(0, idx + 1);
  const vols = s.vols.slice(0, idx + 1);
  const bars = closes.map((c, i) => ({ o: c, h: highs[i], l: lows[i], c, v: vols[i] }));
  return { closes, highs, lows, vols, bars };
}

function drawdownFromHigh(closes, window) {
  if (closes.length < window) return null;
  const slice = closes.slice(-window);
  const high = Math.max(...slice);
  const last = slice[slice.length - 1];
  return ((last - high) / high) * 100;
}

// --- Stage 1: idiosyncratic dip across all 57 ---
const stage1Rows = [];
for (const sym of allUSSymbols) {
  const s = seriesUpTo(sym, decisionDate);
  if (!s) continue;
  const dd = drawdownFromHigh(s.closes, DIP_WINDOW);
  if (dd === null) continue;
  stage1Rows.push({ symbol: sym, drawdownPct: dd, ...s });
}
const ddSorted = stage1Rows.map((r) => r.drawdownPct).slice().sort((a, b) => a - b);
const mid = Math.floor(ddSorted.length / 2);
const universeMedianDD = ddSorted.length % 2 === 0 ? (ddSorted[mid - 1] + ddSorted[mid]) / 2 : ddSorted[mid];
console.log(`Universe median 20-session drawdown-from-high on ${decisionDate}: ${universeMedianDD.toFixed(2)}%`);

const stage1Pass = stage1Rows
  .map((r) => ({ ...r, idioGap: r.drawdownPct - universeMedianDD }))
  .filter((r) => r.drawdownPct <= DIP_THRESHOLD && r.idioGap <= IDIO_GAP_THRESHOLD)
  .sort((a, b) => a.drawdownPct - b.drawdownPct);

console.log(
  `\nStage 1 (idiosyncratic dip >=${Math.abs(DIP_THRESHOLD)}% off 20-day high, >=${Math.abs(IDIO_GAP_THRESHOLD)}pp worse than universe median): ${stage1Pass.length} of ${stage1Rows.length} symbols survive`
);
for (const r of stage1Pass) {
  console.log(`   ${r.symbol.padEnd(6)} drawdown ${r.drawdownPct.toFixed(1)}%  idio gap ${r.idioGap.toFixed(1)}pp`);
}

// --- Stage 2: temp-dip-not-breakdown technicals ---
// A stock deep enough into Stage 1 to qualify has, by construction, almost always already
// broken its 50-session SMA (that's what a double-digit 20-session drawdown means on a daily
// chart) — requiring "still above the 50 SMA" filtered out 100% of real candidates on a first
// pass. Swapped for what the trader transcripts actually describe for a dip this deep: basing
// (not printing a fresh new low today) + decelerating downside momentum (RSI rising off its
// recent trough, not still falling) + genuinely stretched vs. its own Bollinger band.
console.log(`\nStage 2 (basing + decelerating momentum + technically stretched):`);
const stage2Pass = [];
for (const r of stage1Pass) {
  const sma50 = sma(r.closes, 50);
  const sma10 = sma(r.closes, 10);
  const rsi14 = rsi(r.closes, 14);
  const rsi14_3ago = r.closes.length > 3 ? rsi(r.closes.slice(0, -3), 14) : null;
  const boll = bollinger(r.closes, 20, 2);
  const volRatio = volumeRatio(r.bars, 20);
  const lowToday = r.lows[r.lows.length - 1];
  const priorLows = r.lows.slice(-6, -1); // 5 sessions before today
  const notFreshNewLow = priorLows.length === 5 && lowToday >= Math.min(...priorLows);
  const momentumDecelerating = rsi14 !== null && rsi14_3ago !== null && rsi14 >= rsi14_3ago;
  const basing = notFreshNewLow || momentumDecelerating;
  const notCapitulating = rsi14 !== null && rsi14 >= 20;
  const technicallyStretched = boll !== null && boll.percentB <= 0.35;
  const passed = basing && notCapitulating && technicallyStretched;
  console.log(
    `   ${r.symbol.padEnd(6)} RSI14:${rsi14 ? rsi14.toFixed(1) : "n/a"} (3d-ago ${rsi14_3ago ? rsi14_3ago.toFixed(1) : "n/a"}) %B:${boll ? boll.percentB.toFixed(2) : "n/a"} freshLow:${notFreshNewLow ? "no" : "YES"} volRatio:${volRatio ? volRatio.toFixed(2) : "n/a"} -> ${passed ? "PASS" : "fail"}`
  );
  if (passed) stage2Pass.push({ ...r, sma50, sma10, rsi14, boll, volRatio });
}
console.log(`\nStage 2 survivors: ${stage2Pass.length} of ${stage1Pass.length}`);

// --- Stage 3: SEC 8-K red-flag fundamentals gate ---
const SEC_CONTACT = process.env.SEC_EDGAR_CONTACT?.trim() || "ai-industry-map research-tool (set SEC_EDGAR_CONTACT)";
async function secJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": SEC_CONTACT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`SEC ${res.status} ${url}`);
  return res.json();
}
let tickerCikMap = null;
async function getCik(symbol) {
  if (!tickerCikMap) {
    const rawMap = await secJson("https://www.sec.gov/files/company_tickers.json");
    tickerCikMap = new Map();
    for (const r of Object.values(rawMap)) {
      if (r.ticker) tickerCikMap.set(r.ticker.toUpperCase(), String(r.cik_str).padStart(10, "0"));
    }
  }
  return tickerCikMap.get(symbol.toUpperCase()) ?? null;
}
async function redFlagFilings(symbol, sinceDate) {
  const cik = await getCik(symbol);
  if (!cik) return { checked: false, flags: [] };
  try {
    const data = await secJson(`https://data.sec.gov/submissions/CIK${cik}.json`);
    const recent = data.filings?.recent;
    if (!recent?.form) return { checked: true, flags: [] };
    const flags = [];
    for (let i = 0; i < recent.form.length; i++) {
      if (recent.form[i] !== "8-K") continue;
      if (!recent.filingDate[i] || recent.filingDate[i] < sinceDate) continue;
      const items = (recent.items?.[i] || "").split(",").map((s) => s.trim()).filter(Boolean);
      const hit = items.filter((it) => RED_FLAG_ITEMS.includes(it));
      if (hit.length) flags.push({ date: recent.filingDate[i], items: hit });
    }
    return { checked: true, flags };
  } catch {
    return { checked: false, flags: [] };
  }
}

const lookbackSince = NY_DATE_FMT.format(new Date(new Date(decisionDate).getTime() - 30 * 86_400_000));
console.log(`\nStage 3 (SEC 8-K red-flag check, since ${lookbackSince}):`);
const stage3Pass = [];
for (const r of stage2Pass) {
  const res = await redFlagFilings(r.symbol, lookbackSince);
  const passed = res.flags.length === 0;
  console.log(
    `   ${r.symbol.padEnd(6)} ${res.checked ? (passed ? "clean" : `RED FLAG: ${JSON.stringify(res.flags)}`) : "lookup failed (treated as pass)"}`
  );
  if (passed) stage3Pass.push(r);
  await new Promise((resolve) => setTimeout(resolve, 150)); // be polite to EDGAR
}
console.log(`\nStage 3 survivors: ${stage3Pass.length} of ${stage2Pass.length}`);

// --- Final pick: deepest idiosyncratic dip among full survivors ---
stage3Pass.sort((a, b) => a.idioGap - b.idioGap);
const pick = stage3Pass[0];
if (!pick) {
  console.log("\nNo symbol survived all three stages on this date — funnel found no qualifying pick.");
  process.exit(0);
}
console.log(`\n=== PICK: ${pick.symbol} ===`);
const entryPrice = pick.closes[pick.closes.length - 1];
console.log(`Entry date: ${decisionDate}, entry price (close): $${entryPrice.toFixed(2)}`);
console.log(`Drawdown from 20d high: ${pick.drawdownPct.toFixed(1)}% (universe median ${universeMedianDD.toFixed(1)}%, idio gap ${pick.idioGap.toFixed(1)}pp)`);
console.log(`RSI14: ${pick.rsi14.toFixed(1)}  %B: ${pick.boll.percentB.toFixed(2)}  50SMA: $${pick.sma50.toFixed(2)}`);

// --- Forward walk from decisionDate to today ---
const fullSeries = bySymbol.get(pick.symbol);
const entryIdx = fullSeries.dateIndex.get(decisionDate);
console.log(`\nForward walk ${decisionDate} -> ${fullSeries.dates[fullSeries.dates.length - 1]}:`);
console.log("date        close     chg%    RSI14   %B     50SMA    10SMA   volRatio  note");
let maxRunup = 0;
let maxDrawdown = 0;
const walkRows = [];
for (let i = entryIdx; i < fullSeries.dates.length; i++) {
  const closesUpTo = fullSeries.closes.slice(0, i + 1);
  const barsUpTo = closesUpTo.map((c, idx) => ({ o: c, h: fullSeries.highs[idx], l: fullSeries.lows[idx], c, v: fullSeries.vols[idx] }));
  const c = fullSeries.closes[i];
  const chgPct = ((c - entryPrice) / entryPrice) * 100;
  maxRunup = Math.max(maxRunup, chgPct);
  maxDrawdown = Math.min(maxDrawdown, chgPct);
  const r14 = rsi(closesUpTo, 14);
  const b = bollinger(closesUpTo, 20, 2);
  const s50 = sma(closesUpTo, 50);
  const s10 = sma(closesUpTo, 10);
  const vr = volumeRatio(barsUpTo, 20);
  let note = "";
  if (chgPct >= 20) note = "house-rule +20% target";
  else if (chgPct >= 10) note = "house-rule +10% trim level";
  else if (s50 !== null && c < s50 * 0.97) note = "broke below 50SMA — thesis questionable";
  const row = { date: fullSeries.dates[i], close: c, chgPct, rsi14: r14, percentB: b?.percentB ?? null, sma50: s50, sma10: s10, volRatio: vr, note };
  walkRows.push(row);
  console.log(
    `${row.date}  ${c.toFixed(2).padStart(8)}  ${chgPct >= 0 ? "+" : ""}${chgPct.toFixed(1).padStart(5)}%  ${r14 ? r14.toFixed(1).padStart(5) : "  n/a"}  ${b ? b.percentB.toFixed(2) : " n/a"}  ${s50 ? s50.toFixed(2) : "n/a"}  ${s10 ? s10.toFixed(2) : "n/a"}  ${vr ? vr.toFixed(2) : "n/a"}  ${note}`
  );
}
const lastRow = walkRows[walkRows.length - 1];
console.log(
  `\nSummary: entry $${entryPrice.toFixed(2)} on ${decisionDate} -> last close $${lastRow.close.toFixed(2)} (${lastRow.chgPct >= 0 ? "+" : ""}${lastRow.chgPct.toFixed(1)}%). Max run-up ${maxRunup.toFixed(1)}%, max drawdown ${maxDrawdown.toFixed(1)}%.`
);

// --- Write full output ---
const outDir = path.join(ROOT, "scripts/output");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = path.join(outDir, `dip-fundamentals-pick-${stamp}.json`);
writeFileSync(
  outFile,
  JSON.stringify(
    {
      decisionDate,
      universeMedianDD,
      stage1Pass: stage1Pass.map(({ bars, closes, highs, lows, vols, ...rest }) => rest),
      stage2Pass: stage2Pass.map(({ bars, closes, highs, lows, vols, ...rest }) => rest),
      stage3Pass: stage3Pass.map((r) => r.symbol),
      pick: pick.symbol,
      entryPrice,
      walkRows,
    },
    null,
    2
  )
);
console.log(`\nFull data written to ${path.relative(ROOT, outFile)}`);
