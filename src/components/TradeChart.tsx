"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AreaSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
} from "lightweight-charts";
import type { CandlesResult } from "@/app/api/candles/route";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { CHART_THEME } from "@/lib/theme";

const RANGE = "3M"; // enough trailing context to see the stop/target against recent price action
const BAND_PADDING_PCT = 0.03; // keep configured levels off the very edge of the chart

export interface TradeChartLevels {
  entry: number;
  stop: number;
  target: number;
  /** +20% informational ceiling — optional, shown dimmer than the real take-profit. */
  ceiling?: number | null;
}

/** Price chart for the selected Trade Desk candidate, with the configured entry/stop/target
 * drawn as reference lines and the risk zone (entry→stop) and reward zone (entry→target)
 * shaded, so a risk%/equity/target change is visible against real recent price action
 * instead of just as numbers in a table. Lines and shading update live as the inputs change —
 * no refetch, since only the overlay (not the underlying price series) depends on them. */
export default function TradeChart({ symbol, levels }: { symbol: string; levels: TradeChartLevels }) {
  const [theme] = useTheme();
  const chartColors = CHART_THEME[theme];
  const candles = useApi<CandlesResult>(`/api/candles?symbol=${symbol}&range=${RANGE}`);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const riskBandRef = useRef<HTMLDivElement>(null);
  const rewardBandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
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
      priceLinesRef.current = [];
    };
    // Chart is created once per mount; theme changes are applied via applyOptions below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Extends whatever the series would normally autoscale to so entry/stop/target are always
  // within the visible range, even if they sit outside the trailing 3M price history (e.g. a
  // stop well below any recent low). Padding keeps a configured level off the very edge.
  const autoscaleInfoProvider = useMemo(() => {
    return (original: () => { priceRange: { minValue: number; maxValue: number } } | null) => {
      const base = original();
      const values = [levels.entry, levels.stop, levels.target, levels.ceiling ?? levels.target];
      let min = Math.min(...values);
      let max = Math.max(...values);
      if (base?.priceRange) {
        min = Math.min(min, base.priceRange.minValue);
        max = Math.max(max, base.priceRange.maxValue);
      }
      const pad = (max - min) * BAND_PADDING_PCT || max * BAND_PADDING_PCT || 1;
      return { priceRange: { minValue: min - pad, maxValue: max + pad } };
    };
  }, [levels.entry, levels.stop, levels.target, levels.ceiling]);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart || !candles.data?.points?.length) return;
    if (seriesRef.current) chart.removeSeries(seriesRef.current);
    const series = chart.addSeries(AreaSeries, {
      lineColor: chartColors.text,
      topColor: `${chartColors.text}22`,
      bottomColor: `${chartColors.text}00`,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      autoscaleInfoProvider,
    });
    series.setData(candles.data.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    seriesRef.current = series;
    chart.timeScale().fitContent();
  }, [candles.data, chartColors, autoscaleInfoProvider]);

  // Entry/stop/target reference lines — redrawn whenever the series or the levels change.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    for (const line of priceLinesRef.current) series.removePriceLine(line);
    priceLinesRef.current = [
      series.createPriceLine({
        price: levels.entry,
        color: chartColors.text,
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "Entry",
      }),
      series.createPriceLine({
        price: levels.stop,
        color: chartColors.down,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "Stop",
      }),
      series.createPriceLine({
        price: levels.target,
        color: chartColors.up,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "Target",
      }),
      ...(levels.ceiling
        ? [
            series.createPriceLine({
              price: levels.ceiling,
              color: `${chartColors.up}88`,
              lineWidth: 1,
              lineStyle: 3,
              axisLabelVisible: true,
              title: "Ceiling",
            }),
          ]
        : []),
    ];
  }, [candles.data, levels.entry, levels.stop, levels.target, levels.ceiling, chartColors]);

  // Shaded risk/reward zones: plain positioned <div>s over the chart (lightweight-charts has
  // no native fill-between-two-arbitrary-levels primitive), repositioned from
  // series.priceToCoordinate() whenever the price scale could have moved — on data/level
  // changes and on pan/zoom (autoscale can shift the visible range while panning).
  useEffect(() => {
    const chart = chartApiRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    function clamp(y: number | null, height: number): number {
      if (y === null || Number.isNaN(y)) return height / 2;
      return Math.max(0, Math.min(height, y));
    }

    function reposition() {
      if (!series || !containerRef.current) return;
      const height = containerRef.current.clientHeight;
      const entryY = clamp(series.priceToCoordinate(levels.entry), height);
      const stopY = clamp(series.priceToCoordinate(levels.stop), height);
      const targetY = clamp(series.priceToCoordinate(levels.target), height);

      if (riskBandRef.current) {
        const top = Math.min(entryY, stopY);
        const bottom = Math.max(entryY, stopY);
        riskBandRef.current.style.top = `${top}px`;
        riskBandRef.current.style.height = `${bottom - top}px`;
      }
      if (rewardBandRef.current) {
        const top = Math.min(entryY, targetY);
        const bottom = Math.max(entryY, targetY);
        rewardBandRef.current.style.top = `${top}px`;
        rewardBandRef.current.style.height = `${bottom - top}px`;
      }
    }

    reposition();
    chart.timeScale().subscribeVisibleLogicalRangeChange(reposition);
    const ro = new ResizeObserver(reposition);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(reposition);
      ro.disconnect();
    };
  }, [candles.data, levels.entry, levels.stop, levels.target, chartColors]);

  return (
    <div className="tc-wrap">
      <div className="tc-chart-box" ref={containerRef}>
        <div ref={riskBandRef} className="tc-band tc-band-risk" />
        <div ref={rewardBandRef} className="tc-band tc-band-reward" />
        {candles.loading && !candles.data?.points?.length && <div className="tc-msg">Loading chart…</div>}
        {!candles.loading && (candles.error || !candles.data?.points?.length) && (
          <div className="tc-msg">{candles.error || "No chart data available."}</div>
        )}
      </div>
      <p className="tc-legend">
        <span className="tc-legend-item tc-legend-risk">Risk zone (entry → stop)</span>
        <span className="tc-legend-item tc-legend-reward">Reward zone (entry → target)</span>
      </p>
    </div>
  );
}
