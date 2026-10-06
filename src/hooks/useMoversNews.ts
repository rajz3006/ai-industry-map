"use client";

import { useEffect, useState } from "react";
import type { MoversNewsResponse } from "@/app/api/movers/news/route";

export interface UseMoversNewsResult {
  data: MoversNewsResponse | null;
  loading: boolean;
  error: string | null;
}

/** Fetches the trusted-source news digest + theme callout for a given session date
 * (YYYY-MM-DD, or latest if null). Mirrors useMovers's fetch-on-param-change shape. */
export function useMoversNews(date: string | null): UseMoversNewsResult {
  const [data, setData] = useState<MoversNewsResponse | null>(null);
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
        const res = await fetch(`/api/movers/news${qs}`, { signal: controller.signal });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error ?? `Request failed (${res.status})`);
        } else {
          setData(body as MoversNewsResponse);
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
