"use client";

import { useSharedResource } from "@/hooks/useSharedResource";
import type { Period, TrendMoversResponse } from "@/app/api/movers/trend/route";

export interface UseMoversTrendResult {
  data: TrendMoversResponse | null;
  loading: boolean;
  error: string | null;
}

// /api/movers/trend has no cache layer of its own — it reads straight from loadBarSet(),
// whose in-process cache is good for 15 minutes (src/lib/moversData.ts).
const STALE_MS = 15 * 60_000;

async function fetchMoversTrend(period: Period): Promise<TrendMoversResponse> {
  const res = await fetch(`/api/movers/trend?period=${encodeURIComponent(period)}`);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body as TrendMoversResponse;
}

/** Fetches cumulative leaders/laggards + per-category trend lines for a trailing period.
 * Shared across every caller via useSharedResource keyed on `moversTrend:<period>`. */
export function useMoversTrend(period: Period): UseMoversTrendResult {
  const key = `moversTrend:${period}`;
  const { data, loading, error } = useSharedResource<TrendMoversResponse>(key, () => fetchMoversTrend(period), {
    staleMs: STALE_MS,
  });
  return { data, loading, error };
}
