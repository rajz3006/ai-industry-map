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
// +20% (ceiling) is tracked only as an informational cap on how far a winner is allowed to
// run before discipline says take it, never submitted as the order's take-profit itself.
export function computeProfitTargets(entryPrice: number): ProfitTargets {
  return { lockIn: entryPrice * 1.1, ceiling: entryPrice * 1.2 };
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

/** Composes the full trade setup a row's volatility supports, or null if there isn't enough
 * data (no trailing stddev) or the sizing math comes back degenerate (e.g. zero shares' worth
 * of risk budget). */
export function buildTradeSetup(row: OpportunityRow, accountEquity: number, riskPct: number): TradeSetup | null {
  if (!row.trailingStdDevPct || row.trailingStdDevPct <= 0) return null;
  const entryPrice = row.price;
  const stopPrice = computeStopPrice(entryPrice, row.trailingStdDevPct);
  const size = computePositionSize(entryPrice, stopPrice, accountEquity, riskPct);
  if (!size) return null;
  const targets = computeProfitTargets(entryPrice);
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
