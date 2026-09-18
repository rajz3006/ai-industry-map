// Formatting helpers, ported from the reference page's fmtPrice()/marketHtml() logic.

/** True for tickers whose quote is denominated in a non-USD currency by suffix convention
 * (Hong Kong, Korea, Shanghai, Shenzhen, Tokyo, Taiwan). Used to decide whether to prefix "$". */
export function isForeignDenominated(symbol: string): boolean {
  return /\.(HK|KS|SS|SZ|TW|T)$/.test(symbol);
}

export function formatPrice(price: number | undefined | null, symbol: string): string {
  if (typeof price !== "number" || Number.isNaN(price)) return "—";
  const prefix = isForeignDenominated(symbol) ? "" : "$";
  return (
    prefix +
    price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatChangePercent(pct: number | undefined | null): string {
  if (typeof pct !== "number" || Number.isNaN(pct)) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

export function formatChangeAbs(chg: number | undefined | null): string {
  if (typeof chg !== "number" || Number.isNaN(chg)) return "";
  return `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}`;
}

export function changeDirection(pct: number | undefined | null): "up" | "down" | "" {
  if (typeof pct !== "number" || Number.isNaN(pct)) return "";
  return pct >= 0 ? "up" : "down";
}

export function formatMarketCap(capMillions: number | undefined | null): string {
  if (!capMillions || Number.isNaN(capMillions)) return "—";
  const billions = capMillions / 1000;
  if (billions >= 1000) return `$${(billions / 1000).toFixed(2)}T`;
  return `$${billions.toFixed(1)}B`;
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

/** Human label for a poll interval in ms, e.g. 300000 -> "5 min", 0 -> "manual/once". */
export function formatPollLabel(ms: number): string {
  if (ms <= 0) return "on load only (auto-refresh off)";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const minutes = ms / 60_000;
  if (minutes < 60) return `${minutes} min`;
  return `${minutes / 60}h`;
}

export function formatTimestamp(unixSeconds: number | undefined | null): string {
  if (!unixSeconds) return "—";
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
