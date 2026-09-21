"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuoteMap } from "@/hooks/useQuotes";

export type AlertKind = "above" | "below" | "move-up" | "move-down";

export interface PriceAlert {
  id: string;
  symbol: string;
  kind: AlertKind;
  /** Target price for above/below; percent (e.g. 5 = 5%) for move-up/move-down. */
  value: number;
  /** Price at creation — the reference for move-up/move-down alerts. */
  basePrice: number;
  createdAt: number;
  triggeredAt: number | null;
}

const STORAGE_KEY = "ai-map:price-alerts:v1";

export const ALERT_KIND_LABEL: Record<AlertKind, string> = {
  above: "Price rises above",
  below: "Price falls below",
  "move-up": "Rises by %",
  "move-down": "Falls by %",
};

export function describeAlert(a: PriceAlert): string {
  switch (a.kind) {
    case "above":
      return `above $${a.value.toFixed(2)}`;
    case "below":
      return `below $${a.value.toFixed(2)}`;
    case "move-up":
      return `up ${a.value}% from $${a.basePrice.toFixed(2)}`;
    case "move-down":
      return `down ${a.value}% from $${a.basePrice.toFixed(2)}`;
  }
}

function threshold(a: PriceAlert): number {
  if (a.kind === "above" || a.kind === "below") return a.value;
  const pct = a.value / 100;
  return a.kind === "move-up" ? a.basePrice * (1 + pct) : a.basePrice * (1 - pct);
}

function isHit(a: PriceAlert, price: number): boolean {
  const t = threshold(a);
  return a.kind === "above" || a.kind === "move-up" ? price >= t : price <= t;
}

function loadAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PriceAlert[];
    return Array.isArray(parsed) ? parsed.filter((a) => a && a.symbol && typeof a.value === "number") : [];
  } catch {
    return [];
  }
}

/**
 * Browser-local price alerts. Alerts are created explicitly by the user, persisted in
 * localStorage, and evaluated only while the app is open and quotes refresh. Browser
 * notifications fire only after the user grants permission. These are not guaranteed
 * when the tab is closed — reliable closed-app alerts would need a server + delivery
 * channel, which this static-friendly app deliberately avoids.
 */
export function usePriceAlerts(quotes: QuoteMap) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [fired, setFired] = useState<PriceAlert[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlerts(loadAlerts());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    } catch {
      // storage full or blocked — alerts still work for this session
    }
  }, [alerts]);

  const addAlert = useCallback((input: { symbol: string; kind: AlertKind; value: number; basePrice: number }) => {
    const alert: PriceAlert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      symbol: input.symbol.trim().toUpperCase(),
      kind: input.kind,
      value: input.value,
      basePrice: input.basePrice,
      createdAt: Date.now(),
      triggeredAt: null,
    };
    setAlerts((prev) => [alert, ...prev]);
    return alert;
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearFired = useCallback((id: string) => {
    setFired((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Evaluate alerts whenever quotes refresh. Alert triggering intentionally updates state
  // inside this effect: it is a one-shot reaction to new external data (quotes), not
  // derivable render state — it also fires notifications and persists to localStorage.
  useEffect(() => {
    const now = Date.now();
    const hits = alerts.filter((a) => {
      if (a.triggeredAt) return false;
      const q = quotes[a.symbol];
      if (!q || "error" in q || typeof q.price !== "number" || q.price <= 0) return false;
      return isHit(a, q.price);
    });
    if (!hits.length) return;
    const hitIds = new Set(hits.map((h) => h.id));
    const stamped = hits.map((h) => ({ ...h, triggeredAt: now }));
    /* eslint-disable react-hooks/set-state-in-effect */
    setAlerts((prev) => prev.map((a) => (hitIds.has(a.id) ? { ...a, triggeredAt: now } : a)));
    setFired((prev) => [...stamped, ...prev].slice(0, 10));
    /* eslint-enable react-hooks/set-state-in-effect */
    for (const h of stamped) {
      const q = quotes[h.symbol];
      if (q && !("error" in q)) notify(h, q.price);
    }
  }, [quotes, alerts]);

  return { alerts, addAlert, removeAlert, fired, clearFired };
}

function notify(alert: PriceAlert, price: number) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(`Price alert: ${alert.symbol}`, {
      body: `${alert.symbol} is ${describeAlert(alert)} — now $${price.toFixed(2)}`,
      tag: alert.id,
    });
  } catch {
    // Notification construction can throw in some contexts; the in-app toast still shows.
  }
}

/** Requests browser notification permission; returns the resulting permission string. */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}
