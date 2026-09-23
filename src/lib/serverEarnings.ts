// Server-only batch earnings fetch, shared by /api/earnings (client polling) and the home
// page's server-rendered initial seed. Single-symbol mode stays in the route handler since
// it's a distinct response shape, not a batch — only the batch path is shared here.

import { cacheGet, cacheSet, finnhubGet, getFinnhubKey, mapWithConcurrency } from "@/lib/finnhub";

export interface EarningsEvent {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  surprisePercent: number | null;
}

export interface EarningsResult {
  previous: EarningsEvent | null;
  next: EarningsEvent | null;
}

/** Symbol-keyed map returned by batch mode (?symbols=A,B,C). */
export type EarningsMap = Record<string, EarningsResult | { error: string }>;

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

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // earnings calendars move slowly
const CONCURRENCY = 6;

const fmt = (d: Date) => d.toISOString().slice(0, 10);

export async function fetchEarnings(symbol: string): Promise<EarningsResult | { error: string }> {
  const cacheKey = `earnings:${symbol}`;
  const cached = cacheGet<EarningsResult>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  const from = new Date(today);
  from.setFullYear(from.getFullYear() - 1);
  const to = new Date(today);
  to.setFullYear(to.getFullYear() + 1);

  try {
    const data = await finnhubGet<FinnhubEarningsCalendar>("/calendar/earnings", {
      symbol,
      from: fmt(from),
      to: fmt(to),
    });
    const rows = (data.earningsCalendar ?? []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const todayStr = fmt(today);
    const past = rows.filter((r) => r.date <= todayStr);
    const future = rows.filter((r) => r.date > todayStr);

    const toEvent = (r: FinnhubEarningsRow): EarningsEvent => ({
      date: r.date,
      epsActual: r.epsActual ?? null,
      epsEstimate: r.epsEstimate ?? null,
      revenueActual: r.revenueActual ?? null,
      revenueEstimate: r.revenueEstimate ?? null,
      surprisePercent: r.surprisePercent ?? null,
    });

    const result: EarningsResult = {
      previous: past.length ? toEvent(past[past.length - 1]) : null,
      next: future.length ? toEvent(future[0]) : null,
    };
    cacheSet(cacheKey, result, CACHE_TTL_MS);
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error fetching earnings" };
  }
}

/** Fetches earnings for exactly the given symbols (caller handles any dedup/cap). */
export async function fetchEarningsMap(symbols: string[]): Promise<EarningsMap> {
  if (!getFinnhubKey()) {
    const noKey = { error: "FINNHUB_API_KEY is not configured. Set it to enable live data." };
    return Object.fromEntries(symbols.map((s) => [s, noKey]));
  }
  const results = await mapWithConcurrency(symbols, CONCURRENCY, fetchEarnings);
  const body: EarningsMap = {};
  symbols.forEach((sym, i) => {
    body[sym] = results[i];
  });
  return body;
}
