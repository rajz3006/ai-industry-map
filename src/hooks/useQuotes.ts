"use client";

import { useEffect, useState } from "react";
import type { QuoteResult } from "@/app/api/quote/route";

export type QuoteMap = Record<string, QuoteResult | { error: string } | undefined>;

const POLL_MS = 20_000;

/**
 * Polls /api/quote for the given US-listed symbols every ~20s while `symbols` is non-empty.
 * Symbols should be limited to what's currently visible (Markets tab rows, or the selected
 * node's tickers) — the caller is responsible for keeping this list small.
 */
export function useQuotes(symbols: string[]): { quotes: QuoteMap; loading: boolean } {
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
    const interval = setInterval(fetchQuotes, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [key]);

  return { quotes, loading };
}
