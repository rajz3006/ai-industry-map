"use client";

import { useMemo, useState } from "react";
import { useFastRotationBacktest } from "@/hooks/useFastRotationBacktest";
import type { BacktestResult, ClosedTrade, OpenPositionResult, SelectionVariant } from "@/lib/fastRotationBacktest";
import { changeDirection, formatChangePercent, formatDate, formatPrice, formatSignedDollars } from "@/lib/format";

const VARIANT_LABEL: Record<SelectionVariant, string> = {
  raw: "Variant A — raw % losers",
  zscore: "Variant B — volatility-adjusted losers",
};

interface FormState {
  days: number;
  stopPct: number;
  targetPct: number;
  riskPct: number;
  maxPositionPct: number;
  maxPositions: number;
  cash: number;
  variant: "both" | SelectionVariant;
  trendFilterDays: number;
  macroDipThreshold: number;
}

const DEFAULT_FORM: FormState = {
  days: 90,
  stopPct: 1.25,
  targetPct: 5,
  riskPct: 1,
  maxPositionPct: 25,
  maxPositions: 5,
  cash: 5000,
  variant: "both",
  trendFilterDays: 0,
  macroDipThreshold: 0,
};

type DayActivity = { realizedPnl: number; opened: string[]; closedWin: number; closedLoss: number };

function parseISODateUTC(d: string): Date {
  return new Date(`${d}T00:00:00Z`);
}
function isoFromUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}
const MONTH_LABEL_FMT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonthGrids(startStr: string, endStr: string): { label: string; weeks: (string | null)[][] }[] {
  const start = parseISODateUTC(startStr);
  const end = parseISODateUTC(endStr);
  const months: { label: string; weeks: (string | null)[][] }[] = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endMonthStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor <= endMonthStart) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const cells: (string | null)[] = Array(firstWeekday).fill(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(isoFromUTC(new Date(Date.UTC(year, month, day))));
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    months.push({ label: MONTH_LABEL_FMT.format(new Date(Date.UTC(year, month, 1))), weeks });
    cursor = new Date(Date.UTC(year, month + 1, 1));
  }
  return months;
}

function pnlBucket(pnl: number, scale: number): string {
  if (pnl === 0 || scale <= 0) return "";
  const ratio = Math.min(Math.abs(pnl) / scale, 1);
  const level = ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1;
  return `${pnl > 0 ? "pos" : "neg"}-${level}`;
}

export default function FastRotationBacktest() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const { data, loading, error, run } = useFastRotationBacktest();
  const [activeVariant, setActiveVariant] = useState<SelectionVariant>("raw");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function runBacktest() {
    setSelectedDay(null);
    run({
      days: form.days,
      stopPct: form.stopPct,
      targetPct: form.targetPct,
      riskPct: form.riskPct,
      maxPositionPct: form.maxPositionPct,
      maxPositions: form.maxPositions,
      cash: form.cash,
      variant: form.variant,
      trendFilterDays: form.trendFilterDays,
      macroDipThreshold: form.macroDipThreshold,
    });
  }

  const results = data?.results ?? [];
  const selectedResult: BacktestResult | undefined =
    results.find((r) => r.variant === activeVariant) ?? results[0];

  const dayActivity = useMemo(() => {
    const map = new Map<string, DayActivity>();
    const get = (d: string) => {
      let e = map.get(d);
      if (!e) {
        e = { realizedPnl: 0, opened: [], closedWin: 0, closedLoss: 0 };
        map.set(d, e);
      }
      return e;
    };
    if (!selectedResult) return map;
    for (const t of selectedResult.closedTrades) {
      get(t.entryDate).opened.push(t.symbol);
      const exitEntry = get(t.exitDate);
      exitEntry.realizedPnl += t.pnl;
      if (t.reason === "target") exitEntry.closedWin += 1;
      else exitEntry.closedLoss += 1;
    }
    for (const p of selectedResult.openPositions) get(p.entryDate).opened.push(p.symbol);
    return map;
  }, [selectedResult]);

  const maxAbsDailyPnl = useMemo(() => {
    let max = 0;
    for (const a of dayActivity.values()) max = Math.max(max, Math.abs(a.realizedPnl));
    return max;
  }, [dayActivity]);

  const months = useMemo(() => {
    if (!data) return [];
    return buildMonthGrids(data.window.start, data.window.end);
  }, [data]);

  const sortedTrades = useMemo(() => {
    if (!selectedResult) return [];
    const closed: (ClosedTrade & { status: "closed" })[] = selectedResult.closedTrades.map((t) => ({ ...t, status: "closed" as const }));
    const open: (OpenPositionResult & { status: "open" })[] = selectedResult.openPositions.map((p) => ({ ...p, status: "open" as const }));
    return [...closed, ...open].sort((a, b) => b.entryDate.localeCompare(a.entryDate) || a.symbol.localeCompare(b.symbol));
  }, [selectedResult]);

  const selectedDayTrades = useMemo(() => {
    if (!selectedDay || !selectedResult) return [];
    return [
      ...selectedResult.closedTrades
        .filter((t) => t.entryDate === selectedDay || t.exitDate === selectedDay)
        .map((t) => ({ ...t, status: "closed" as const })),
      ...selectedResult.openPositions
        .filter((p) => p.entryDate === selectedDay)
        .map((p) => ({ ...p, status: "open" as const })),
    ];
  }, [selectedDay, selectedResult]);

  return (
    <div className="bt-wrap">
      <div className="bt-head">
        <h2>Fast Rotation — backtest</h2>
        <p className="bt-disclaimer">
          <b>Historical simulation, not a live strategy.</b> Buys the day&rsquo;s biggest losers near the close,
          stops out at a tight fixed % or sells at a fixed % target, and recycles freed cash into the next day&rsquo;s
          candidates. Fills are simulated at the exact close/low/high of each daily bar (IEX feed) — real slippage
          isn&rsquo;t modeled, and results reflect whatever market regime the chosen window fell in. A separate,
          slower strategy (fixed +10%/+20% rule) runs in the Trade Desk tab — this one is its own sleeve.
        </p>
      </div>

      <section className="bt-panel">
        <h3>Strategy parameters</h3>
        <div className="bt-controls">
          <label className="op-filter">
            <span>Window (days)</span>
            <input type="number" min={14} max={180} step={1} value={form.days} onChange={(e) => field("days", Number(e.target.value) || 0)} />
          </label>
          <label className="op-filter">
            <span>Stop (%)</span>
            <input type="number" min={0.1} max={20} step={0.05} value={form.stopPct} onChange={(e) => field("stopPct", Number(e.target.value) || 0)} />
          </label>
          <label className="op-filter">
            <span>Target (%)</span>
            <input type="number" min={0.1} max={50} step={0.25} value={form.targetPct} onChange={(e) => field("targetPct", Number(e.target.value) || 0)} />
          </label>
          <label className="op-filter">
            <span>Risk per trade (%)</span>
            <input type="number" min={0.1} max={10} step={0.1} value={form.riskPct} onChange={(e) => field("riskPct", Number(e.target.value) || 0)} />
          </label>
          <label className="op-filter">
            <span>Max position (% of equity)</span>
            <input type="number" min={5} max={100} step={1} value={form.maxPositionPct} onChange={(e) => field("maxPositionPct", Number(e.target.value) || 0)} />
          </label>
          <label className="op-filter">
            <span>Max concurrent positions</span>
            <input type="number" min={1} max={15} step={1} value={form.maxPositions} onChange={(e) => field("maxPositions", Number(e.target.value) || 0)} />
          </label>
          <label className="op-filter">
            <span>Starting cash ($)</span>
            <input type="number" min={100} step={500} value={form.cash} onChange={(e) => field("cash", Number(e.target.value) || 0)} />
          </label>
          <label className="op-filter">
            <span>Selection</span>
            <select value={form.variant} onChange={(e) => field("variant", e.target.value as FormState["variant"])}>
              <option value="both">Both (compare)</option>
              <option value="raw">Raw % losers only</option>
              <option value="zscore">Volatility-adjusted only</option>
            </select>
          </label>
        </div>

        <h3 className="bt-filters-heading">Quality filters (optional)</h3>
        <p className="bt-panel-note">
          Neither filter is free — each cuts the trade count, so check the summary cards below to see whether the
          win-rate/edge gain was worth the lower throughput in this window.
        </p>
        <div className="bt-controls">
          <label className="op-filter">
            <span>Trend filter (SMA days, 0 = off)</span>
            <input
              type="number"
              min={0}
              max={200}
              step={1}
              value={form.trendFilterDays}
              onChange={(e) => field("trendFilterDays", Number(e.target.value) || 0)}
            />
            <span className="bt-filter-hint">
              Only buy a loser if it&rsquo;s still above its own trailing N-day average (&ldquo;still bullish&rdquo;
              proxy — no historical analyst-rating data exists to backtest an actual Buy rating).
            </span>
          </label>
          <label className="op-filter">
            <span>Macro-dip gate (universe median %, 0 = off)</span>
            <input
              type="number"
              min={-20}
              max={0}
              step={0.25}
              value={form.macroDipThreshold}
              onChange={(e) => field("macroDipThreshold", Number(e.target.value) || 0)}
            />
            <span className="bt-filter-hint">
              Only buy on days where the whole 57-symbol universe&rsquo;s median move is at or below this (a broad
              red day implies the dip is market-wide, not one stock&rsquo;s own bad news). E.g. -1 requires a
              genuinely broad selloff day before buying anything.
            </span>
          </label>
        </div>

        <button className="td-place-btn bt-run-btn" disabled={loading} onClick={runBacktest}>
          {loading ? "Running…" : "Run backtest"}
        </button>
        {error && <p className="td-error">{error}</p>}
      </section>

      {data && (
        <>
          <p className="op-session">
            Simulated {data.window.start} → {data.window.end}
          </p>

          <section className="bt-summary-grid">
            {results.map((r) => (
              <div key={r.variant} className="bt-summary-card">
                <h4>{VARIANT_LABEL[r.variant]}</h4>
                <div className="bt-summary-stats">
                  <span>
                    Ending equity <b>{formatPrice(r.finalEquity, "USD")}</b>{" "}
                    <span className={`chg ${changeDirection(r.totalReturnPct)}`}>{formatChangePercent(r.totalReturnPct)}</span>
                  </span>
                  <span>
                    Trades <b>{r.numTradesOpened}</b> opened, <b>{r.numClosed}</b> closed
                  </span>
                  <span>
                    Target / Stop <b>{r.numTargets}</b> / <b>{r.numStops}</b>
                  </span>
                  <span>
                    Win rate <b>{r.winRate === null ? "—" : `${r.winRate.toFixed(1)}%`}</b>
                  </span>
                  <span>
                    Avg hold <b>{r.avgHoldDays === null ? "—" : `${r.avgHoldDays.toFixed(1)}d`}</b>
                  </span>
                  <span>
                    Max concurrent <b>{r.maxConcurrent}</b>/{form.maxPositions}
                  </span>
                  <span>
                    Still open <b>{r.openPositions.length}</b> ({formatSignedDollars(r.unrealizedPnl)} unrealized)
                  </span>
                </div>
                {results.length > 1 && (
                  <button
                    className={`bt-variant-btn ${activeVariant === r.variant ? "active" : ""}`}
                    onClick={() => {
                      setActiveVariant(r.variant);
                      setSelectedDay(null);
                    }}
                  >
                    {activeVariant === r.variant ? "Viewing below" : "View trades + calendar"}
                  </button>
                )}
              </div>
            ))}
          </section>

          {selectedResult && (
            <>
              <section className="bt-panel">
                <h3>Calendar — {VARIANT_LABEL[selectedResult.variant]}</h3>
                <p className="bt-panel-note">
                  Colored by that day&rsquo;s <b>realized</b> P&amp;L (trades closed that day). Click a day for detail.
                </p>
                <div className="bt-calendar">
                  {months.map((m) => (
                    <div key={m.label} className="bt-cal-month">
                      <h4>{m.label}</h4>
                      <div className="bt-cal-weekdays">
                        {WEEKDAY_LABELS.map((w) => (
                          <span key={w}>{w}</span>
                        ))}
                      </div>
                      {m.weeks.map((week, wi) => (
                        <div key={wi} className="bt-cal-week">
                          {week.map((d, di) => {
                            if (!d) return <div key={di} className="bt-cal-day empty" />;
                            const inRange = d >= data.window.start && d <= data.window.end;
                            const activity = dayActivity.get(d);
                            const bucket = activity ? pnlBucket(activity.realizedPnl, maxAbsDailyPnl) : "";
                            return (
                              <button
                                key={di}
                                className={`bt-cal-day ${inRange ? "" : "out-of-range"} ${bucket} ${selectedDay === d ? "selected" : ""}`}
                                onClick={() => inRange && setSelectedDay(d === selectedDay ? null : d)}
                                disabled={!inRange}
                                title={
                                  activity
                                    ? `${d}: ${formatSignedDollars(activity.realizedPnl)} realized, ${activity.opened.length} opened`
                                    : d
                                }
                              >
                                <span className="bt-cal-date">{Number(d.slice(-2))}</span>
                                {activity && activity.realizedPnl !== 0 && (
                                  <span className="bt-cal-pnl">{formatSignedDollars(activity.realizedPnl)}</span>
                                )}
                                {activity && activity.opened.length > 0 && (
                                  <span className="bt-cal-count">{activity.opened.length} buy{activity.opened.length === 1 ? "" : "s"}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {selectedDay && (
                  <div className="bt-day-detail">
                    <h4>{formatDate(selectedDay)}</h4>
                    {selectedDayTrades.length === 0 && <p className="bt-empty">No activity this day.</p>}
                    {selectedDayTrades.map((t, i) => (
                      <p key={i} className="bt-day-trade">
                        <span className="mv-row-symbol">{t.symbol}</span>{" "}
                        {t.entryDate === selectedDay && <span>bought {formatPrice(t.entryPrice, t.symbol)}</span>}
                        {t.status === "closed" && t.exitDate === selectedDay && (
                          <span>
                            {" "}
                            → {t.reason === "target" ? "target hit" : "stopped out"} {formatPrice(t.exitPrice, t.symbol)}{" "}
                            <span className={`chg ${changeDirection(t.pnl)}`}>{formatSignedDollars(t.pnl)}</span>
                          </span>
                        )}
                      </p>
                    ))}
                  </div>
                )}
              </section>

              <section className="bt-panel">
                <h3>Trade log — {VARIANT_LABEL[selectedResult.variant]}</h3>
                {sortedTrades.length === 0 && <p className="bt-empty">No trades generated for this window.</p>}
                {sortedTrades.length > 0 && (
                  <table className="mk-table bt-trades">
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Entry date</th>
                        <th className="num">Entry $</th>
                        <th>Exit date</th>
                        <th className="num">Exit $</th>
                        <th>Reason</th>
                        <th className="num">P&amp;L $</th>
                        <th className="num">P&amp;L %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTrades.map((t, i) => {
                        const isOpen = t.status === "open";
                        const pnl = isOpen ? (t as OpenPositionResult).unrealizedPnl : (t as ClosedTrade).pnl;
                        const pnlPct = isOpen
                          ? ((t as OpenPositionResult).lastPrice / t.entryPrice - 1) * 100
                          : (t as ClosedTrade).pnlPct;
                        return (
                          <tr key={i}>
                            <td>{t.symbol}</td>
                            <td>{t.entryDate}</td>
                            <td className="num">{formatPrice(t.entryPrice, t.symbol)}</td>
                            <td>{isOpen ? "—" : (t as ClosedTrade).exitDate}</td>
                            <td className="num">{isOpen ? formatPrice((t as OpenPositionResult).lastPrice, t.symbol) : formatPrice((t as ClosedTrade).exitPrice, t.symbol)}</td>
                            <td>
                              {isOpen ? (
                                <span className="bt-reason open">still open</span>
                              ) : (
                                <span className={`bt-reason ${(t as ClosedTrade).reason}`}>
                                  {(t as ClosedTrade).reason === "target" ? "target" : "stop"}
                                </span>
                              )}
                            </td>
                            <td className={`num chg ${changeDirection(pnl)}`}>{formatSignedDollars(pnl)}</td>
                            <td className={`num chg ${changeDirection(pnlPct)}`}>{formatChangePercent(pnlPct)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
