"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

// Generic shared GET-resource cache: every component calling useSharedResource with the
// same `key` reads and refreshes one module-level cache entry, instead of each mounting
// its own independent fetch + local state. This is what makes "open the same symbol's
// news/opportunities/movers data from two different tabs" reuse one fetch instead of
// firing a new request per view, and makes refresh() update every subscriber at once, not
// just the component that triggered it. Follows the same useSyncExternalStore shared-store
// convention already used by usePollingInterval.ts and useTheme.ts, generalized to async
// fetch-and-cache instead of a synchronous value.

export interface SharedResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  fetchedAt: number; // 0 = never fetched
}

type Listener = () => void;

interface Entry<T> {
  state: SharedResourceState<T>;
  listeners: Set<Listener>;
  inFlight: Promise<void> | null;
}

const store = new Map<string, Entry<unknown>>();
const EMPTY_STATE: SharedResourceState<unknown> = { data: null, error: null, loading: false, fetchedAt: 0 };

function getEntry<T>(key: string): Entry<T> {
  let e = store.get(key) as Entry<T> | undefined;
  if (!e) {
    e = { state: { data: null, error: null, loading: false, fetchedAt: 0 }, listeners: new Set(), inFlight: null };
    store.set(key, e);
  }
  return e;
}

function setState<T>(key: string, patch: Partial<SharedResourceState<T>>) {
  const e = getEntry<T>(key);
  e.state = { ...e.state, ...patch };
  e.listeners.forEach((l) => l());
}

/** Starts a fetch for `key` unless one's already in flight — concurrent mounts sharing a
 * key share the one in-flight promise, so they never double-fetch. */
function load<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
  const e = getEntry<T>(key);
  if (e.inFlight) return e.inFlight;
  setState<T>(key, { loading: true, error: null });
  const p = fetcher()
    .then((data) => setState<T>(key, { data, loading: false, fetchedAt: Date.now() }))
    .catch((err) =>
      setState<T>(key, {
        error: err instanceof Error ? err.message : String(err),
        loading: false,
        fetchedAt: Date.now(),
      })
    )
    .finally(() => {
      e.inFlight = null;
    });
  e.inFlight = p;
  return p;
}

/** Shared GET-resource hook. Multiple components passing the same `key` share one fetch,
 * one cache entry, and one `refresh()` that updates every subscriber immediately.
 *
 * `staleMs` (default 0 = reuse whatever's cached forever unless explicitly refreshed)
 * controls how old cached data can be before a new mount triggers a background refetch —
 * pass the backing route's own server-side cache TTL here so a fresh mount doesn't
 * re-fetch more often than the server data can actually change.
 *
 * `fetcher`'s identity is deliberately NOT a dependency: it's expected to be a new closure
 * every render (e.g. capturing a `symbol` prop), but what determines whether a fetch is
 * needed is `key` + staleness, not whether the function reference changed. */
export function useSharedResource<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  opts?: { staleMs?: number }
): SharedResourceState<T> & { refresh: () => void } {
  const staleMs = opts?.staleMs ?? 0;

  const subscribeFn = useCallback(
    (listener: Listener) => {
      if (!key) return () => {};
      const e = getEntry(key);
      e.listeners.add(listener);
      return () => e.listeners.delete(listener);
    },
    [key]
  );
  const getSnapshot = useCallback(() => (key ? getEntry<T>(key).state : (EMPTY_STATE as SharedResourceState<T>)), [key]);
  const getServerSnapshot = useCallback(() => EMPTY_STATE as SharedResourceState<T>, []);

  const state = useSyncExternalStore(subscribeFn, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!key) return;
    const e = getEntry<T>(key);
    const isStale = e.state.fetchedAt === 0 || Date.now() - e.state.fetchedAt > staleMs;
    if (isStale && !e.inFlight) load(key, fetcher);
    // key/staleMs only — see fetcher-identity note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, staleMs]);

  const refresh = useCallback(() => {
    if (key) load(key, fetcher);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ...state, refresh };
}
