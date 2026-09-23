"use client";

import { useEffect, useState } from "react";
import type { OpportunitiesResponse } from "@/app/api/opportunities/route";

export interface UseOpportunitiesResult {
  data: OpportunitiesResponse | null;
  loading: boolean;
  error: string | null;
}

/** Fetches the dip-screener rows (z-score vs. own trailing volatility, structural centrality,
 * optional analyst upside) once per mount — same pattern as useMoversSignals. */
export function useOpportunities(): UseOpportunitiesResult {
  const [data, setData] = useState<OpportunitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/opportunities", { signal: controller.signal });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error ?? `Request failed (${res.status})`);
        } else {
          setData(body as OpportunitiesResponse);
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
  }, []);

  return { data, loading, error };
}
