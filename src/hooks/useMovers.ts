"use client";

import { useSharedResource } from "@/hooks/useSharedResource";
import type { MoversResponse } from "@/app/api/movers/route";

export interface UseMoversResult {
  data: MoversResponse | null;
  loading: boolean;
  error: string | null;
}

// /api/movers has no cache layer of its own — it reads straight from loadBarSet(), whose
// in-process cache is good for 15 minutes (src/lib/moversData.ts). No point re-fetching
// client-side faster than the server data can actually change.
const STALE_MS = 15 * 60_000;

async function fetchMovers(date: string | null): Promise<MoversResponse> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await fetch(`/api/movers${qs}`);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body as MoversResponse;
}

/** Fetches daily gainer/loser + category-trend data for a given date (YYYY-MM-DD, or latest
 * if null). Shared across every caller via useSharedResource keyed on `movers:<date>` —
 * CatalystRadar's useMovers(null) and MoversTable's useMovers(date) reuse one cached fetch
 * whenever they resolve to the same session. */
export function useMovers(date: string | null): UseMoversResult {
  const key = `movers:${date ?? "latest"}`;
  const { data, loading, error } = useSharedResource<MoversResponse>(key, () => fetchMovers(date), {
    staleMs: STALE_MS,
  });
  return { data, loading, error };
}
