"use client";

import { useMemo, useState } from "react";
import { nodeById } from "@/data/industry-map";
import { allTickerRows } from "@/data/tickers";
import { useQuotes } from "@/hooks/useQuotes";
import { changeDirection, formatChangePercent, formatPrice, formatTimestamp } from "@/lib/format";

type SortKey = "name" | "ticker" | "price" | "chgPct" | "range" | "asOf";

export default function MarketsTable({
  onSelectNode,
  onOpenStock,
}: {
  onSelectNode: (id: string) => void;
  onOpenStock: (symbol: string) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "chgPct", dir: -1 });
  const usSymbols = useMemo(
    () => Array.from(new Set(allTickerRows.filter((r) => r.isUS).map((r) => r.symbol))),
    []
  );
  const { quotes } = useQuotes(usSymbols);

  const rows = useMemo(() => {
    return allTickerRows.map((r) => {
      const n = nodeById[r.nodeId];
      const q = r.isUS ? quotes[r.symbol] : undefined;
      const live = q && !("error" in q) ? q : undefined;
      return {
        nodeId: r.nodeId,
        name: n?.name ?? r.nodeId,
        symbol: r.symbol,
        exchange: r.exchange,
        isUS: r.isUS,
        note: r.note,
        price: live?.price,
        changePercent: live?.changePercent,
        change: live?.change,
        low: live?.low,
        high: live?.high,
        timestamp: live?.timestamp,
      };
    });
  }, [quotes]);

  const sorted = useMemo(() => {
    const copy = rows.slice();
    copy.sort((a, b) => {
      let av: string | number | undefined;
      let bv: string | number | undefined;
      switch (sort.key) {
        case "name":
          av = a.name;
          bv = b.name;
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
  }, [rows, sort]);

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
        <span className="mk-refresh">Live via Finnhub · polled every ~20s (US-listed only)</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="mk-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("name")}>Company</th>
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
