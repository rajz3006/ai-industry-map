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

// The closing screen is timing-sensitive (it matters most in the 30 minutes before the
// bell), so the shared copy goes stale after 5 minutes; the tab also exposes a manual
// "re-run" button that calls refresh().
const STALE_MS = 5 * 60_000;

async function fetchClosing(params: string): Promise<ClosingResponse> {
  const res = await fetch(`/api/closing?${params}`);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body as ClosingResponse;
}

/** End-of-day dip candidates: dropped in the session + fundamentals/technicals at or above
 * the given thresholds, with transparent reasons. Each distinct filter combination gets its
 * own shared cache entry via the key. */
export function useClosingCandidates(filters: ClosingFilters): UseClosingCandidatesResult {
  const params = useMemo(() => {
    const sp = new URLSearchParams({
      minDrop: String(filters.minDropPct),
      minFund: filters.minFundamentals,
      minTech: filters.minTechnicals,
    });
    return sp.toString();
  }, [filters.minDropPct, filters.minFundamentals, filters.minTechnicals]);

  const fetcher = useCallback(() => fetchClosing(params), [params]);

  const { data, loading, error, refresh } = useSharedResource<ClosingResponse>(`closing:${params}`, fetcher, {
    staleMs: STALE_MS,
  });
  return { data, loading, error, refresh };
}
