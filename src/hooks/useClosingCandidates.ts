"use client";

import { useSharedResource } from "@/hooks/useSharedResource";
import type { ClosingResponse } from "@/app/api/closing/route";

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

async function fetchClosing(): Promise<ClosingResponse> {
  const res = await fetch("/api/closing");
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body as ClosingResponse;
}

/** End-of-day dip candidates: dropped today + strong/good fundamentals + strong/good
 * technicals, with transparent reasons. Shared across callers via useSharedResource
 * keyed on "closing". */
export function useClosingCandidates(): UseClosingCandidatesResult {
  const { data, loading, error, refresh } = useSharedResource<ClosingResponse>("closing", fetchClosing, {
    staleMs: STALE_MS,
  });
  return { data, loading, error, refresh };
}
