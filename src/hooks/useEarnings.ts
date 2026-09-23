"use client";

import { useEffect, useRef, useState } from "react";
import type { EarningsMap } from "@/app/api/earnings/route";
import { fetchInChunks } from "@/lib/batchFetch";

export interface EarningsSeed {
  earnings: EarningsMap;
  lastUpdatedAt: number;
}

export const EARNINGS_REFRESH_MS = 6 * 60 * 60 * 1000; // calendars move slowly
// Earnings data is slow-changing and not time-critical, unlike price quotes. Delaying the
// first fetch keeps it from competing with the quote batch for the shared Finnhub rate-limit
// budget on a cold page load — both hooks fire on mount, and a combined ~90-symbol burst
// (45 quotes + 45 earnings) can exceed the free-tier 60/min cap and queue for a while.
const INITIAL_FETCH_DELAY_MS = 15_000;

/**
 * Fetches next/previous earnings dates for a batch of symbols via
 * /api/earnings?symbols=A,B,C and refreshes every `refreshMs` (default 6h).
 * Unlike quotes, this is intentionally low-frequency.
 */
export function useEarnings(symbols: string[], refreshMs: number = EARNINGS_REFRESH_MS, seed?: EarningsSeed) {
  const [earnings, setEarnings] = useState<EarningsMap>(() => seed?.earnings ?? {});
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(() => seed?.lastUpdatedAt ?? null);
  const seedConsumed = useRef(false);
  const key = symbols.slice().sort().join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const controller = new AbortController();
    const symbolList = key.split(",").filter(Boolean);

    async function fetchEarnings() {
      setLoading(true);
      await fetchInChunks<EarningsMap>(
        symbolList,
        (chunk) => `/api/earnings?symbols=${encodeURIComponent(chunk.join(","))}`,
        (data) => {
          if (!cancelled) setEarnings((prev) => ({ ...prev, ...data }));
        },
        { signal: controller.signal }
      );
      if (!cancelled) {
        setLoading(false);
        setLastUpdatedAt(Date.now());
      }
    }

    let initialTimer: ReturnType<typeof setTimeout> | undefined;
    if (seed && !seedConsumed.current) {
      seedConsumed.current = true;
    } else {
      initialTimer = setTimeout(fetchEarnings, INITIAL_FETCH_DELAY_MS);
    }
    let interval: ReturnType<typeof setInterval> | undefined;
    if (refreshMs > 0) {
      interval = setInterval(fetchEarnings, refreshMs + INITIAL_FETCH_DELAY_MS);
    }
    return () => {
      cancelled = true;
      controller.abort();
      if (initialTimer) clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
    // `seed` is only ever consumed once (via seedConsumed.current); including it here is
    // safe (its identity is stable for the component's lifetime) and satisfies exhaustive-deps.
  }, [key, refreshMs, seed]);

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
