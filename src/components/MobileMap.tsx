"use client";

import { columns, nodeById } from "@/data/industry-map";
import { tickers } from "@/data/tickers";
import type { QuoteMap } from "@/hooks/useQuotes";
import type { EarningsMap } from "@/app/api/earnings/route";
import { earningsLabel, nextEarningsDate } from "@/hooks/useEarnings";
import { changeDirection } from "@/lib/format";

export default function MobileMap({
  onSelect,
  quotes,
  earnings,
}: {
  onSelect: (id: string) => void;
  quotes: QuoteMap;
  earnings: EarningsMap;
}) {
  return (
    <div id="mobileMap" className="mobile-map">
      {columns.map((col, i) => (
        <details key={col.label} className="mobile-layer" open={i === 0}>
          <summary>
            {col.label}
            <span>{col.ids.length} nodes</span>
          </summary>
          <div className="entity-grid">
            {col.ids.map((id) => {
              const n = nodeById[id];
              if (!n) return null;
              const tks = tickers[id];
              const us = tks?.find((t) => t.isUS);
              const symbol = us?.symbol ?? tks?.[0]?.symbol;
              const q = us ? quotes[us.symbol] : undefined;
              const pct = q && !("error" in q) ? q.changePercent : undefined;
              const dir = changeDirection(pct);
              const earn = us ? earningsLabel(nextEarningsDate(earnings, () => us.symbol)) : null;
              return (
                <button key={id} className="entity-btn" onClick={() => onSelect(id)}>
                  <b>{n.name}</b>
                  <small>{n.sub}</small>
                  {symbol && (
                    <span className={`tk ${dir}`}>
                      {symbol}
                      {typeof pct === "number" ? ` ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` : ""}
                      {earn ? ` · ${earn}` : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
