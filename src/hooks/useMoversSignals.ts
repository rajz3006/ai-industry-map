"use client";

import { useEffect, useState } from "react";
import type { MoversSignalsResponse } from "@/app/api/movers/signals/route";

export interface UseMoversSignalsResult {
  data: MoversSignalsResponse | null;
  loading: boolean;
  error: string | null;
}

/** Fetches week-over-week category momentum + weekly leaders/laggards, once per mount. */
export function useMoversSignals(): UseMoversSignalsResult {
  const [data, setData] = useState<MoversSignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/movers/signals", { signal: controller.signal });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error ?? `Request failed (${res.status})`);
        } else {
          setData(body as MoversSignalsResponse);
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
