"use client";

import { useCallback, useEffect, useState } from "react";
import type { AlpacaAccount } from "@/lib/alpacaTrading";

export interface UseTradingAccountResult {
  data: AlpacaAccount | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Fetches the paper account's equity/cash/buying power. Modeled on useOpportunities — same
 * fetch-on-mount, AbortController-cancel-on-unmount shape — plus a manual refetch() since the
 * user watches this tab live while placing and closing trades. */
export function useTradingAccount(): UseTradingAccountResult {
  const [data, setData] = useState<AlpacaAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/trading/account", { signal: controller.signal });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error ?? `Request failed (${res.status})`);
        } else {
          setData(body as AlpacaAccount);
        }
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { data, loading, error, refetch };
}
