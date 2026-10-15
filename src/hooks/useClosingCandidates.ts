"use client";

import { useCallback, useMemo } from "react";
import { useSharedResource } from "@/hooks/useSharedResource";
import type { ClosingFilters, ClosingResponse } from "@/app/api/closing/route";

export interface UseClosingCandidatesResult {
  data: ClosingResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Prices move all session, so the shared copy goes stale after 5 minutes; the tab also
// exposes a manual "refresh now" button that calls refresh().
const STALE_MS = 5 * 60_000;

async function fetchClosing(params: string): Promise<ClosingResponse> {
  const res = await fetch(`/api/closing?${params}`);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body as ClosingResponse;
}

/** Intraday dip candidates: dropped in the session so far + fundamentals/technicals at or above
 * the given thresholds, with transparent reasons. Each distinct filter combination gets its
 * own shared cache entry via the key. */
export function useClosingCandidates(filters: ClosingFilters): UseClosingCandidatesResult {
  const params = useMemo(() => {
    const sp = new URLSearchParams({
      dropBasis: filters.dropBasis,
      minDrop: String(filters.minDropPct),
      minZ: String(filters.minZScore),
      minFund: filters.minFundamentals,
      minVal: filters.minValuation,
      minTech: filters.minTechnicals,
    });
    return sp.toString();
  }, [filters.dropBasis, filters.minDropPct, filters.minZScore, filters.minFundamentals, filters.minValuation, filters.minTechnicals]);

  const fetcher = useCallback(() => fetchClosing(params), [params]);

  const { data, loading, error, refresh } = useSharedResource<ClosingResponse>(`closing:${params}`, fetcher, {
    staleMs: STALE_MS,
  });
  return { data, loading, error, refresh };
}
