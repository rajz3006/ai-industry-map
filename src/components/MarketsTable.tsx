"use client";

import { useMemo, useState } from "react";
import { nodeById } from "@/data/industry-map";
import { allTickerRows } from "@/data/tickers";
import type { QuoteMap } from "@/hooks/useQuotes";
import { useNowTick } from "@/hooks/useNowTick";
import {
  changeDirection,
  formatChangePercent,
  formatPollLabel,
  formatPrice,
  formatRelativeTime,
  formatTimestamp,
} from "@/lib/format";

type SortKey = "name" | "layer" | "ticker" | "price" | "chgPct" | "range" | "asOf";

const ALL_CATEGORIES = "All";

export default function MarketsTable({
  quotes,
  pollMs,
  loading,
  lastUpdatedAt,
  onSelectNode,
  onOpenStock,
}: {
  quotes: QuoteMap;
  pollMs: number;
  loading: boolean;
  lastUpdatedAt: number | null;
  onSelectNode: (id: string) => void;
  onOpenStock: (symbol: string) => void;
}) {
  useNowTick(10_000); // keeps the "updated Xs/m ago" text below fresh
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "chgPct", dir: -1 });
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  const rows = useMemo(() => {
    return allTickerRows.map((r) => {
      const n = nodeById[r.nodeId];
      const q = r.isUS ? quotes[r.symbol] : undefined;
      const live = q && !("error" in q) ? q : undefined;
      const errored = !!q && "error" in q;
      return {
        nodeId: r.nodeId,
        name: n?.name ?? r.nodeId,
        layer: n?.layer ?? "Other",
        symbol: r.symbol,
        exchange: r.exchange,
        isUS: r.isUS,
        note: r.note,
        errored,
        price: live?.price,
        changePercent: live?.changePercent,
        change: live?.change,
        low: live?.low,
        high: live?.high,
        timestamp: live?.timestamp,
      };
    });
  }, [quotes]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const r of rows) {
      if (!seen.has(r.layer)) {
        seen.add(r.layer);
        ordered.push(r.layer);
      }
    }
    return [ALL_CATEGORIES, ...ordered];
  }, [rows]);

  const filtered = useMemo(
    () => (category === ALL_CATEGORIES ? rows : rows.filter((r) => r.layer === category)),
    [rows, category]
  );

  const sorted = useMemo(() => {
    const copy = filtered.slice();
    copy.sort((a, b) => {
      let av: string | number | undefined;
      let bv: string | number | undefined;
      switch (sort.key) {
        case "name":
          av = a.name;
          bv = b.name;
          break;
        case "layer":
          av = a.layer;
          bv = b.layer;
          break;
        case "ticker":
          av = a.symbol;
          bv = b.symbol;
          break;
        case "price":
          av = a.price;
          bv = b.price;
          break;
        case "chgPct":
          av = a.changePercent;
          bv = b.changePercent;
          break;
        case "range":
          av = a.price;
          bv = b.price;
          break;
        case "asOf":
          av = a.timestamp;
          bv = b.timestamp;
          break;
      }
      const an = av === undefined || av === null;
      const bn = bv === undefined || bv === null;
      if (an && bn) return 0;
      if (an) return 1;
      if (bn) return -1;
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * sort.dir;
      return ((av as number) - (bv as number)) * sort.dir;
    });
    return copy;
  }, [filtered, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => ({ key, dir: prev.key === key ? ((-prev.dir) as 1 | -1) : -1 }));
  }

  return (
    <div className="mk-wrap">
      <div className="mk-head">
        <div>
          <h2>Public-market pricing</h2>
          <p>
            Every identifiable public ticker among the mapped companies. Private companies (OpenAI, Anthropic, Humain,
            Crusoe, and others) have no market price and are omitted. Click a row to open its detail view.
          </p>
        </div>
        <span className="mk-refresh">
          Live via Finnhub (US-listed only) · {loading ? "updating…" : `updated ${formatRelativeTime(lastUpdatedAt)}`}
          {" · refreshes every "}
          {formatPollLabel(pollMs)}
        </span>
      </div>
      <div className="mk-categories" role="tablist" aria-label="Filter by category">
        {categories.map((c) => (
          <button
            key={c}
            className={`mk-cat ${category === c ? "active" : ""}`}
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
            {c !== ALL_CATEGORIES && (
              <span className="mk-cat-count">{rows.filter((r) => r.layer === c).length}</span>
            )}
          </button>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="mk-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("name")}>Company</th>
              <th onClick={() => toggleSort("layer")}>Category</th>
              <th onClick={() => toggleSort("ticker")}>Ticker</th>
              <th className="num" onClick={() => toggleSort("price")}>
                Price
              </th>
              <th className="num" onClick={() => toggleSort("chgPct")}>
                Change
              </th>
              <th className="num">Day range</th>
              <th onClick={() => toggleSort("asOf")}>As of</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const dir = changeDirection(r.changePercent);
              const clickable = r.isUS;
              return (
                <tr key={r.nodeId + r.symbol}>
                  <td
                    className="co"
                    onClick={() => onSelectNode(r.nodeId)}
                  >
                    {r.name}
                  </td>
                  <td className="exch">{r.layer}</td>
                  <td>
                    {r.symbol}
                    <span className="exch"> {r.exchange}</span>
                  </td>
                  <td
                    className="num"
                    style={clickable ? { cursor: "pointer" } : undefined}
                    onClick={() => clickable && onOpenStock(r.symbol)}
                  >
                    {clickable ? (
                      typeof r.price === "number" ? (
                        formatPrice(r.price, r.symbol)
                      ) : r.errored ? (
                        <span className="unavail">unavailable</span>
                      ) : (
                        <span className="exch">loading…</span>
                      )
                    ) : (
                      <span className="unavail">{r.note ?? "unavailable"}</span>
                    )}
                  </td>
                  <td className="num">
                    {typeof r.changePercent === "number" ? (
                      <span className={`chg ${dir}`}>{formatChangePercent(r.changePercent)}</span>
                    ) : (
                      <span className="exch">—</span>
                    )}
                  </td>
                  <td className="num">
                    {typeof r.low === "number" && typeof r.high === "number" ? (
                      `${formatPrice(r.low, r.symbol)}–${formatPrice(r.high, r.symbol)}`
                    ) : (
                      <span className="exch">—</span>
                    )}
                  </td>
                  <td className="exch">
                    {r.isUS ? (typeof r.timestamp === "number" ? formatTimestamp(r.timestamp) : "—") : "N/A"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
