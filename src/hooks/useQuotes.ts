"use client";

import { useEffect, useState } from "react";
import type { QuoteResult } from "@/app/api/quote/route";

export type QuoteMap = Record<string, QuoteResult | { error: string } | undefined>;

/**
 * Polls /api/quote for the given US-listed symbols every `intervalMs` while `symbols` is
 * non-empty. Pass `intervalMs <= 0` to fetch once (on mount / when the symbol set changes)
 * without repeating. Symbols should be limited to what's currently visible — the caller is
 * responsible for keeping this list reasonably small relative to the provider's rate limit.
 */
export function useQuotes(symbols: string[], intervalMs: number): { quotes: QuoteMap; loading: boolean } {
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [loading, setLoading] = useState(false);
  const key = symbols.slice().sort().join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const symbolList = key.split(",").filter(Boolean);

    async function fetchQuotes() {
      setLoading(true);
      try {
        const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbolList.join(","))}`);
        if (!res.ok) return;
        const data = (await res.json()) as QuoteMap;
        if (!cancelled) setQuotes((prev) => ({ ...prev, ...data }));
      } catch {
        // Network hiccup — keep showing the last known values.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchQuotes();
    if (intervalMs > 0) {
      const interval = setInterval(fetchQuotes, intervalMs);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [key, intervalMs]);

  return { quotes, loading };
}
