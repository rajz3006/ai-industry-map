"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AreaSeries, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import type { ProfileResult } from "@/app/api/profile/route";
import type { CandlesResult, Range } from "@/app/api/candles/route";
import type { EarningsResult } from "@/app/api/earnings/route";
import type { QuoteResult } from "@/app/api/quote/route";
import EarningsResearch from "@/components/EarningsResearch";
import { computeTechnicals, SIGNAL_COPY } from "@/lib/technicals";
import { formatChangeAbs, formatChangePercent, formatDate, formatMarketCap, formatPrice, formatTimestamp } from "@/lib/format";
import { useTheme } from "@/hooks/useTheme";
import { CHART_THEME } from "@/lib/theme";

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

export default function StockDetail({
  symbol,
  onClose,
  onSetAlert,
}: {
  symbol: string;
  onClose: () => void;
  onSetAlert?: (symbol: string) => void;
}) {
  const [range, setRange] = useState<Range>("1M");
  const [theme] = useTheme();
  const chartColors = CHART_THEME[theme];
  const quote = useApi<QuoteResult>(`/api/quote?symbols=${symbol}`);
  const profile = useApi<ProfileResult>(`/api/profile?symbol=${symbol}`);
  const candles = useApi<CandlesResult>(`/api/candles?symbol=${symbol}&range=${range}`);
  const earnings = useApi<EarningsResult>(`/api/earnings?symbol=${symbol}`);
  // Dedicated 1Y daily series for technical signals, independent of the chart range.
  const techCandles = useApi<CandlesResult>(`/api/candles?symbol=${symbol}&range=1Y`);
  const technicals = useMemo(
    () => (techCandles.data?.points?.length ? computeTechnicals(techCandles.data.points.map((p) => p.value)) : null),
    [techCandles.data]
  );

  const quoteData = quote.data && (quote.data as unknown as Record<string, QuoteResult | { error: string }>)[symbol];
  const liveQuote = quoteData && !("error" in quoteData) ? (quoteData as QuoteResult) : undefined;

  const chartRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = createChart(chartRef.current, {
      layout: { background: { color: "transparent" }, textColor: chartColors.text, fontFamily: "DM Mono, monospace", fontSize: 10 },
      grid: { vertLines: { visible: false }, horzLines: { color: chartColors.grid } },
      rightPriceScale: { borderColor: chartColors.border },
      timeScale: { borderColor: chartColors.border },
      crosshair: { mode: 0 },
      autoSize: true,
    });
    chartApiRef.current = chart;
    return () => {
      chart.remove();
      chartApiRef.current = null;
      seriesRef.current = null;
    };
    // Chart is created once per mount; theme/color changes are applied via
    // applyOptions below instead of tearing down and recreating the chart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // lightweight-charts takes its colors as JS config, not CSS, so theme
  // changes have to be pushed into the live chart instance explicitly.
  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart) return;
    chart.applyOptions({
      layout: { textColor: chartColors.text },
      grid: { horzLines: { color: chartColors.grid } },
      rightPriceScale: { borderColor: chartColors.border },
      timeScale: { borderColor: chartColors.border },
    });
  }, [chartColors]);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart || !candles.data?.points?.length) return;
    const up = liveQuote ? liveQuote.changePercent >= 0 : true;
    const color = up ? chartColors.up : chartColors.down;
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
  }, [candles.data, chartColors]);

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
        {onSetAlert && (
          <button className="alert-add secondary stock-alert-btn" onClick={() => onSetAlert(symbol)}>
            🔔 Set price alert
          </button>
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
              {earnings.data?.next && earnings.data.next.date <= "2026-12-31" && (
                <EarningsResearch symbol={symbol} nextDate={earnings.data.next.date} />
              )}
            </>
          )}
        </div>

        {profile.data?.weburl && (
          <a className="source" href={profile.data.weburl} target="_blank" rel="noopener noreferrer">
            Company site ↗
          </a>
        )}

        <div className="tech-block">
          <h3>Technical signals</h3>
          {techCandles.loading && !technicals ? (
            <div className="unavailable-note">Computing signals…</div>
          ) : technicals?.unavailable ? (
            <div className="unavailable-note">{technicals.unavailable}</div>
          ) : technicals ? (
            <>
              <div className={`tech-overall ${technicals.overall}`}>
                <b>{SIGNAL_COPY[technicals.overall].label}</b>
                <span>{SIGNAL_COPY[technicals.overall].blurb}</span>
              </div>
              <div className="tech-rows">
                {technicals.indicators.map((ind) => (
                  <div className="tech-row" key={ind.name}>
                    <span className="tech-name">{ind.name}</span>
                    <span className="tech-value">{ind.value}</span>
                    <span className={`tech-chip ${ind.signal}`}>{ind.signal}</span>
                    <span className="tech-detail">{ind.detail}</span>
                  </div>
                ))}
              </div>
              <p className="tech-disclaimer">
                Rules-based read of the last {technicals.pointsUsed} daily sessions (SMA trend, RSI-14, MACD).
                Signals are backward-looking, can conflict with fundamentals, and are <b>not financial advice</b> —
                not a buy or sell recommendation.
              </p>
            </>
          ) : (
            <div className="unavailable-note">
              {techCandles.error || "Signal data unavailable for this symbol."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
