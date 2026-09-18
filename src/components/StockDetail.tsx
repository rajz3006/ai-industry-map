"use client";

import { useEffect, useRef, useState } from "react";
import { AreaSeries, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import type { ProfileResult } from "@/app/api/profile/route";
import type { CandlesResult, Range } from "@/app/api/candles/route";
import type { EarningsResult } from "@/app/api/earnings/route";
import type { QuoteResult } from "@/app/api/quote/route";
import { formatChangeAbs, formatChangePercent, formatDate, formatMarketCap, formatPrice, formatTimestamp } from "@/lib/format";

const RANGES: Range[] = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y"];

type Fetchable<T> = { data?: T; error?: string; loading: boolean };

function useApi<T>(url: string | null): Fetchable<T> {
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

export default function StockDetail({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  const [range, setRange] = useState<Range>("1M");
  const quote = useApi<QuoteResult>(`/api/quote?symbols=${symbol}`);
  const profile = useApi<ProfileResult>(`/api/profile?symbol=${symbol}`);
  const candles = useApi<CandlesResult>(`/api/candles?symbol=${symbol}&range=${range}`);
  const earnings = useApi<EarningsResult>(`/api/earnings?symbol=${symbol}`);

  const quoteData = quote.data && (quote.data as unknown as Record<string, QuoteResult | { error: string }>)[symbol];
  const liveQuote = quoteData && !("error" in quoteData) ? (quoteData as QuoteResult) : undefined;

  const chartRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = createChart(chartRef.current, {
      layout: { background: { color: "transparent" }, textColor: "#a9ada8", fontFamily: "DM Mono, monospace", fontSize: 10 },
      grid: { vertLines: { visible: false }, horzLines: { color: "#232b27" } },
      rightPriceScale: { borderColor: "#303a35" },
      timeScale: { borderColor: "#303a35" },
      crosshair: { mode: 0 },
      autoSize: true,
    });
    chartApiRef.current = chart;
    return () => {
      chart.remove();
      chartApiRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart || !candles.data?.points?.length) return;
    const up = liveQuote ? liveQuote.changePercent >= 0 : true;
    const color = up ? "#74c69d" : "#ff725e";
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
    }
    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: `${color}33`,
      bottomColor: `${color}00`,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    series.setData(candles.data.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    seriesRef.current = series;
    chart.timeScale().fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles.data]);

  const dir = liveQuote ? (liveQuote.changePercent >= 0 ? "up" : "down") : "";
  const name = profile.data?.name ?? symbol;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="stock-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="stock-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="stock-head">
          <div className="eyebrow">{profile.data?.industry || "Public market"}</div>
          <h2>{name}</h2>
          <div className="exch-line">
            {symbol} · {profile.data?.exchange || "—"}
            {quote.loading && <span className="live-badge">loading…</span>}
          </div>
        </div>

        {liveQuote ? (
          <>
            <div className="stock-price">{formatPrice(liveQuote.price, symbol)}</div>
            <div className={`stock-change ${dir}`}>
              {formatChangeAbs(liveQuote.change)} ({formatChangePercent(liveQuote.changePercent)}) today
            </div>
          </>
        ) : (
          <div className="unavailable-note">
            {quoteData && "error" in quoteData ? quoteData.error : "Live price unavailable."}
          </div>
        )}

        <div className="range-tabs">
          {RANGES.map((r) => (
            <button key={r} className={`range-tab ${r === range ? "active" : ""}`} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
        <div className="chart-box">
          <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
          {!candles.loading && (candles.error || !candles.data?.points?.length) && (
            <div className="chart-msg">{candles.error || "No chart data available for this range."}</div>
          )}
          {candles.loading && <div className="chart-msg">Loading chart…</div>}
        </div>

        <div className="stats-grid">
          <div className="stat-cell">
            <b>Previous close</b>
            <span>{liveQuote ? formatPrice(liveQuote.prevClose, symbol) : "—"}</span>
          </div>
          <div className="stat-cell">
            <b>Open</b>
            <span>{liveQuote ? formatPrice(liveQuote.open, symbol) : "—"}</span>
          </div>
          <div className="stat-cell">
            <b>Day&rsquo;s range</b>
            <span>{liveQuote ? `${formatPrice(liveQuote.low, symbol)} – ${formatPrice(liveQuote.high, symbol)}` : "—"}</span>
          </div>
          <div className="stat-cell">
            <b>As of</b>
            <span>{liveQuote ? formatTimestamp(liveQuote.timestamp) : "—"}</span>
          </div>
          <div className="stat-cell">
            <b>Market cap</b>
            <span>{profile.data ? formatMarketCap(profile.data.marketCapitalization) : "—"}</span>
          </div>
          <div className="stat-cell">
            <b>Industry</b>
            <span>{profile.data?.industry || "—"}</span>
          </div>
        </div>

        <div className="earnings-block">
          <h3>Earnings</h3>
          {earnings.error ? (
            <div className="unavailable-note">{earnings.error}</div>
          ) : (
            <>
              <div className="earn-row">
                <b>Previous report</b>
                {earnings.data?.previous ? (
                  <span>
                    {formatDate(earnings.data.previous.date)} — EPS{" "}
                    {earnings.data.previous.epsActual ?? "—"} actual vs {earnings.data.previous.epsEstimate ?? "—"} est.
                    {typeof earnings.data.previous.surprisePercent === "number" &&
                      ` (${earnings.data.previous.surprisePercent >= 0 ? "+" : ""}${earnings.data.previous.surprisePercent.toFixed(1)}% surprise)`}
                  </span>
                ) : (
                  <span>No recent report found.</span>
                )}
              </div>
              <div className="earn-row">
                <b>Next estimated report</b>
                {earnings.data?.next ? (
                  <span>{formatDate(earnings.data.next.date)}</span>
                ) : (
                  <span>No upcoming date on the calendar yet.</span>
                )}
              </div>
            </>
          )}
        </div>

        {profile.data?.weburl && (
          <a className="source" href={profile.data.weburl} target="_blank" rel="noopener noreferrer">
            Company site ↗
          </a>
        )}
      </div>
    </div>
  );
}
