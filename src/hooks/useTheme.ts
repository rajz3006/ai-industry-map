"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "aimap:theme";

export type Theme = "light" | "dark";

// Mirrors usePollingInterval.ts's architecture exactly: a module-level cache
// backing useSyncExternalStore, so the server-rendered value (always "dark",
// matching the fallback in layout.tsx's no-flash script and the `viewport`
// metadata) and the post-hydration client value (restored from localStorage,
// or the OS `prefers-color-scheme` on a first visit) reconcile the
// React-blessed way — no setState-in-effect cascading render, no hydration
// mismatch. The actual <html data-theme> attribute is what CSS keys off; it
// is set synchronously before hydration by the inline script in layout.tsx,
// and kept in sync here on every explicit toggle.
type Listener = () => void;
const listeners = new Set<Listener>();
let cached: Theme | undefined;

function systemTheme(): Theme {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through to system preference.
  }
  return systemTheme();
}

function getSnapshot(): Theme {
  if (cached === undefined) cached = readTheme();
  return cached;
}

function getServerSnapshot(): Theme {
  return "dark";
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function applyTheme(theme: Theme): void {
  cached = theme;
  try {
    document.documentElement.setAttribute("data-theme", theme);
  } catch {
    // no-op outside the browser
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // best-effort persistence only
  }
  listeners.forEach((l) => l());
}

/** Explicit light/dark theme choice, persisted to localStorage, defaulting to OS preference. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setTheme = useCallback((t: Theme) => applyTheme(t), []);
  return [theme, setTheme];
}
