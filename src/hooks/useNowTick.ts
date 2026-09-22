"use client";

import { useEffect, useState } from "react";

/**
 * Forces the calling component to re-render roughly every `intervalMs`, purely so a
 * relative-time label ("2m ago") computed fresh from `Date.now()` at render time stays
 * visually current. Deliberately doesn't hand back a stored `Date.now()` value itself —
 * that would differ between the server render and the client's first hydration pass.
 * Callers should call `Date.now()` directly in their render body; anything gated on it
 * (like a "last updated" timestamp that starts `null` until a client-only fetch completes)
 * is safe because it renders identically — "never" — on both server and first client pass.
 */
export function useNowTick(intervalMs = 10_000): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
