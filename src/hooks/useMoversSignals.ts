"use client";

import { useSharedResource } from "@/hooks/useSharedResource";
import type { MoversSignalsResponse } from "@/app/api/movers/signals/route";

export interface UseMoversSignalsResult {
  data: MoversSignalsResponse | null;
  loading: boolean;
  error: string | null;
}

// /api/movers/signals has no cache layer of its own — it reads straight from loadBarSet(),
// whose in-process cache is good for 15 minutes (src/lib/moversData.ts).
const STALE_MS = 15 * 60_000;

async function fetchMoversSignals(): Promise<MoversSignalsResponse> {
  const res = await fetch("/api/movers/signals");
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body as MoversSignalsResponse;
}

/** Fetches week-over-week category momentum + weekly leaders/laggards. Shared across every
 * caller via useSharedResource keyed on "moversSignals". */
export function useMoversSignals(): UseMoversSignalsResult {
  const { data, loading, error } = useSharedResource<MoversSignalsResponse>("moversSignals", fetchMoversSignals, {
    staleMs: STALE_MS,
  });
  return { data, loading, error };
}
