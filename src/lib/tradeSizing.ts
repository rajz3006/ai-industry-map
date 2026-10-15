// Pure position-sizing and risk math for the Trade Desk — the house strategy's fixed rules,
// not suggestions. No I/O here; callers (API routes, components) own fetching and side effects.

import type { OpportunityRow } from "@/app/api/opportunities/route";

/**
 * Stop = entry minus 2x the stock's own trailing 20-day daily-return stddev, expressed as a
 * $ distance from entry. Volatility-adjusted rather than a flat %, so a choppier name gets a
 * wider stop instead of being shaken out by its own normal noise.
 */
export function computeStopPrice(entryPrice: number, trailingStdDevPct: number): number {
  return entryPrice - 2 * (trailingStdDevPct / 100) * entryPrice;
}

export type StopMode = "vol" | "fixed";

/** Stop = entry minus a user-chosen flat % — the alternative to the volatility stop above,
 * for a trader who wants a predictable distance regardless of the stock's own noise. */
export function computeStopPriceFixed(entryPrice: number, stopPct: number): number {
  return entryPrice * (1 - stopPct / 100);
}

export interface PositionSize {
  riskPerShare: number;
  riskBudget: number;
  shares: number;
  positionValue: number;
}

export function computePositionSize(
  entryPrice: number,
  stopPrice: number,
  accountEquity: number,
  riskPct: number
): PositionSize | null {
  const riskPerShare = entryPrice - stopPrice;
  if (riskPerShare <= 0) return null;
  const riskBudget = accountEquity * (riskPct / 100);
  const shares = Math.floor(riskBudget / riskPerShare);
  const positionValue = shares * entryPrice;
  return { riskPerShare, riskBudget, shares, positionValue };
}

export interface ProfitTargets {
  lockIn: number;
  ceiling: number;
}

// House rule: +10% is the default exit (lockIn) — the bracket order's actual take-profit.
// The ceiling is tracked only as an informational cap, at 2x whatever target is configured,
// on how far a winner is allowed to run before discipline says take it — never submitted as
// the order's take-profit itself.
export function computeProfitTargets(entryPrice: number, profitPct: number = 10): ProfitTargets {
  return { lockIn: entryPrice * (1 + profitPct / 100), ceiling: entryPrice * (1 + (2 * profitPct) / 100) };
}

/** Reward:risk ratio for a given target vs. the stop. Null when the stop isn't below entry. */
export function computeRMultiple(entryPrice: number, stopPrice: number, targetPrice: number): number | null {
  const risk = entryPrice - stopPrice;
  if (risk <= 0) return null;
  return (targetPrice - entryPrice) / risk;
}

export interface TradeSetup {
  symbol: string;
  entryPrice: number;
  stopPrice: number;
  stopDistancePct: number;
  size: PositionSize;
  targets: ProfitTargets;
  rMultipleLockIn: number | null;
}

export interface TradeSetupOptions {
  /** "vol" (default): 2x the stock's own trailing volatility. "fixed": stopPct below entry. */
  stopMode?: StopMode;
  /** Stop distance in % below entry, used only when stopMode is "fixed". */
  stopPct?: number;
  /** Profit target in % above entry. Defaults to the house +10% lock-in. */
  profitPct?: number;
}

/** Composes the full trade setup for a row, or null if the chosen stop mode can't be priced
 * (no trailing stddev for a volatility stop) or the sizing math comes back degenerate (e.g.
 * zero shares' worth of risk budget). */
export function buildTradeSetup(
  row: OpportunityRow,
  accountEquity: number,
  riskPct: number,
  options: TradeSetupOptions = {}
): TradeSetup | null {
  const { stopMode = "vol", stopPct = 4, profitPct = 10 } = options;
  const entryPrice = row.price;
  let stopPrice: number;
  if (stopMode === "fixed") {
    stopPrice = computeStopPriceFixed(entryPrice, stopPct);
  } else {
    if (!row.trailingStdDevPct || row.trailingStdDevPct <= 0) return null;
    stopPrice = computeStopPrice(entryPrice, row.trailingStdDevPct);
  }
  const size = computePositionSize(entryPrice, stopPrice, accountEquity, riskPct);
  if (!size) return null;
  const targets = computeProfitTargets(entryPrice, profitPct);
  const rMultipleLockIn = computeRMultiple(entryPrice, stopPrice, targets.lockIn);
  const stopDistancePct = entryPrice > 0 ? ((entryPrice - stopPrice) / entryPrice) * 100 : 0;
  return {
    symbol: row.symbol,
    entryPrice,
    stopPrice,
    stopDistancePct,
    size,
    targets,
    rMultipleLockIn,
  };
}
