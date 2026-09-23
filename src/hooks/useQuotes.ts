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

const CACHE_KEY = "aimap:quotes-cache:v1";
// Don't resurrect very old data as if it were fresh — past this age, start empty instead
// of showing hours/days-stale prices while the live fetch is still in flight.
const CACHE_MAX_AGE_MS = 24 * 60 * 60_000;

interface CachePayload {
  quotes: QuoteMap;
  at: number;
}

function readCache(): CachePayload | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachePayload>;
    if (!parsed || typeof parsed.at !== "number" || !parsed.quotes) return null;
    if (Date.now() - parsed.at > CACHE_MAX_AGE_MS) return null;
    return parsed as CachePayload;
  } catch {
    return null;
  }
}

function writeCache(quotes: QuoteMap, at: number): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ quotes, at }));
  } catch {
    // Storage full or unavailable (private browsing, etc.) — not worth surfacing.
  }
}

/**
 * Polls /api/quote for the given US-listed symbols every `intervalMs` while `symbols` is
 * non-empty, fetching in small chunks so results fill in progressively instead of one
 * all-or-nothing request. Pass `intervalMs <= 0` to fetch once (on mount / when the symbol
 * set changes) without repeating. Symbols should be limited to what's currently visible —
 * the caller is responsible for keeping this list reasonably small relative to the
 * provider's rate limit.
 *
 * The last successful fetch from this browser is cached in localStorage and used to seed
 * state right after mount, so a reload shows real prices immediately instead of every cell
 * reading "loading…" — the live poll below still always runs and replaces it with fresh
 * data within the normal fetch time. (A server-side seed was tried first, but a full ~57-
 * symbol batch shares the same process-wide Finnhub rate limiter as every other route and
 * quotes only cache for 10s — under load that can take well over a minute, so blocking the
 * page response on it did more harm than good. This client-side cache has no such cost.)
 */
export function useQuotes(symbols: string[], intervalMs: number): UseQuotesResult {
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<QuoteProgress>({ loaded: 0, total: 0 });
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const key = symbols.slice().sort().join(",");

  // Runs once, right after hydration — reading localStorage during render itself (rather
  // than in an effect) would make the client's first render diverge from the server's and
  // trigger a hydration mismatch, so this intentionally waits until after mount.
  useEffect(() => {
    const cached = readCache();
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot cache seed on mount
      setQuotes(cached.quotes);
      setLastUpdatedAt(cached.at);
    }
  }, []);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const controller = new AbortController();
    const symbolList = key.split(",").filter(Boolean);

    async function fetchQuotes() {
      setLoading(true);
      let loaded = 0;
      const merged: QuoteMap = {};
      setProgress({ loaded: 0, total: symbolList.length });
      await fetchInChunks<QuoteMap>(
        symbolList,
        (chunk) => `/api/quote?symbols=${encodeURIComponent(chunk.join(","))}`,
        (data, chunk) => {
          if (cancelled) return;
          loaded += chunk.length;
          Object.assign(merged, data);
          setQuotes((prev) => ({ ...prev, ...data }));
          setProgress({ loaded, total: symbolList.length });
        },
        { signal: controller.signal }
      );
      if (!cancelled) {
        setLoading(false);
        const now = Date.now();
        setLastUpdatedAt(now);
        writeCache(merged, now);
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
