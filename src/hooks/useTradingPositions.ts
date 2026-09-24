"use client";

import { useCallback, useEffect, useState } from "react";
import type { AlpacaPosition } from "@/lib/alpacaTrading";

export interface UseTradingPositionsResult {
  data: AlpacaPosition[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Fetches open paper-account positions. Same fetch-on-mount shape as useOpportunities, plus a
 * manual refetch() so the UI can refresh right after placing or closing a trade. */
export function useTradingPositions(): UseTradingPositionsResult {
  const [data, setData] = useState<AlpacaPosition[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/trading/positions", { signal: controller.signal });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error ?? `Request failed (${res.status})`);
        } else {
          setData((body?.positions ?? []) as AlpacaPosition[]);
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
  }, [reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { data, loading, error, refetch };
}
