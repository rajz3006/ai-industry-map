"use client";

import { useEffect, useRef, useState } from "react";
import type { EarningsResearchResult, PlaybookAggregates } from "@/app/api/earnings-research/route";
import { formatDate, formatPrice } from "@/lib/format";

const pct = (n: number | null | undefined, digits = 1): string =>
  n == null || !Number.isFinite(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;

const px = (n: number | null | undefined, symbol: string): string =>
  n == null || !Number.isFinite(n) ? "—" : formatPrice(n, symbol);

function verdictLine(data: EarningsResearchResult): string {
  const agg = data.aggregates;
  if (!agg || agg.n < 3) {
    return `Not enough earnings history to call a pattern (${agg?.n ?? 0} complete quarters).`;
  }
  const rallied = data.quarters.filter((q) => q.preRunPct > 0).length;
  const reversed = Math.round(agg.reversalRate * agg.n);
  return (
    `Rallied into the print in ${rallied} of ${agg.n} quarters; the day-after move reversed ` +
    `the pre-run ${reversed} of ${agg.n} times; average 5-day move after earnings ${pct(agg.avgFiveDay)}.`
  );
}

function StatTiles({ agg }: { agg: PlaybookAggregates }) {
  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: "Avg pre-earnings run (T-5→T-1)", value: pct(agg.avgPreRun) },
    { label: "Median pre-earnings run", value: pct(agg.medianPreRun) },
    { label: "Avg day-after |move|", value: `${Math.abs(agg.avgAbsDayAfter).toFixed(1)}%` },
    {
      label: "Day-after up / down",
      value: `${agg.dayAfterUp} / ${agg.dayAfterDown}`,
    },
    { label: "Avg +5d after earnings", value: pct(agg.avgFiveDay) },
    {
      label: "Expected-move proxy",
      value: `±${agg.expectedMoveProxyPct.toFixed(1)}%`,
      sub: "Historical avg day-after move — no options data on free tier",
    },
  ];
  return (
    <div className="pb-tiles">
      {tiles.map((t) => (
        <div className="pb-tile" key={t.label}>
          <b>{t.label}</b>
          <span>{t.value}</span>
          {t.sub && <em>{t.sub}</em>}
        </div>
      ))}
    </div>
  );
}

export default function EarningsResearch({ symbol, nextDate }: { symbol: string; nextDate: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EarningsResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    fetch(`/api/earnings-research?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json && typeof json === "object" && "error" in json) {
          setError(String(json.error));
        } else {
          setData(json as EarningsResearchResult);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [open, symbol]);

  return (
    <div className="pb-wrap">
      <button
        className="pb-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`pb-body-${symbol}`}
      >
        <span className="pb-caret">{open ? "▾" : "▸"}</span> Earnings playbook — how {symbol} usually
        trades around earnings
      </button>
      {open && (
        <div className="pb-body" id={`pb-body-${symbol}`}>
          {loading && <p className="unavailable-note">Building the playbook…</p>}
          {error && <p className="unavailable-note">{error}</p>}
          {data && (
            <>
              <p className="pb-verdict">{verdictLine(data)}</p>

              {data.aggregates && <StatTiles agg={data.aggregates} />}

              {data.quarters.length > 0 && (
                <div className="pb-table-wrap">
                  <table className="pb-table">
                    <thead>
                      <tr>
                        <th>Report</th>
                        <th>EPS act / est</th>
                        <th>Pre-run</th>
                        <th>Day-after</th>
                        <th>+5d</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.quarters.map((q) => (
                        <tr key={q.date}>
                          <td>{formatDate(q.date)}</td>
                          <td>
                            {q.epsActual ?? "—"} / {q.epsEstimate ?? "—"}
                            {q.beat === true && <span className="pb-beat"> ▲</span>}
                            {q.beat === false && <span className="pb-miss"> ▼</span>}
                          </td>
                          <td className={q.preRunPct >= 0 ? "pb-up" : "pb-down"}>{pct(q.preRunPct)}</td>
                          <td className={q.dayAfterPct >= 0 ? "pb-up" : "pb-down"}>
                            {pct(q.dayAfterPct)}
                          </td>
                          <td className={q.fiveDayPct >= 0 ? "pb-up" : "pb-down"}>
                            {pct(q.fiveDayPct)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {data.setup && (
                <div className="pb-setup">
                  <h4>Current setup</h4>
                  <div className="stats-grid">
                    <div className="stat-cell">
                      <b>RSI-14</b>
                      <span>{data.setup.rsi14 != null ? data.setup.rsi14.toFixed(1) : "—"}</span>
                    </div>
                    <div className="stat-cell">
                      <b>MACD histogram</b>
                      <span>
                        {data.setup.macd != null
                          ? `${data.setup.macd.histogram >= 0 ? "+" : ""}${data.setup.macd.histogram.toFixed(2)}`
                          : "—"}
                      </span>
                    </div>
                    <div className="stat-cell">
                      <b>SMA 20 / 50 / 200</b>
                      <span>
                        {px(data.setup.sma20, symbol)} / {px(data.setup.sma50, symbol)} /{" "}
                        {px(data.setup.sma200, symbol)}
                      </span>
                    </div>
                    <div className="stat-cell">
                      <b>Bollinger %B</b>
                      <span>
                        {data.setup.bollinger != null
                          ? data.setup.bollinger.percentB.toFixed(2)
                          : "—"}
                      </span>
                    </div>
                    <div className="stat-cell">
                      <b>ATR-20</b>
                      <span>
                        {px(data.setup.atr20, symbol)}
                        {data.setup.atrPctOfPrice != null &&
                          ` (${data.setup.atrPctOfPrice.toFixed(1)}% of price)`}
                      </span>
                    </div>
                    <div className="stat-cell">
                      <b>Volume vs 20d avg</b>
                      <span>
                        {data.setup.volumeRatio20 != null
                          ? `${data.setup.volumeRatio20.toFixed(2)}×`
                          : "—"}
                      </span>
                    </div>
                    <div className="stat-cell">
                      <b>20d high / low</b>
                      <span>
                        {data.setup.swing20
                          ? `${px(data.setup.swing20.high, symbol)} / ${px(data.setup.swing20.low, symbol)}`
                          : "—"}
                      </span>
                    </div>
                    <div className="stat-cell">
                      <b>60d high / low</b>
                      <span>
                        {data.setup.swing60
                          ? `${px(data.setup.swing60.high, symbol)} / ${px(data.setup.swing60.low, symbol)}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                  {data.setup.unfilledGaps.length > 0 && (
                    <p className="pb-gaps">
                      Unfilled gaps:{" "}
                      {data.setup.unfilledGaps.map((g) => (
                        <span key={`${g.date}-${g.low}`} className="pb-gap">
                          {g.type === "up" ? "↑" : "↓"} {px(g.low, symbol)}–{px(g.high, symbol)} (
                          {formatDate(g.date)})
                        </span>
                      ))}
                    </p>
                  )}
                  <p className="pb-asof">
                    Indicator snapshot from daily bars ending {formatDate(data.setup.lastDate)}.
                  </p>
                </div>
              )}

              {data.news.length > 0 && (
                <div className="pb-news">
                  <h4>Recent catalysts</h4>
                  <ul className="news-list">
                    {data.news.map((a) => (
                      <li key={a.url} className="news-item">
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="news-headline"
                        >
                          {a.headline}
                        </a>
                        <div className="news-meta">
                          <span className="news-source">{a.source}</span>
                          {a.date && <span> · {formatDate(a.date)}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.unavailable.length > 0 && (
                <ul className="pb-missing">
                  {data.unavailable.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              )}

              <p className="pb-disclaimer">
                Next report {formatDate(nextDate)}. Not financial advice — historical patterns
                don&apos;t predict future moves.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
