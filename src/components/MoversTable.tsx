"use client";

import { useMemo, useState } from "react";
import { useMovers } from "@/hooks/useMovers";
import { useMoversTrend } from "@/hooks/useMoversTrend";
import type { Period } from "@/app/api/movers/trend/route";
import type { EarningsMap } from "@/app/api/earnings/route";
import CategoryTrendChart from "./CategoryTrendChart";
import SignalsPanel from "./SignalsPanel";
import { changeDirection, formatChangePercent, formatPrice } from "@/lib/format";

const TOP_N = 10;
const PERIODS: { value: Period; label: string }[] = [
  { value: "1M", label: "1 month" },
  { value: "3M", label: "3 months" },
  { value: "6M", label: "6 months" },
];

function fmtDateLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function fmtShortDate(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default function MoversTable({
  earnings,
  onSelectNode,
  onOpenStock,
}: {
  earnings: EarningsMap;
  onSelectNode: (id: string) => void;
  onOpenStock: (symbol: string) => void;
}) {
  const [period, setPeriod] = useState<Period>("1M");
  const trend = useMoversTrend(period);

  const [date, setDate] = useState<string | null>(null);
  const { data, loading, error } = useMovers(date);

  const resolvedDate = data?.date ?? null;
  const bounds = data?.availableDates;

  const { gainers, losers } = useMemo(() => {
    if (!data) return { gainers: [], losers: [] };
    // One row per symbol for the leaderboards (a symbol can back >1 node in the graph).
    const seen = new Set<string>();
    const bySymbol = data.movers.filter((m) => {
      if (seen.has(m.symbol)) return false;
      seen.add(m.symbol);
      return true;
    });
    return {
      gainers: bySymbol.slice(0, TOP_N),
      losers: bySymbol.slice(-TOP_N).reverse(),
    };
  }, [data]);

  const topUp = data?.categoryTrends.filter((c) => c.avgChangePercent > 0).slice(0, 5) ?? [];
  const topDown = data?.categoryTrends.filter((c) => c.avgChangePercent < 0).slice(-5).reverse() ?? [];
  const maxAbsCategoryMove = Math.max(1, ...(data?.categoryTrends.map((c) => Math.abs(c.avgChangePercent)) ?? [1]));

  return (
    <div className="mv-wrap">
      <div className="mv-head">
        <div>
          <h2>Industry movers</h2>
          <p>
            How the stack has been trading over the last month or few — which segments are leading or lagging, and
            which names are driving it — with a single session&rsquo;s detail underneath.
          </p>
        </div>
      </div>

      <SignalsPanel earnings={earnings} onSelectNode={onSelectNode} onOpenStock={onOpenStock} />

      {/* --- Trend section: leaders/laggards + segment trend over a trailing period --- */}
      <section className="mv-trend-section">
        <div className="mv-trend-head">
          <h3>Trend</h3>
          <div className="mv-period-toggle" role="tablist" aria-label="Trend period">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                role="tab"
                aria-selected={period === p.value}
                className={`mv-period-btn ${period === p.value ? "active" : ""}`}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {trend.error && <p className="mv-error">Couldn&rsquo;t load the trend: {trend.error}</p>}
        {trend.loading && !trend.data && <p className="mv-loading">Loading {period} history…</p>}

        {trend.data && (
          <>
            <p className="mv-session">
              {fmtShortDate(trend.data.start)} – {fmtShortDate(trend.data.end)}
              {trend.loading && <span className="mv-updating"> · refreshing…</span>}
            </p>

            <p className="mv-trend-subhead">Segment performance, cumulative</p>
            <CategoryTrendChart series={trend.data.categorySeries} />

            <div className="mv-leaders">
              <div className="mv-leader-col">
                <h3>Leaders over the period</h3>
                <MoverList rows={trend.data.leaders.slice(0, TOP_N)} onSelectNode={onSelectNode} onOpenStock={onOpenStock} />
              </div>
              <div className="mv-leader-col">
                <h3>Laggards over the period</h3>
                <MoverList rows={trend.data.laggards.slice(0, TOP_N)} onSelectNode={onSelectNode} onOpenStock={onOpenStock} />
              </div>
            </div>
          </>
        )}
      </section>

      {/* --- Single-session detail, underneath the trend --- */}
      <section className="mv-session-section">
        <div className="mv-trend-head">
          <h3>Session detail</h3>
          <label className="mv-date">
            <span className="sr-only">Session date</span>
            <input
              type="date"
              value={date ?? resolvedDate ?? ""}
              min={bounds?.min}
              max={bounds?.max}
              onChange={(e) => setDate(e.target.value || null)}
              disabled={!bounds}
            />
          </label>
        </div>

        {error && <p className="mv-error">Couldn&rsquo;t load movers: {error}</p>}
        {loading && !data && <p className="mv-loading">Loading session history…</p>}

        {data && (
          <>
            <p className="mv-session">
              Session <b>{fmtDateLabel(data.date)}</b> vs. the prior close
              {loading && <span className="mv-updating"> · refreshing…</span>}
            </p>

            <div className="mv-categories">
              <div className="mv-cat-col">
                <h3>Segments trending up</h3>
                {topUp.length === 0 && <p className="mv-empty">No segment averaged a gain this session.</p>}
                {topUp.map((c) => (
                  <div className="mv-cat-row" key={c.layer}>
                    <span className="mv-cat-name">{c.layer}</span>
                    <div className="mv-cat-bar-track">
                      <div
                        className="mv-cat-bar up"
                        style={{ width: `${(Math.abs(c.avgChangePercent) / maxAbsCategoryMove) * 100}%` }}
                      />
                    </div>
                    <span className="chg up">{formatChangePercent(c.avgChangePercent)}</span>
                  </div>
                ))}
              </div>
              <div className="mv-cat-col">
                <h3>Segments trending down</h3>
                {topDown.length === 0 && <p className="mv-empty">No segment averaged a loss this session.</p>}
                {topDown.map((c) => (
                  <div className="mv-cat-row" key={c.layer}>
                    <span className="mv-cat-name">{c.layer}</span>
                    <div className="mv-cat-bar-track">
                      <div
                        className="mv-cat-bar down"
                        style={{ width: `${(Math.abs(c.avgChangePercent) / maxAbsCategoryMove) * 100}%` }}
                      />
                    </div>
                    <span className="chg down">{formatChangePercent(c.avgChangePercent)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mv-leaders">
              <div className="mv-leader-col">
                <h3>Top gainers</h3>
                <MoverList rows={gainers} onSelectNode={onSelectNode} onOpenStock={onOpenStock} />
              </div>
              <div className="mv-leader-col">
                <h3>Top losers</h3>
                <MoverList rows={losers} onSelectNode={onSelectNode} onOpenStock={onOpenStock} />
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

interface MoverListRow {
  symbol: string;
  nodeId: string;
  name: string;
  layer: string;
  changePercent: number;
  close?: number;
}

function MoverList({
  rows,
  onSelectNode,
  onOpenStock,
}: {
  rows: MoverListRow[];
  onSelectNode: (id: string) => void;
  onOpenStock: (symbol: string) => void;
}) {
  if (rows.length === 0) return <p className="mv-empty">No data for this window.</p>;
  return (
    <ol className="mv-list">
      {rows.map((r) => (
        <li key={r.symbol} className="mv-row">
          <button className="mv-row-name" onClick={() => onSelectNode(r.nodeId)} title="Open in dependency graph">
            <span className="mv-row-co">{r.name}</span>
            <span className="mv-row-layer">{r.layer}</span>
          </button>
          <button className="mv-row-price" onClick={() => onOpenStock(r.symbol)} title="Open stock detail">
            <span className="mv-row-symbol">{r.symbol}</span>
            {typeof r.close === "number" && <span className="mv-row-amt">{formatPrice(r.close, r.symbol)}</span>}
            <span className={`chg ${changeDirection(r.changePercent)}`}>{formatChangePercent(r.changePercent)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
