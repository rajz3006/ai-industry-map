"use client";

import { useEffect, useState } from "react";
import type { QuoteResult } from "@/app/api/quote/route";
import { fetchInChunks } from "@/lib/batchFetch";

export type QuoteMap = Record<string, QuoteResult | { error: string } | undefined>;

export interface QuoteProgress {
  loaded: number;
  total: number;
}

export interface UseQuotesResult {
  quotes: QuoteMap;
  loading: boolean;
  /** How many of the currently-requested symbols have a result in this fetch cycle so far. */
  progress: QuoteProgress;
  /** When the last fetch cycle (all chunks) finished, or null before the first one completes. */
  lastUpdatedAt: number | null;
}

/**
 * Polls /api/quote for the given US-listed symbols every `intervalMs` while `symbols` is
 * non-empty, fetching in small chunks so results fill in progressively instead of one
 * all-or-nothing request. Pass `intervalMs <= 0` to fetch once (on mount / when the symbol
 * set changes) without repeating. Symbols should be limited to what's currently visible —
 * the caller is responsible for keeping this list reasonably small relative to the
 * provider's rate limit.
 */
export function useQuotes(symbols: string[], intervalMs: number): UseQuotesResult {
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<QuoteProgress>({ loaded: 0, total: 0 });
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const key = symbols.slice().sort().join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const controller = new AbortController();
    const symbolList = key.split(",").filter(Boolean);

    async function fetchQuotes() {
      setLoading(true);
      let loaded = 0;
      setProgress({ loaded: 0, total: symbolList.length });
      await fetchInChunks<QuoteMap>(
        symbolList,
        (chunk) => `/api/quote?symbols=${encodeURIComponent(chunk.join(","))}`,
        (data, chunk) => {
          if (cancelled) return;
          loaded += chunk.length;
          setQuotes((prev) => ({ ...prev, ...data }));
          setProgress({ loaded, total: symbolList.length });
        },
        { signal: controller.signal }
      );
      if (!cancelled) {
        setLoading(false);
        setLastUpdatedAt(Date.now());
      }
    }

    fetchQuotes();
    let interval: ReturnType<typeof setInterval> | undefined;
    if (intervalMs > 0) interval = setInterval(fetchQuotes, intervalMs);
    return () => {
      cancelled = true;
      controller.abort();
      if (interval) clearInterval(interval);
    };
  }, [key, intervalMs]);

  return { quotes, loading, progress, lastUpdatedAt };
}
