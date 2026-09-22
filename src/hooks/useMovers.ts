"use client";

import { useEffect, useState } from "react";
import type { MoversResponse } from "@/app/api/movers/route";

export interface UseMoversResult {
  data: MoversResponse | null;
  loading: boolean;
  error: string | null;
}

/** Fetches daily gainer/loser + category-trend data for a given date (YYYY-MM-DD, or latest if null). */
export function useMovers(date: string | null): UseMoversResult {
  const [data, setData] = useState<MoversResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const qs = date ? `?date=${encodeURIComponent(date)}` : "";
        const res = await fetch(`/api/movers${qs}`, { signal: controller.signal });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error ?? `Request failed (${res.status})`);
        } else {
          setData(body as MoversResponse);
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
  }, [date]);

  return { data, loading, error };
}
