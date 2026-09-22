// Server-only Alpha Vantage client: quarterly earnings history.
// Finnhub's free tier no longer returns historical /calendar/earnings rows
// (previous:null on every symbol), so past quarters come from AV's EARNINGS
// endpoint instead. Finnhub is still used for the *next* earnings date.

const BASE_URL = "https://www.alphavantage.co/query";

export function getAlphaVantageKey(): string | null {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

export interface AVQuarterlyEarning {
  date: string; // reportedDate, YYYY-MM-DD
  epsActual: number | null;
  epsEstimate: number | null;
  surprisePercent: number | null; // percent, e.g. 15.38
}

export class AlphaVantageError extends Error {
  rateLimited?: boolean;
  constructor(message: string, rateLimited = false) {
    super(message);
    this.name = "AlphaVantageError";
    this.rateLimited = rateLimited;
  }
}

type AVQuarterlyRaw = {
  reportedDate?: unknown;
  reportedEPS?: unknown;
  estimatedEPS?: unknown;
  surprisePercentage?: unknown;
};

type AVResponse = {
  quarterlyEarnings?: AVQuarterlyRaw[];
  // Alpha Vantage answers rate-limit / key problems with HTTP 200 + one of these:
  Note?: unknown;
  Information?: unknown;
};

/** parseFloat with guards: AV sends numbers as strings, sometimes "None"/missing. */
function num(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "none" || s.toLowerCase() === "null") return null;
  const n = parseFloat(s.replace(/[%$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function fetchEarningsHistory(symbol: string): Promise<AVQuarterlyEarning[]> {
  const key = getAlphaVantageKey();
  if (!key) {
    throw new AlphaVantageError("ALPHA_VANTAGE_API_KEY is not configured on the server.");
  }
  const qs = new URLSearchParams({ function: "EARNINGS", symbol, apikey: key });
  const res = await fetch(`${BASE_URL}?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new AlphaVantageError(`Alpha Vantage request failed (${res.status}) for EARNINGS/${symbol}`);
  }
  const data = (await res.json()) as AVResponse;
  const notice = data?.Note ?? data?.Information;
  if (typeof notice === "string" && notice.trim()) {
    throw new AlphaVantageError(
      `Alpha Vantage notice for ${symbol}: ${notice.slice(0, 200)}`,
      true
    );
  }
  const out: AVQuarterlyEarning[] = [];
  for (const q of data?.quarterlyEarnings ?? []) {
    const rawDate = typeof q.reportedDate === "string" ? q.reportedDate.slice(0, 10) : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) continue;
    out.push({
      date: rawDate,
      epsActual: num(q.reportedEPS),
      epsEstimate: num(q.estimatedEPS),
      surprisePercent: num(q.surprisePercentage),
    });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out.slice(-12); // most recent 12, ascending
}
