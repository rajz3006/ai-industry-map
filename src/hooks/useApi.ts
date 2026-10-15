"use client";

import { useEffect, useState } from "react";

export type Fetchable<T> = { data?: T; error?: string; loading: boolean };

/** Fetch-once-per-URL-change, with an {error} JSON body treated as a non-exception error
 * state rather than thrown. Shared by StockDetail and TradeChart — both fetch one route for
 * whatever symbol/range is currently selected and re-fetch whenever that target changes. */
export function useApi<T>(url: string | null): Fetchable<T> {
  const [state, setState] = useState<Fetchable<T>>({ loading: !!url });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    // Flip to a loading state whenever the target URL (symbol/range) changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ loading: true });
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json && typeof json === "object" && "error" in json) {
          setState({ loading: false, error: json.error });
        } else {
          setState({ loading: false, data: json as T });
        }
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
