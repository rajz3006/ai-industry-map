"use client";

import { useEffect, useState } from "react";
import type { EarningsMap } from "@/app/api/earnings/route";
import { fetchInChunks } from "@/lib/batchFetch";

export const EARNINGS_REFRESH_MS = 6 * 60 * 60 * 1000; // calendars move slowly
// Earnings data is slow-changing and not time-critical, unlike price quotes. Delaying the
// first fetch keeps it from competing with the quote batch for the shared Finnhub rate-limit
// budget on a cold page load — both hooks fire on mount, and a combined ~100+-symbol burst
// can exceed the free-tier 60/min cap and queue for a while.
const INITIAL_FETCH_DELAY_MS = 15_000;

const CACHE_KEY = "aimap:earnings-cache:v1";
// Earnings dates barely move; a cached snapshot up to a day old is still a reasonable thing
// to show immediately while the delayed live fetch (see above) brings it current.
const CACHE_MAX_AGE_MS = 24 * 60 * 60_000;

interface CachePayload {
  earnings: EarningsMap;
  at: number;
}

function readCache(): CachePayload | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachePayload>;
    if (!parsed || typeof parsed.at !== "number" || !parsed.earnings) return null;
    if (Date.now() - parsed.at > CACHE_MAX_AGE_MS) return null;
    return parsed as CachePayload;
  } catch {
    return null;
  }
}

function writeCache(earnings: EarningsMap, at: number): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ earnings, at }));
  } catch {
    // Storage full or unavailable (private browsing, etc.) — not worth surfacing.
  }
}

/**
 * Fetches next/previous earnings dates for a batch of symbols via
 * /api/earnings?symbols=A,B,C and refreshes every `refreshMs` (default 6h).
 * Unlike quotes, this is intentionally low-frequency.
 *
 * The last successful fetch from this browser is cached in localStorage and seeds state
 * right after mount, so a reload doesn't sit blank for the initial 15s delay above — the
 * delayed live fetch still always runs and brings it current in the background.
 */
export function useEarnings(symbols: string[], refreshMs: number = EARNINGS_REFRESH_MS) {
  const [earnings, setEarnings] = useState<EarningsMap>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const key = symbols.slice().sort().join(",");

  // Runs once, right after hydration — see the matching effect in useQuotes for why this
  // can't happen during render.
  useEffect(() => {
    const cached = readCache();
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot cache seed on mount
      setEarnings(cached.earnings);
      setLastUpdatedAt(cached.at);
    }
  }, []);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const controller = new AbortController();
    const symbolList = key.split(",").filter(Boolean);

    async function fetchEarnings() {
      setLoading(true);
      const merged: EarningsMap = {};
      await fetchInChunks<EarningsMap>(
        symbolList,
        (chunk) => `/api/earnings?symbols=${encodeURIComponent(chunk.join(","))}`,
        (data) => {
          if (cancelled) return;
          Object.assign(merged, data);
          setEarnings((prev) => ({ ...prev, ...data }));
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

    const initialTimer = setTimeout(fetchEarnings, INITIAL_FETCH_DELAY_MS);
    let interval: ReturnType<typeof setInterval> | undefined;
    if (refreshMs > 0) {
      interval = setInterval(fetchEarnings, refreshMs + INITIAL_FETCH_DELAY_MS);
    }
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
  }, [key, refreshMs]);

  return { earnings, loading, lastUpdatedAt };
}

/** Returns the next upcoming earnings date (YYYY-MM-DD) for a node's primary US ticker, if known. */
export function nextEarningsDate(
  earnings: EarningsMap,
  getSymbol: () => string | undefined
): string | null {
  const symbol = getSymbol();
  if (!symbol) return null;
  const e = earnings[symbol];
  if (!e || "error" in e || !e.next?.date) return null;
  return e.next.date;
}

/** Compact label like "E Oct 28" for tight UI spaces; null when unparseable. */
export function earningsLabel(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  return `E ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}
