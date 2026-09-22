// Server-only Alpaca Market Data client: used for historical/intraday bars
// (Finnhub's free tier no longer serves /stock/candle). Works with paper-account
// keys — the data API is separate from the trading API and isn't paper/live gated.

const BASE_URL = process.env.ALPACA_DATA_BASE_URL?.trim() || "https://data.alpaca.markets";

export function getAlpacaCreds(): { key: string; secret: string } | null {
  const key = process.env.ALPACA_API_KEY?.trim();
  const secret = process.env.ALPACA_SECRET_KEY?.trim();
  if (!key || !secret) return null;
  return { key, secret };
}

export class AlpacaError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AlpacaError";
    this.status = status;
  }
}

export interface AlpacaBar {
  t: string; // RFC-3339 timestamp
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

/**
 * Multi-symbol daily bars via Alpaca's /v2/stocks/bars endpoint — one request covers every
 * symbol instead of looping per-ticker, which matters for a ~45-symbol, 6-month history pull.
 */
export async function alpacaGetMultiBars(
  symbols: string[],
  params: Record<string, string | number>
): Promise<Record<string, AlpacaBar[]>> {
  const creds = getAlpacaCreds();
  if (!creds) {
    throw new AlpacaError("ALPACA_API_KEY/ALPACA_SECRET_KEY are not configured on the server.");
  }
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    symbols: symbols.join(","),
    feed: "iex",
  });
  const bySymbol: Record<string, AlpacaBar[]> = {};
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    if (pageToken) qs.set("page_token", pageToken);
    const res = await fetch(`${BASE_URL}/v2/stocks/bars?${qs.toString()}`, {
      headers: { "APCA-API-KEY-ID": creds.key, "APCA-API-SECRET-KEY": creds.secret },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new AlpacaError(`Alpaca multi-bar request failed (${res.status})`, res.status);
    }
    const data = (await res.json()) as { bars?: Record<string, AlpacaBar[]>; next_page_token?: string | null };
    for (const [sym, bars] of Object.entries(data.bars ?? {})) {
      (bySymbol[sym] ??= []).push(...bars);
    }
    pageToken = data.next_page_token ?? undefined;
    if (!pageToken) break;
  }
  return bySymbol;
}

export async function alpacaGetBars(
  symbol: string,
  params: Record<string, string | number>
): Promise<AlpacaBar[]> {
  const creds = getAlpacaCreds();
  if (!creds) {
    throw new AlpacaError("ALPACA_API_KEY/ALPACA_SECRET_KEY are not configured on the server.");
  }
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    feed: "iex",
  });
  const bars: AlpacaBar[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 5; page++) {
    if (pageToken) qs.set("page_token", pageToken);
    const res = await fetch(`${BASE_URL}/v2/stocks/${encodeURIComponent(symbol)}/bars?${qs.toString()}`, {
      headers: { "APCA-API-KEY-ID": creds.key, "APCA-API-SECRET-KEY": creds.secret },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new AlpacaError(`Alpaca data request failed (${res.status}) for ${symbol}`, res.status);
    }
    const data = (await res.json()) as { bars?: AlpacaBar[]; next_page_token?: string | null };
    bars.push(...(data.bars ?? []));
    pageToken = data.next_page_token ?? undefined;
    if (!pageToken) break;
  }
  return bars;
}
