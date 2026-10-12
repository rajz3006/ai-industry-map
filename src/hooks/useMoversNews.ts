"use client";

import { useSharedResource } from "@/hooks/useSharedResource";
import type { MoversNewsResponse } from "@/app/api/movers/news/route";

export interface UseMoversNewsResult {
  data: MoversNewsResponse | null;
  loading: boolean;
  error: string | null;
}

// /api/movers/news caches its own full response per date for 20 minutes (CACHE_TTL_MS in
// that route) — already above the 15-minute loadBarSet() floor, so match the route's own
// window rather than re-fetching sooner than the server could possibly return anything new.
const STALE_MS = 20 * 60_000;

async function fetchMoversNews(date: string | null): Promise<MoversNewsResponse> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await fetch(`/api/movers/news${qs}`);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body as MoversNewsResponse;
}

/** Fetches the trusted-source news digest + theme callout for a given session date
 * (YYYY-MM-DD, or latest if null). Shared across every caller via useSharedResource keyed
 * on `moversNews:<date>`. */
export function useMoversNews(date: string | null): UseMoversNewsResult {
  const key = `moversNews:${date ?? "latest"}`;
  const { data, loading, error } = useSharedResource<MoversNewsResponse>(key, () => fetchMoversNews(date), {
    staleMs: STALE_MS,
  });
  return { data, loading, error };
}
