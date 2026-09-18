"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "aimap:pollIntervalMs";
export const DEFAULT_POLL_MS = 60 * 60_000; // 1 hour

export interface PollOption {
  label: string;
  ms: number; // 0 = off (fetch once, no repeat)
}

export const POLL_OPTIONS: PollOption[] = [
  { label: "Off", ms: 0 },
  { label: "1 min", ms: 60_000 },
  { label: "5 min", ms: 5 * 60_000 },
  { label: "15 min", ms: 15 * 60_000 },
  { label: "30 min", ms: 30 * 60_000 },
  { label: "1 hour", ms: DEFAULT_POLL_MS },
];

// Module-level store backing usePollingInterval, read via useSyncExternalStore so the
// server-rendered value (always DEFAULT_POLL_MS) and the post-hydration client value
// (possibly restored from localStorage) reconcile the React-blessed way, with no
// setState-in-effect cascading render and no hydration mismatch.
type Listener = () => void;
const listeners = new Set<Listener>();
let cached: number | undefined;

function readFromStorage(): number {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed) && POLL_OPTIONS.some((o) => o.ms === parsed)) return parsed;
    }
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through to default.
  }
  return DEFAULT_POLL_MS;
}

function getSnapshot(): number {
  if (cached === undefined) cached = readFromStorage();
  return cached;
}

function getServerSnapshot(): number {
  return DEFAULT_POLL_MS;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setStoredIntervalMs(ms: number): void {
  cached = ms;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(ms));
  } catch {
    // Best-effort persistence only.
  }
  listeners.forEach((l) => l());
}

/** Shared, user-configurable refresh interval for live quote polling, persisted to localStorage. */
export function usePollingInterval(): [number, (ms: number) => void] {
  const intervalMs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setIntervalMs = useCallback((ms: number) => setStoredIntervalMs(ms), []);
  return [intervalMs, setIntervalMs];
}
