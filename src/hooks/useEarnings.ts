"use client";

import { useEffect, useState } from "react";
import type { EarningsMap } from "@/app/api/earnings/route";

export const EARNINGS_REFRESH_MS = 6 * 60 * 60 * 1000; // calendars move slowly

/**
 * Fetches next/previous earnings dates for a batch of symbols via
 * /api/earnings?symbols=A,B,C and refreshes every `refreshMs` (default 6h).
 * Unlike quotes, this is intentionally low-frequency.
 */
export function useEarnings(symbols: string[], refreshMs: number = EARNINGS_REFRESH_MS) {
  const [earnings, setEarnings] = useState<EarningsMap>({});
  const [loading, setLoading] = useState(false);
  const key = symbols.slice().sort().join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const symbolList = key.split(",").filter(Boolean);

    async function fetchEarnings() {
      setLoading(true);
      try {
        const res = await fetch(`/api/earnings?symbols=${encodeURIComponent(symbolList.join(","))}`);
        if (!res.ok) throw new Error(`Earnings request failed with status ${res.status}`);
        const data = (await res.json()) as EarningsMap;
        if (!cancelled) setEarnings((prev) => ({ ...prev, ...data }));
      } catch {
        // Mark never-loaded symbols as errored so the UI can show "unavailable"
        // instead of hanging; keep last-known values for the rest.
        if (!cancelled) {
          setEarnings((prev) => {
            const next: EarningsMap = { ...prev };
            for (const s of symbolList) {
              if (!(s in next)) next[s] = { error: "Earnings service unreachable" };
            }
            return next;
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEarnings();
    if (refreshMs > 0) {
      const interval = setInterval(fetchEarnings, refreshMs);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [key, refreshMs]);

  return { earnings, loading };
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
