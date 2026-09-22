import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet, finnhubGet, getFinnhubKey } from "@/lib/finnhub";
import { alpacaGetBars, getAlpacaCreds, type AlpacaBar } from "@/lib/alpaca";
import {
  atr,
  bollinger,
  ema,
  macd,
  rsi,
  sma,
  swingHighLow,
  unfilledGaps,
  volumeRatio,
  type DatedBar,
  type GapZone,
} from "@/lib/indicators";
import type { NewsResult } from "@/app/api/news/route";

/** One past earnings report with its surrounding price action. */
export interface QuarterPlay {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  surprisePercent: number | null;
  beat: boolean | null; // epsActual >= epsEstimate, null when either is missing
  preRunPct: number; // T-5 → T-1 (last session before the reaction day)
  dayAfterPct: number; // T-1 → reaction day
  fiveDayPct: number; // T-1 → reaction day + 5 sessions
}

export interface PlaybookAggregates {
  n: number;
  avgPreRun: number;
  medianPreRun: number;
  avgAbsDayAfter: number;
  dayAfterUp: number;
  dayAfterDown: number;
  reversalRate: number; // share of quarters where the day-after moved opposite the pre-run
  avgFiveDay: number;
  expectedMoveProxyPct: number; // = avgAbsDayAfter; see expectedMoveProxyNote
  expectedMoveProxyNote: string;
}

export interface SetupSnapshot {
  lastPrice: number;
  lastDate: string;
  rsi14: number | null;
  macd: { macd: number; signal: number; histogram: number } | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema20: number | null;
  ema50: number | null;
  bollinger: { upper: number; middle: number; lower: number; percentB: number; bandwidthPct: number } | null;
  atr20: number | null;
  atrPctOfPrice: number | null;
  volumeRatio20: number | null;
  swing20: { high: number; low: number } | null;
  swing60: { high: number; low: number } | null;
  unfilledGaps: GapZone[];
}

export interface ResearchNewsItem {
  date: string; // YYYY-MM-DD
  headline: string;
  source: string;
  url: string;
}

export interface EarningsResearchResult {
  symbol: string;
  nextDate: string | null;
  quarters: QuarterPlay[];
  aggregates: PlaybookAggregates | null;
  setup: SetupSnapshot | null;
  news: ResearchNewsItem[];
  unavailable: string[];
  fetchedAt: number; // unix seconds
}

type FinnhubEarningsRow = {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  surprisePercent: number | null;
};

type FinnhubEarningsCalendar = {
  earningsCalendar?: FinnhubEarningsRow[];
};

type FinnhubNewsItem = {
  headline?: string;
  source?: string;
  datetime?: number;
  summary?: string;
  url?: string;
};

const RESEARCH_TTL_MS = 24 * 60 * 60 * 1000; // history barely moves; indicators ride along
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
const NEWS_TTL_MS = 30 * 60 * 1000; // matches /api/news cadence
const MAX_QUARTERS = 8;
const HISTORY_YEARS = 2.5;

const fmt = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Report timing caveat: Finnhub's calendar carries report dates but the free tier
 * does not reliably expose the before/after-market hour, and most US companies
 * report after the close. So the "reaction day" is defined as the first trading
 * session strictly AFTER the report date, indexed by trading days — never by
 * calendar days. T-1 is the last session before the reaction day, T-5 five
 * sessions before it, +5d five sessions after it. Quarters missing any reference
 * close (too recent, trading halts, sparse history) are skipped.
 */
function buildQuarterPlays(rows: FinnhubEarningsRow[], bars: DatedBar[]): QuarterPlay[] {
  const plays: QuarterPlay[] = [];
  const todayStr = fmt(new Date());
  const past = rows
    .filter((r) => r.date && r.date < todayStr)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  for (let qi = past.length - 1; qi >= 0 && plays.length < MAX_QUARTERS; qi--) {
    const row = past[qi];
    const reactionIdx = bars.findIndex((b) => b.date > row.date);
    if (reactionIdx < 0) continue;
    const iT5 = reactionIdx - 5;
    const iT1 = reactionIdx - 1;
    const iR = reactionIdx;
    const iP5 = reactionIdx + 5;
    if (iT5 < 0 || iP5 >= bars.length) continue;
    const cT5 = bars[iT5].c;
    const cT1 = bars[iT1].c;
    const cR = bars[iR].c;
    const cP5 = bars[iP5].c;
    if (![cT5, cT1, cR, cP5].every((c) => typeof c === "number" && c > 0)) continue;
    plays.push({
      date: row.date,
      epsActual: row.epsActual ?? null,
      epsEstimate: row.epsEstimate ?? null,
      revenueActual: row.revenueActual ?? null,
      revenueEstimate: row.revenueEstimate ?? null,
      surprisePercent: row.surprisePercent ?? null,
      beat:
        row.epsActual != null && row.epsEstimate != null ? row.epsActual >= row.epsEstimate : null,
      preRunPct: ((cT1 - cT5) / cT5) * 100,
      dayAfterPct: ((cR - cT1) / cT1) * 100,
      fiveDayPct: ((cP5 - cT1) / cT1) * 100,
    });
  }
  return plays;
}

function aggregate(plays: QuarterPlay[]): PlaybookAggregates | null {
  if (!plays.length) return null;
  const n = plays.length;
  const pre = plays.map((p) => p.preRunPct);
  const absAfter = plays.map((p) => Math.abs(p.dayAfterPct));
  const sorted = [...pre].sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const reversals = plays.filter(
    (p) => p.preRunPct !== 0 && p.dayAfterPct !== 0 && Math.sign(p.preRunPct) !== Math.sign(p.dayAfterPct)
  ).length;
  const avgAbs = absAfter.reduce((a, b) => a + b, 0) / n;
  return {
    n,
    avgPreRun: pre.reduce((a, b) => a + b, 0) / n,
    medianPreRun: median,
    avgAbsDayAfter: avgAbs,
    dayAfterUp: plays.filter((p) => p.dayAfterPct > 0).length,
    dayAfterDown: plays.filter((p) => p.dayAfterPct < 0).length,
    reversalRate: reversals / n,
    avgFiveDay: plays.reduce((a, p) => a + p.fiveDayPct, 0) / n,
    expectedMoveProxyPct: avgAbs,
    expectedMoveProxyNote:
      "Historical average absolute day-after move — a proxy only. Options-implied move is not available on the free data tier.",
  };
}

function buildSetup(bars: DatedBar[]): SetupSnapshot | null {
  if (bars.length < 60) return null; // need room for swing-60 + MACD + SMA-200 on liquid names
  const closes = bars.map((b) => b.c);
  const last = bars[bars.length - 1];
  const m = macd(closes);
  const b = bollinger(closes, 20, 2);
  const a = atr(bars, 20);
  return {
    lastPrice: last.c,
    lastDate: last.date,
    rsi14: rsi(closes, 14),
    macd: m,
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    bollinger: b,
    atr20: a,
    atrPctOfPrice: a != null && last.c > 0 ? (a / last.c) * 100 : null,
    volumeRatio20: volumeRatio(bars, 20),
    swing20: swingHighLow(bars, 20),
    swing60: swingHighLow(bars, 60),
    unfilledGaps: unfilledGaps(bars, 60),
  };
}

function barsToDated(raw: AlpacaBar[]): DatedBar[] {
  return raw
    .filter((b) => b && typeof b.c === "number" && b.c > 0 && typeof b.t === "string")
    .map((b) => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, date: b.t.slice(0, 10) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();

  if (!symbol || !/^[A-Z0-9.\-]{1,12}$/.test(symbol)) {
    return NextResponse.json({ error: "Missing or invalid 'symbol' query param" }, { status: 400 });
  }

  const cacheKey = `earnings-research:${symbol}`;
  const cached = cacheGet<EarningsResearchResult>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" },
    });
  }

  const unavailable: string[] = [];
  let rows: FinnhubEarningsRow[] = [];
  let bars: DatedBar[] = [];
  let news: ResearchNewsItem[] = [];

  // 1) Earnings history — full row list, cached separately so other consumers can reuse it.
  const historyKey = `earnings-history:${symbol}`;
  const cachedHistory = cacheGet<FinnhubEarningsRow[]>(historyKey);
  if (cachedHistory) {
    rows = cachedHistory;
  } else if (getFinnhubKey()) {
    try {
      const today = new Date();
      const from = new Date(today);
      from.setFullYear(from.getFullYear() - Math.ceil(HISTORY_YEARS));
      const to = new Date(today);
      to.setFullYear(to.getFullYear() + 1);
      const data = await finnhubGet<FinnhubEarningsCalendar>("/calendar/earnings", {
        symbol,
        from: fmt(from),
        to: fmt(to),
      });
      rows = (data.earningsCalendar ?? [])
        .filter((r) => r && typeof r.date === "string")
        .slice()
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      cacheSet(historyKey, rows, HISTORY_TTL_MS);
    } catch (err) {
      unavailable.push(
        `Earnings calendar unavailable: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  } else {
    unavailable.push("Earnings calendar unavailable: FINNHUB_API_KEY is not configured.");
  }

  // 2) Daily price bars (Alpaca — Finnhub's free tier no longer serves /stock/candle).
  if (getAlpacaCreds()) {
    try {
      const end = new Date();
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - Math.ceil(HISTORY_YEARS));
      const raw = await alpacaGetBars(symbol, {
        timeframe: "1Day",
        start: start.toISOString(),
        end: end.toISOString(),
        sort: "asc",
        limit: 10000,
      });
      bars = barsToDated(raw);
      if (!bars.length) unavailable.push("Price history unavailable: no daily bars returned.");
    } catch (err) {
      unavailable.push(
        `Price history unavailable: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  } else {
    unavailable.push("Price history unavailable: ALPACA_API_KEY/ALPACA_SECRET_KEY are not configured.");
  }

  // 3) Recent company news — shares the news:${symbol} cache with /api/news.
  const newsKey = `news:${symbol}`;
  const cachedNews = cacheGet<NewsResult>(newsKey);
  const pickNews = (items: FinnhubNewsItem[]): ResearchNewsItem[] => {
    const seen = new Set<string>();
    const out: ResearchNewsItem[] = [];
    for (const it of Array.isArray(items) ? items : []) {
      if (!it.headline || !it.url || seen.has(it.url)) continue;
      seen.add(it.url);
      out.push({
        date:
          typeof it.datetime === "number"
            ? new Date(it.datetime * 1000).toISOString().slice(0, 10)
            : "",
        headline: it.headline,
        source: it.source || "Unknown",
        url: it.url,
      });
      if (out.length >= 8) break;
    }
    return out;
  };
  if (cachedNews) {
    news = pickNews(
      cachedNews.articles.map((a) => ({
        headline: a.headline,
        source: a.source,
        datetime: a.datetime,
        url: a.url,
      }))
    );
  } else if (getFinnhubKey()) {
    try {
      const to = new Date();
      const from = new Date(to);
      from.setDate(from.getDate() - 14);
      const items = await finnhubGet<FinnhubNewsItem[]>("/company-news", {
        symbol,
        from: fmt(from),
        to: fmt(to),
      });
      const seen = new Set<string>();
      const articles: NewsResult["articles"] = [];
      for (const it of Array.isArray(items) ? items : []) {
        if (!it.headline || !it.url || seen.has(it.url)) continue;
        seen.add(it.url);
        articles.push({
          headline: it.headline,
          source: it.source || "Unknown",
          datetime: typeof it.datetime === "number" ? it.datetime : 0,
          summary: it.summary || "",
          url: it.url,
        });
        if (articles.length >= 12) break;
      }
      articles.sort((a, b) => b.datetime - a.datetime);
      cacheSet<NewsResult>(newsKey, { articles, fetchedAt: Math.floor(Date.now() / 1000) }, NEWS_TTL_MS);
      news = pickNews(items);
    } catch (err) {
      unavailable.push(
        `Company news unavailable: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  } else {
    unavailable.push("Company news unavailable: FINNHUB_API_KEY is not configured.");
  }

  const quarters = rows.length && bars.length ? buildQuarterPlays(rows, bars) : [];
  if (rows.length && bars.length && !quarters.length) {
    unavailable.push(
      "No past quarter had a complete set of reference closes (need 5 sessions before and after the reaction day)."
    );
  }
  const setup = bars.length ? buildSetup(bars) : null;
  if (bars.length && !setup) {
    unavailable.push("Swing-indicator snapshot unavailable: fewer than 60 daily bars.");
  }

  const todayStr = fmt(new Date());
  const result: EarningsResearchResult = {
    symbol,
    nextDate: rows.filter((r) => r.date > todayStr).map((r) => r.date)[0] ?? null,
    quarters,
    aggregates: aggregate(quarters),
    setup,
    news,
    unavailable,
    fetchedAt: Math.floor(Date.now() / 1000),
  };
  cacheSet(cacheKey, result, RESEARCH_TTL_MS);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" },
  });
}
