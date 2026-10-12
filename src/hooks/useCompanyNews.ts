"use client";

import { useSharedResource } from "./useSharedResource";
import type { NewsResult } from "@/app/api/news/route";

// Matches CACHE_TTL_MS in src/lib/companyNews.ts (fetchTrustedCompanyNews's own server-side
// cache window) — a fresh mount within this window reuses whatever's cached instead of
// re-fetching, since the server data can't have changed meaningfully in that time anyway.
const STALE_MS = 30 * 60 * 1000;

async function fetchCompanyNews(symbol: string): Promise<NewsResult> {
  const res = await fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`);
  const json = (await res.json()) as NewsResult & { error?: string };
  if (!res.ok || json.error) {
    throw new Error(json.error || `News request failed (${res.status})`);
  }
  return json;
}

/**
 * Shared per-symbol company-news resource. Every component calling this with the same
 * `symbol` (regardless of casing) shares one fetch, one cached result, and one `refresh()`
 * that updates every subscriber immediately — so opening the same symbol's news from two
 * different tabs (e.g. the Map tab's Dossier and the Opportunities screener) never fires a
 * second request, and a manual refresh anywhere is reflected everywhere.
 */
export function useCompanyNews(symbol: string | null): {
  data: NewsResult | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const normalized = symbol ? symbol.toUpperCase() : null;
  const key = normalized ? `news:${normalized}` : null;

  const { data, loading, error, refresh } = useSharedResource<NewsResult>(
    key,
    () => fetchCompanyNews(normalized as string),
    { staleMs: STALE_MS }
  );

  return { data, loading, error, refresh };
}
