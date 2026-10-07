#!/usr/bin/env node
// Per-stock dip checklist, scoped to a single day's top-N raw losers only.
//
// Philosophy, on purpose: NO cross-sectional/cohort math is used to decide anything.
// Each of the 57 universe symbols is a different company with its own business model —
// comparing one day's drawdown against the day's universe median (as an earlier pass at
// this did) treats them as interchangeable, which they aren't. So:
//   1. Pick the day's top N losers by plain day-over-day % change (same as the app's
//      "Top Losers" panel) — no idiosyncratic-vs-median filtering at the selection step.
//   2. For EACH of those N, independently, run a checklist that only looks at that one
//      company's own price history, own financial snapshot, own news, own filings.
//   3. Only at the very end, print the N scorecards side by side — a display, not a filter.
//
// Usage: node scripts/dip-stock-checklist.mjs [--date=2026-09-01] [--top=10]

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
const { allTickerRows } = await import(path.join(ROOT, "src/data/tickers.ts"));
const { nodeById } = await import(path.join(ROOT, "src/data/industry-map.ts"));
const { finnhubGet, getFinnhubKey } = await import(path.join(ROOT, "src/lib/finnhub.ts"));

// secFilings.ts imports via the "@/lib" tsconfig path alias, which plain Node ESM can't
// resolve outside Next's build step — so SEC EDGAR access is reimplemented inline here
// (same free, keyless endpoints: company_tickers.json + submissions API).
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
function filingDocUrl(cik, accessionNumber, primaryDocument) {
  const cikNoLeadingZeros = String(Number(cik));
  const accessionNoDashes = accessionNumber.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cikNoLeadingZeros}/${accessionNoDashes}/${primaryDocument}`;
}
async function fetchForm4TransactionCodes(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": SEC_CONTACT } });
    if (!res.ok) return [];
    const xml = await res.text();
    return Array.from(xml.matchAll(/<transactionCode>([A-Z])<\/transactionCode>/g)).map((m) => m[1]);
  } catch {
    return [];
  }
}
const MAX_FORM4_CHECKS_PER_SYMBOL = 3;
async function fetchRecentFilingsForSymbol(symbol, sinceDate) {
  const cik = await getCik(symbol);
  if (!cik) return [];
  try {
    const data = await secJson(`https://data.sec.gov/submissions/CIK${cik}.json`);
    const recent = data.filings?.recent;
    if (!recent?.form) return [];
    const events = [];
    let form4Checked = 0;
    for (let i = 0; i < recent.form.length; i++) {
      const date = recent.filingDate[i];
      if (!date || date < sinceDate) continue;
      const form = recent.form[i];
      if (form === "8-K") {
        events.push({ form: "8-K", filingDate: date, items: recent.items?.[i] || "" });
      } else if (form === "4" && form4Checked < MAX_FORM4_CHECKS_PER_SYMBOL) {
        form4Checked++;
        // primaryDocument in submissions.json points at the XSL-rendered human view; the
        // raw XML with <transactionCode> lives at the accession root under its own basename.
        const basename = (recent.primaryDocument[i] || "").split("/").pop();
        if (!basename) continue;
        const rawXmlUrl = filingDocUrl(cik, recent.accessionNumber[i], basename);
        const codes = await fetchForm4TransactionCodes(rawXmlUrl);
        if (codes.includes("P")) events.push({ form: "4", filingDate: date });
      }
    }
    return events;
  } catch {
    return [];
  }
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = /^--([\w-]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
const REQUESTED_DATE = args.date ?? null; // null => most recent trading day
const TOP_N = Number(args.top ?? 10);
const LOOKBACK_DAYS = 3 * 365 + 60; // ~3yr so each stock's own drawdown/recovery precedent has real sample size

const NY_DATE_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });
const fmtDay = (d) => d.toISOString().slice(0, 10);

const symbols = Array.from(new Set(allTickerRows.filter((r) => r.isUS).map((r) => r.symbol)));
const symbolMeta = new Map();
for (const row of allTickerRows) {
  if (!row.isUS || symbolMeta.has(row.symbol)) continue;
  const node = nodeById[row.nodeId];
  symbolMeta.set(row.symbol, { name: node?.name ?? row.symbol, layer: node?.layer ?? "Other" });
}

console.log(`Fetching ${symbols.length} symbols, ${LOOKBACK_DAYS}d lookback through today...`);
const fetchStart = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
const raw = await alpacaGetMultiBars(symbols, {
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
  const dates = [], closes = [], highs = [], lows = [];
  const dateIndex = new Map();
  for (const b of sorted) {
    const d = NY_DATE_FMT.format(new Date(b.t));
    dateIndex.set(d, dates.length);
    dates.push(d);
    closes.push(b.c);
    highs.push(b.h);
    lows.push(b.l);
    allDatesSet.add(d);
  }
  bySymbol.set(sym, { dates, closes, highs, lows, dateIndex });
}
const allDates = Array.from(allDatesSet).sort();
const decisionDate = REQUESTED_DATE
  ? allDates.filter((d) => d <= REQUESTED_DATE).pop()
  : allDates[allDates.length - 1];
if (!decisionDate) {
  console.error("No trading data resolves for the requested date.");
  process.exit(1);
}
console.log(`Decision date: ${decisionDate}\n`);

// --- Step 1: day's top-N losers, plain % change, no cohort filtering ---
const dayMoves = [];
for (const sym of symbols) {
  const s = bySymbol.get(sym);
  if (!s) continue;
  const idx = s.dateIndex.get(decisionDate);
  if (idx === undefined || idx === 0) continue;
  const close = s.closes[idx];
  const prevClose = s.closes[idx - 1];
  if (!prevClose) continue;
  dayMoves.push({ symbol: sym, close, prevClose, changePct: ((close - prevClose) / prevClose) * 100, idx });
}
dayMoves.sort((a, b) => a.changePct - b.changePct);
const losers = dayMoves.slice(0, TOP_N);
console.log(`Top ${TOP_N} losers on ${decisionDate}:`);
for (const l of losers) {
  const meta = symbolMeta.get(l.symbol) ?? { name: l.symbol, layer: "Other" };
  console.log(`   ${l.symbol.padEnd(6)} ${l.changePct.toFixed(2).padStart(7)}%   $${l.close.toFixed(2)}   ${meta.name} (${meta.layer})`);
}
console.log("");

// --- Per-stock checklist helpers (each only ever looks at ONE symbol's own data) ---

function ownHistoryPrecedent(s, idx) {
  // Scan this stock's own closes UP TO idx (no lookahead) for prior 20-session
  // drawdown-from-high episodes of similar-or-greater magnitude to today's, then measure
  // THIS SAME STOCK's own forward return at +20 and +60 sessions from each past episode.
  const WINDOW = 20;
  if (idx < WINDOW) return { today: null, episodes: [] };
  const ddAt = (i) => {
    if (i < WINDOW) return null;
    const slice = s.closes.slice(i - WINDOW + 1, i + 1);
    const high = Math.max(...slice);
    return ((s.closes[i] - high) / high) * 100;
  };
  const today = ddAt(idx);
  if (today === null) return { today: null, episodes: [] };
  const episodes = [];
  let lastEpisode = -999;
  for (let i = WINDOW; i < idx - 20; i++) {
    // -20 so we always have at least some forward window to measure, even short of 60
    const dd = ddAt(i);
    if (dd === null || dd > today) continue; // only count episodes at least as deep as today's
    if (i - lastEpisode < 15) continue; // de-dupe the same multi-day episode
    lastEpisode = i;
    const entry = s.closes[i];
    const at20 = idx >= i + 20 ? ((s.closes[i + 20] - entry) / entry) * 100 : null;
    const at60 = idx >= i + 60 ? ((s.closes[i + 60] - entry) / entry) * 100 : null;
    episodes.push({ date: s.dates[i], drawdownPct: dd, fwd20Pct: at20, fwd60Pct: at60 });
  }
  return { today, episodes };
}

function ownRangePosition(s, idx) {
  const win1y = s.closes.slice(Math.max(0, idx - 251), idx + 1);
  const win2y = s.closes.slice(Math.max(0, idx - 503), idx + 1);
  const pct = (win) => {
    const hi = Math.max(...win);
    const lo = Math.min(...win);
    if (hi === lo) return null;
    return ((s.closes[idx] - lo) / (hi - lo)) * 100; // 0 = at own low, 100 = at own high
  };
  return {
    pct1y: win1y.length > 20 ? pct(win1y) : null,
    pct2y: win2y.length > 100 ? pct(win2y) : null,
    high1y: win1y.length > 20 ? Math.max(...win1y) : null,
  };
}

async function finnhubMetric(symbol) {
  try {
    const data = await finnhubGet("/stock/metric", { symbol, metric: "all" });
    const m = data?.metric ?? {};
    return {
      peTTM: m.peBasicExclExtraTTM ?? m.peExclExtraTTM ?? m.peNormalizedAnnual ?? null,
      netMarginTTM: m.netProfitMarginTTM ?? null,
      debtToEquity: m["totalDebt/totalEquityAnnual"] ?? m["totalDebt/totalEquityQuarterly"] ?? null,
      roeTTM: m.roeTTM ?? null,
      currentRatio: m.currentRatioAnnual ?? null,
      week52High: m["52WeekHigh"] ?? null,
      week52Low: m["52WeekLow"] ?? null,
    };
  } catch {
    return null;
  }
}

async function finnhubPriceTarget(symbol) {
  try {
    const t = await finnhubGet("/stock/price-target", { symbol });
    if (t?.targetMean == null) return null;
    return { mean: t.targetMean, high: t.targetHigh ?? null, low: t.targetLow ?? null };
  } catch {
    return null;
  }
}

async function newsAround(symbol, centerDate) {
  const center = new Date(centerDate);
  const from = fmtDay(new Date(center.getTime() - 3 * 86_400_000));
  const to = fmtDay(new Date(center.getTime() + 3 * 86_400_000));
  try {
    const items = await finnhubGet("/company-news", { symbol, from, to });
    return (Array.isArray(items) ? items : [])
      .filter((it) => it.headline)
      .slice(0, 6)
      .map((it) => ({ date: fmtDay(new Date((it.datetime ?? 0) * 1000)), headline: it.headline, source: it.source }));
  } catch {
    return [];
  }
}

async function nextEarnings(symbol, afterDate) {
  const from = afterDate;
  const to = fmtDay(new Date(new Date(afterDate).getTime() + 45 * 86_400_000));
  try {
    const data = await finnhubGet("/calendar/earnings", { symbol, from, to });
    const rows = (data?.earningsCalendar ?? []).filter((r) => r.date >= afterDate).sort((a, b) => (a.date < b.date ? -1 : 1));
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

const RED_FLAG_ITEMS = ["1.03", "2.04", "2.06", "3.01", "4.01", "4.02"];
async function redFlags8K(symbol, sinceDate) {
  try {
    const events = await fetchRecentFilingsForSymbol(symbol, sinceDate);
    return events.filter((e) => e.form === "8-K" && (e.items ?? "").split(",").some((it) => RED_FLAG_ITEMS.includes(it.trim())));
  } catch {
    return [];
  }
}
async function insiderBuysAfter(symbol, sinceDate) {
  try {
    const events = await fetchRecentFilingsForSymbol(symbol, sinceDate);
    return events.filter((e) => e.form === "4");
  } catch {
    return [];
  }
}

function verdict(pass, caution) {
  if (pass) return "PASS";
  if (caution) return "CAUTION";
  return "FAIL";
}

const hasFinnhub = getFinnhubKey() !== null;
const results = [];

for (const l of losers) {
  const sym = l.symbol;
  const meta = symbolMeta.get(sym) ?? { name: sym, layer: "Other" };
  const s = bySymbol.get(sym);
  const idx = l.idx;

  console.log(`\n${"=".repeat(70)}\n${sym} — ${meta.name} (${meta.layer})`);
  console.log(`Dropped ${l.changePct.toFixed(2)}% on ${decisionDate} to $${l.close.toFixed(2)}`);

  // 1. Own-history precedent
  const precedent = ownHistoryPrecedent(s, idx);
  let precedentVerdict = "N/A";
  if (precedent.episodes.length >= 3) {
    const withFwd20 = precedent.episodes.filter((e) => e.fwd20Pct !== null);
    const hitRate20 = withFwd20.length ? withFwd20.filter((e) => e.fwd20Pct > 0).length / withFwd20.length : null;
    const avgFwd20 = withFwd20.length ? withFwd20.reduce((sum, e) => sum + e.fwd20Pct, 0) / withFwd20.length : null;
    precedentVerdict = verdict(hitRate20 !== null && hitRate20 >= 0.6 && avgFwd20 > 0, hitRate20 !== null && hitRate20 >= 0.4);
    console.log(
      `[Own-history precedent] ${precedent.episodes.length} prior episodes of a >=${Math.abs(precedent.today).toFixed(1)}% 20-day drawdown. ` +
        `+20d hit rate ${hitRate20 !== null ? (hitRate20 * 100).toFixed(0) + "%" : "n/a"}, avg +20d return ${avgFwd20 !== null ? avgFwd20.toFixed(1) + "%" : "n/a"} -> ${precedentVerdict}`
    );
  } else {
    console.log(`[Own-history precedent] Only ${precedent.episodes.length} prior comparable episode(s) in ${Math.round(LOOKBACK_DAYS / 365)}yr of data — not enough sample to judge -> N/A`);
  }

  // 2. Position in own price range
  const range = ownRangePosition(s, idx);
  const rangeVerdict = range.pct1y !== null ? verdict(range.pct1y <= 30, range.pct1y <= 50) : "N/A";
  if (range.pct1y !== null) {
    console.log(`[Position in own 1yr range] ${range.pct1y.toFixed(0)}th percentile of its own 52-week range (0=own low, 100=own high) -> ${rangeVerdict}`);
  }

  // 3. Financial quality + valuation snapshot (own numbers, no peer comparison)
  let qualityVerdict = "N/A";
  if (hasFinnhub) {
    const m = await finnhubMetric(sym);
    if (m) {
      const qualityOk = m.netMarginTTM !== null && m.netMarginTTM > 0 && (m.debtToEquity === null || m.debtToEquity < 2);
      qualityVerdict = verdict(qualityOk, m.netMarginTTM !== null && m.netMarginTTM > -5);
      console.log(
        `[Financial quality] net margin TTM ${m.netMarginTTM !== null ? m.netMarginTTM.toFixed(1) + "%" : "n/a"}, ` +
          `debt/equity ${m.debtToEquity !== null ? m.debtToEquity.toFixed(2) : "n/a"}, ROE ${m.roeTTM !== null ? m.roeTTM.toFixed(1) + "%" : "n/a"}, P/E(TTM) ${m.peTTM !== null ? m.peTTM.toFixed(1) : "n/a"} -> ${qualityVerdict}`
      );
    } else {
      console.log(`[Financial quality] Finnhub metric lookup failed/unavailable -> N/A`);
    }
  }

  // 4. Margin of safety vs analyst target
  let mosVerdict = "N/A";
  if (hasFinnhub) {
    const pt = await finnhubPriceTarget(sym);
    if (pt) {
      const upside = ((pt.mean - l.close) / l.close) * 100;
      mosVerdict = verdict(upside >= 15, upside >= 0);
      console.log(`[Margin of safety] analyst mean target $${pt.mean.toFixed(2)} vs close $${l.close.toFixed(2)} = ${upside >= 0 ? "+" : ""}${upside.toFixed(1)}% upside -> ${mosVerdict}`);
    } else {
      console.log(`[Margin of safety] No analyst price target available -> N/A`);
    }
  }

  // 5. Why did it drop? (surfaced, not auto-classified — this stays a judgment call)
  let news = [];
  if (hasFinnhub) {
    news = await newsAround(sym, decisionDate);
    if (news.length) {
      console.log(`[News around the drop]`);
      for (const n of news) console.log(`   ${n.date}  ${n.headline}  (${n.source})`);
    } else {
      console.log(`[News around the drop] No headlines found in Finnhub's free-tier window -> check manually`);
    }
  }

  // 6. SEC 8-K red flags (30d before) and insider open-market buys (30d after)
  const sinceBefore = fmtDay(new Date(new Date(decisionDate).getTime() - 30 * 86_400_000));
  const flags = await redFlags8K(sym, sinceBefore);
  const flagVerdict = verdict(flags.length === 0, false);
  console.log(`[SEC 8-K red flags, trailing 30d] ${flags.length === 0 ? "none" : flags.map((f) => `${f.filingDate}:${f.items}`).join(", ")} -> ${flagVerdict}`);
  const buys = await insiderBuysAfter(sym, decisionDate);
  console.log(`[Insider open-market buys since the drop] ${buys.length === 0 ? "none" : buys.map((b) => b.filingDate).join(", ")} -> ${buys.length > 0 ? "PASS (bonus signal)" : "neutral"}`);

  // 7. Catalyst calendar risk
  const earn = hasFinnhub ? await nextEarnings(sym, decisionDate) : null;
  let catalystVerdict = "N/A";
  if (earn) {
    const daysOut = Math.round((new Date(earn.date) - new Date(decisionDate)) / 86_400_000);
    catalystVerdict = verdict(daysOut > 21, daysOut > 10);
    console.log(`[Catalyst calendar] next earnings ${earn.date} (${daysOut}d out) -> ${catalystVerdict}`);
  }

  // 8. Hindsight forward walk (context only — not part of the decision-time checklist)
  const latestIdx = s.closes.length - 1;
  const latestClose = s.closes[latestIdx];
  const latestDate = s.dates[latestIdx];
  const sinceChgPct = ((latestClose - l.close) / l.close) * 100;
  console.log(`[What actually happened since] ${decisionDate} $${l.close.toFixed(2)} -> ${latestDate} $${latestClose.toFixed(2)} (${sinceChgPct >= 0 ? "+" : ""}${sinceChgPct.toFixed(1)}%)`);

  results.push({
    symbol: sym,
    name: meta.name,
    layer: meta.layer,
    dayChangePct: l.changePct,
    closeOnDrop: l.close,
    precedentVerdict,
    rangeVerdict,
    qualityVerdict,
    mosVerdict,
    flagVerdict,
    insiderBuys: buys.length,
    catalystVerdict,
    sinceChgPct,
    latestClose,
    latestDate,
    news,
  });
}

// --- Final side-by-side printout (display only — each verdict above was computed from
// that stock's own numbers alone; nothing here re-decides anything cross-sectionally) ---
console.log(`\n${"=".repeat(70)}\nSide-by-side (for your eyes only — not a ranking formula)\n`);
console.log("SYM     drop%   precedent  range   quality  MoS     redflag  earnings  since-then");
for (const r of results) {
  console.log(
    `${r.symbol.padEnd(7)} ${r.dayChangePct.toFixed(1).padStart(5)}%  ${r.precedentVerdict.padEnd(9)}  ${r.rangeVerdict.padEnd(6)}  ${r.qualityVerdict.padEnd(7)}  ${r.mosVerdict.padEnd(6)}  ${r.flagVerdict.padEnd(7)}  ${r.catalystVerdict.padEnd(8)}  ${r.sinceChgPct >= 0 ? "+" : ""}${r.sinceChgPct.toFixed(1)}%`
  );
}

const outDir = path.join(ROOT, "scripts/output");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = path.join(outDir, `dip-checklist-${decisionDate}-${stamp}.json`);
writeFileSync(outFile, JSON.stringify({ decisionDate, topN: TOP_N, results }, null, 2));
console.log(`\nFull data written to ${path.relative(ROOT, outFile)}`);
