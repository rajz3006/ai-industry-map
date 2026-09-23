"use client";

import { useEffect, useRef, useState } from "react";
import type { QuoteResult } from "@/app/api/quote/route";
import { fetchInChunks } from "@/lib/batchFetch";

export type QuoteMap = Record<string, QuoteResult | { error: string } | undefined>;

export interface QuotesSeed {
  quotes: QuoteMap;
  lastUpdatedAt: number;
}

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
 *
 * `seed`, when given, is a server-fetched snapshot (see app/page.tsx) used as the initial
 * state so the first paint already shows prices instead of a loading flash. The hook still
 * skips its very first fetch cycle in that case — not every effect re-run — so changing the
 * poll interval afterward still refreshes immediately, as it always has.
 */
export function useQuotes(symbols: string[], intervalMs: number, seed?: QuotesSeed): UseQuotesResult {
  const [quotes, setQuotes] = useState<QuoteMap>(() => seed?.quotes ?? {});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<QuoteProgress>(() =>
    seed ? { loaded: symbols.length, total: symbols.length } : { loaded: 0, total: 0 }
  );
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(() => seed?.lastUpdatedAt ?? null);
  const seedConsumed = useRef(false);
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

    if (seed && !seedConsumed.current) {
      seedConsumed.current = true;
    } else {
      fetchQuotes();
    }
    let interval: ReturnType<typeof setInterval> | undefined;
    if (intervalMs > 0) interval = setInterval(fetchQuotes, intervalMs);
    return () => {
      cancelled = true;
      controller.abort();
      if (interval) clearInterval(interval);
    };
    // `seed` is only ever consumed once (via seedConsumed.current); including it here is
    // safe (its identity is stable for the component's lifetime) and satisfies exhaustive-deps.
  }, [key, intervalMs, seed]);

  return { quotes, loading, progress, lastUpdatedAt };
}
