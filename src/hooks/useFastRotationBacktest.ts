"use client";

import { useCallback, useState } from "react";
import type { BacktestApiResponse } from "@/app/api/backtest/fast-rotation/route";

export function useFastRotationBacktest() {
  const [data, setData] = useState<BacktestApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (params: Record<string, string | number>) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
      const res = await fetch(`/api/backtest/fast-rotation?${qs.toString()}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? `Backtest failed (${res.status})`);
        setData(null);
        return;
      }
      setData(body as BacktestApiResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error running backtest");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, run };
}
