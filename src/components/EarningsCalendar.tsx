"use client";

import { useMemo, useState } from "react";
import { nodeById } from "@/data/industry-map";
import { allTickerRows } from "@/data/tickers";
import type { EarningsMap } from "@/app/api/earnings/route";
import { formatRelativeTime } from "@/lib/format";
import { useNowTick } from "@/hooks/useNowTick";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

interface EarningsEntry {
  symbol: string;
  nodeId: string;
  name: string;
  layer: string;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthWeeks(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startDow = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: Date[] = [];
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push(new Date(Date.UTC(year, month, -i)));
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month, d)));
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    cells.push(new Date(last.getTime() + 24 * 3600_000));
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default function EarningsCalendar({
  earnings,
  loading,
  lastUpdatedAt,
  onOpenStock,
}: {
  earnings: EarningsMap;
  loading: boolean;
  lastUpdatedAt: number | null;
  onOpenStock: (symbol: string) => void;
}) {
  useNowTick(30_000);
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));

  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const weeks = useMemo(() => monthWeeks(year, month), [year, month]);
  const todayKey = toDateKey(today);
  const currentMonthKey = `${year}-${month}`;

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EarningsEntry[]>();
    for (const row of allTickerRows) {
      if (!row.isUS) continue;
      const e = earnings[row.symbol];
      if (!e || "error" in e || !e.next?.date) continue;
      const n = nodeById[row.nodeId];
      const entry: EarningsEntry = { symbol: row.symbol, nodeId: row.nodeId, name: n?.name ?? row.nodeId, layer: n?.layer ?? "Other" };
      const list = map.get(e.next.date) ?? [];
      if (!list.some((x) => x.symbol === entry.symbol)) list.push(entry);
      map.set(e.next.date, list);
    }
    return map;
  }, [earnings]);

  const eventCountThisMonth = useMemo(() => {
    let count = 0;
    for (const [date, entries] of eventsByDate) {
      const d = new Date(date + "T00:00:00Z");
      if (`${d.getUTCFullYear()}-${d.getUTCMonth()}` === currentMonthKey) count += entries.length;
    }
    return count;
  }, [eventsByDate, currentMonthKey]);

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + delta, 1)));
  }
  function goToday() {
    setCursor(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
  }

  return (
    <div className="ec-wrap">
      <div className="ec-head">
        <div>
          <h2>Earnings calendar</h2>
          <p>
            Next scheduled reporting date for every mapped US-listed company that has one on file. Click a symbol
            for company details, price history and the full previous/next earnings record.
          </p>
        </div>
        <span className="ec-status">
          {loading ? "Refreshing earnings…" : `Earnings data updated ${formatRelativeTime(lastUpdatedAt)}`}
          {" · "}
          {eventCountThisMonth} scheduled this month
        </span>
      </div>

      <div className="ec-nav">
        <button className="ec-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <h3>{MONTH_FMT.format(cursor)}</h3>
        <button className="ec-nav-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
          ›
        </button>
        <button className="ec-today-btn" onClick={goToday}>
          Today
        </button>
      </div>

      <div className="ec-grid">
        {WEEKDAYS.map((w) => (
          <div className="ec-weekday" key={w}>
            {w}
          </div>
        ))}
        {weeks.flatMap((week) =>
          week.map((day) => {
            const key = toDateKey(day);
            const inMonth = day.getUTCMonth() === month;
            const isToday = key === todayKey;
            const entries = eventsByDate.get(key) ?? [];
            return (
              <div
                key={key}
                className={`ec-cell ${inMonth ? "" : "muted"} ${isToday ? "today" : ""}`}
              >
                <span className="ec-daynum">{day.getUTCDate()}</span>
                {entries.length > 0 && (
                  <div className="ec-chips">
                    {entries.map((e) => (
                      <button
                        key={e.symbol}
                        className="ec-chip"
                        onClick={() => onOpenStock(e.symbol)}
                        title={`${e.name} (${e.layer}) reports ${key}`}
                      >
                        {e.symbol}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
