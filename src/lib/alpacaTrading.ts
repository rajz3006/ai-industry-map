// Server-only Alpaca Trading API client — paper account only. Same key pair as
// src/lib/alpaca.ts's market-data client; only the base URL differs. Never point this at a
// live-trading base URL from app code — ALPACA_TRADING_BASE_URL defaults to the paper endpoint
// specifically so a misconfigured env var fails closed into paper, not live.

import { AlpacaError, getAlpacaCreds } from "./alpaca";

export function getAlpacaTradingBaseUrl(): string {
  return process.env.ALPACA_TRADING_BASE_URL?.trim() || "https://paper-api.alpaca.markets";
}

function authHeaders(creds: { key: string; secret: string }, json = false): Record<string, string> {
  const headers: Record<string, string> = {
    "APCA-API-KEY-ID": creds.key,
    "APCA-API-SECRET-KEY": creds.secret,
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function requireCreds(): { key: string; secret: string } {
  const creds = getAlpacaCreds();
  if (!creds) {
    throw new AlpacaError("ALPACA_API_KEY/ALPACA_SECRET_KEY are not configured on the server.");
  }
  return creds;
}

export interface AlpacaAccount {
  equity: number;
  cash: number;
  buyingPower: number;
  portfolioValue: number;
}

interface AlpacaAccountResponse {
  equity?: string;
  cash?: string;
  buying_power?: string;
  portfolio_value?: string;
}

export async function alpacaGetAccount(): Promise<AlpacaAccount> {
  const creds = requireCreds();
  const res = await fetch(`${getAlpacaTradingBaseUrl()}/v2/account`, {
    headers: authHeaders(creds),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new AlpacaError(`Alpaca account request failed (${res.status})`, res.status);
  }
  const data = (await res.json()) as AlpacaAccountResponse;
  return {
    equity: parseFloat(data.equity ?? "0") || 0,
    cash: parseFloat(data.cash ?? "0") || 0,
    buyingPower: parseFloat(data.buying_power ?? "0") || 0,
    portfolioValue: parseFloat(data.portfolio_value ?? "0") || 0,
  };
}

export interface AlpacaPosition {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPl: number;
  unrealizedPlpc: number;
}

interface AlpacaPositionResponse {
  symbol?: string;
  qty?: string;
  avg_entry_price?: string;
  current_price?: string;
  market_value?: string;
  unrealized_pl?: string;
  unrealized_plpc?: string;
}

export async function alpacaGetPositions(): Promise<AlpacaPosition[]> {
  const creds = requireCreds();
  const res = await fetch(`${getAlpacaTradingBaseUrl()}/v2/positions`, {
    headers: authHeaders(creds),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new AlpacaError(`Alpaca positions request failed (${res.status})`, res.status);
  }
  const data = (await res.json()) as AlpacaPositionResponse[];
  return (Array.isArray(data) ? data : []).map((p) => ({
    symbol: p.symbol ?? "",
    qty: parseFloat(p.qty ?? "0") || 0,
    avgEntryPrice: parseFloat(p.avg_entry_price ?? "0") || 0,
    currentPrice: parseFloat(p.current_price ?? "0") || 0,
    marketValue: parseFloat(p.market_value ?? "0") || 0,
    unrealizedPl: parseFloat(p.unrealized_pl ?? "0") || 0,
    // Alpaca returns this as a fraction (e.g. 0.05 = 5%); convert to a percent for display.
    unrealizedPlpc: (parseFloat(p.unrealized_plpc ?? "0") || 0) * 100,
  }));
}

export interface SubmitBracketOrderParams {
  symbol: string;
  qty: number;
  takeProfitPrice: number;
  stopLossPrice: number;
}

export interface AlpacaOrderResponse {
  id: string;
  symbol: string;
  qty: string;
  status: string;
  [key: string]: unknown;
}

export async function alpacaSubmitBracketOrder(params: SubmitBracketOrderParams): Promise<AlpacaOrderResponse> {
  const creds = requireCreds();
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const body = {
    symbol: params.symbol,
    qty: params.qty,
    side: "buy",
    type: "market",
    time_in_force: "day",
    order_class: "bracket",
    take_profit: { limit_price: round2(params.takeProfitPrice) },
    stop_loss: { stop_price: round2(params.stopLossPrice) },
  };
  const res = await fetch(`${getAlpacaTradingBaseUrl()}/v2/orders`, {
    method: "POST",
    headers: authHeaders(creds, true),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AlpacaError(`Alpaca order request failed (${res.status})${detail ? `: ${detail}` : ""}`, res.status);
  }
  return (await res.json()) as AlpacaOrderResponse;
}

export async function alpacaClosePosition(symbol: string): Promise<void> {
  const creds = requireCreds();
  const res = await fetch(`${getAlpacaTradingBaseUrl()}/v2/positions/${encodeURIComponent(symbol)}`, {
    method: "DELETE",
    headers: authHeaders(creds),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new AlpacaError(`Alpaca close-position request failed (${res.status}) for ${symbol}`, res.status);
  }
}
