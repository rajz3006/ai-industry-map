"use client";

import { useEffect, useState } from "react";
import type { FilingsResponse } from "@/app/api/filings/route";

const REFRESH_MS = 30 * 60 * 1000; // filings move slowly; matches the route's own 30min cache

export interface UseFilingsResult {
  data: FilingsResponse | null;
  loading: boolean;
  error: string | null;
}

/** Fetches recent 8-K / open-market-buy Form 4 filings across the app's US symbol universe.
 * One batch call (the server fans out per-symbol), refreshed every 30 minutes. */
export function useFilings(days: number = 10): UseFilingsResult {
  const [data, setData] = useState<FilingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/filings?days=${days}`, { signal: controller.signal });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error ?? `Request failed (${res.status})`);
        } else {
          setData(body as FilingsResponse);
        }
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    const interval = setInterval(run, REFRESH_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, [days]);

  return { data, loading, error };
}
