"use client";

import { useEffect } from "react";
import { useSharedResource } from "./useSharedResource";
import type { EntryRangeResponse } from "@/app/api/entry-range/route";

// Entries are cached 24h server-side, so most polls just return the same data instantly —
// this only needs to be "fresh enough," not live.
const STALE_MS = 10 * 60_000;
// While today's batch is still filling in (computedToday < totalSymbols), poll again shortly
// so the Markets tab's progress indicator finishes without the reader doing anything.
const FILL_POLL_MS = 15_000;

async function fetchEntryRanges(): Promise<EntryRangeResponse> {
  const res = await fetch("/api/entry-range");
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as EntryRangeResponse;
}

export function useEntryRanges(): {
  data: EntryRangeResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const { data, loading, error, refresh } = useSharedResource<EntryRangeResponse>("entry-range", fetchEntryRanges, {
    staleMs: STALE_MS,
  });

  useEffect(() => {
    if (!data || data.computedToday >= data.totalSymbols) return;
    const t = setTimeout(() => refresh(), FILL_POLL_MS);
    return () => clearTimeout(t);
  }, [data, refresh]);

  return { data, loading, error, refresh };
}
