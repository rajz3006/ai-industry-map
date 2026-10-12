"use client";

import { useSharedResource } from "@/hooks/useSharedResource";
import type { OpportunitiesResponse } from "@/app/api/opportunities/route";

export interface UseOpportunitiesResult {
  data: OpportunitiesResponse | null;
  loading: boolean;
  error: string | null;
}

// /api/opportunities layers an 18h price-target cache on top of loadBarSet()'s 15-minute
// bar cache (see src/lib/moversData.ts), but the bar data is what actually changes most
// often in the response, so that's the window we match here.
const STALE_MS = 15 * 60_000;

async function fetchOpportunities(): Promise<OpportunitiesResponse> {
  const res = await fetch("/api/opportunities");
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body as OpportunitiesResponse;
}

/** Fetches the dip-screener rows (z-score vs. own trailing volatility, structural centrality,
 * optional analyst upside). Shared across every caller via useSharedResource keyed on
 * "opportunities" — OpportunitiesScreener and TradeDesk both mount this hook, and the second
 * one to mount reuses the first's cached fetch instead of firing a new request. */
export function useOpportunities(): UseOpportunitiesResult {
  const { data, loading, error } = useSharedResource<OpportunitiesResponse>("opportunities", fetchOpportunities, {
    staleMs: STALE_MS,
  });
  return { data, loading, error };
}
