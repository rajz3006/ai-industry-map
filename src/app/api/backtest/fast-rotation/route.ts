import { NextResponse } from "next/server";
import { AlpacaError } from "@/lib/alpaca";
import { loadBacktestBars, runBacktest, type BacktestConfig, type SelectionVariant } from "@/lib/fastRotationBacktest";

export interface BacktestApiResponse {
  config: BacktestConfig;
  window: { start: string; end: string };
  results: ReturnType<typeof runBacktest>[];
}

function clampNum(url: URL, key: string, def: number, min: number, max: number): number {
  const raw = url.searchParams.get(key);
  const n = raw === null ? def : Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const config: BacktestConfig = {
    backtestDays: Math.round(clampNum(url, "days", 90, 14, 180)),
    stopPct: clampNum(url, "stopPct", 1.25, 0.1, 20) / 100,
    targetPct: clampNum(url, "targetPct", 5, 0.1, 50) / 100,
    riskPct: clampNum(url, "riskPct", 1, 0.1, 10) / 100,
    maxPositionPct: clampNum(url, "maxPositionPct", 25, 5, 100) / 100,
    maxPositions: Math.round(clampNum(url, "maxPositions", 5, 1, 15)),
    startingCash: clampNum(url, "cash", 5000, 100, 1_000_000),
  };
  const variantParam = url.searchParams.get("variant") ?? "both";
  const variants: SelectionVariant[] =
    variantParam === "raw" ? ["raw"] : variantParam === "zscore" ? ["zscore"] : ["raw", "zscore"];

  try {
    const { bySymbol, simDates } = await loadBacktestBars(config.backtestDays);
    if (simDates.length === 0) {
      return NextResponse.json({ error: "Not enough historical bar data available yet" }, { status: 503 });
    }
    const results = variants.map((v) => runBacktest(bySymbol, simDates, config, v));
    const response: BacktestApiResponse = {
      config,
      window: { start: simDates[0], end: simDates[simDates.length - 1] },
      results,
    };
    return NextResponse.json(response);
  } catch (err) {
    const status = err instanceof AlpacaError ? err.status ?? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error running backtest" },
      { status }
    );
  }
}
