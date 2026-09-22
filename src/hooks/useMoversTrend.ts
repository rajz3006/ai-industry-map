"use client";

import { useEffect, useState } from "react";
import type { Period, TrendMoversResponse } from "@/app/api/movers/trend/route";

export interface UseMoversTrendResult {
  data: TrendMoversResponse | null;
  loading: boolean;
  error: string | null;
}

/** Fetches cumulative leaders/laggards + per-category trend lines for a trailing period. */
export function useMoversTrend(period: Period): UseMoversTrendResult {
  const [data, setData] = useState<TrendMoversResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/movers/trend?period=${encodeURIComponent(period)}`, {
          signal: controller.signal,
        });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error ?? `Request failed (${res.status})`);
        } else {
          setData(body as TrendMoversResponse);
        }
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [period]);

  return { data, loading, error };
}
