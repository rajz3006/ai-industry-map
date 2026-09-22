"use client";

import { useMemo } from "react";
import { useTheme } from "@/hooks/useTheme";
import { CATEGORY_COLORS, CATEGORY_COLOR_FALLBACK } from "@/lib/theme";
import { changeDirection, formatChangePercent } from "@/lib/format";
import type { TrendCategorySeries } from "@/app/api/movers/trend/route";

const W = 640;
const H = 180;
const PAD = 8;

export default function CategoryTrendChart({ series }: { series: TrendCategorySeries[] }) {
  const [theme] = useTheme();
  const colors = CATEGORY_COLORS[theme];
  const fallback = CATEGORY_COLOR_FALLBACK[theme];

  const { paths, zeroY } = useMemo(() => {
    const allTimes = series.flatMap((s) => s.points.map((p) => new Date(p.date + "T12:00:00Z").getTime()));
    const allVals = series.flatMap((s) => s.points.map((p) => p.avgChangePercent));
    const minT = Math.min(...allTimes);
    const maxT = Math.max(...allTimes);
    let minV = Math.min(0, ...allVals);
    let maxV = Math.max(0, ...allVals);
    if (minV === maxV) {
      minV -= 1;
      maxV += 1;
    }
    const xScale = (t: number) => (maxT === minT ? W / 2 : PAD + ((t - minT) / (maxT - minT)) * (W - PAD * 2));
    const yScale = (v: number) => H - PAD - ((v - minV) / (maxV - minV)) * (H - PAD * 2);

    const paths = series.map((s) => {
      const d = s.points
        .map((p, i) => {
          const x = xScale(new Date(p.date + "T12:00:00Z").getTime());
          const y = yScale(p.avgChangePercent);
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
      return { layer: s.layer, d, latest: s.latestChangePercent };
    });

    return { paths, zeroY: yScale(0) };
  }, [series]);

  if (paths.length === 0) return null;

  return (
    <div className="mv-trend-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mv-trend-svg" role="img" aria-label="Cumulative change by segment over the selected period">
        <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} className="mv-trend-zero" />
        {paths.map((p) => (
          <path key={p.layer} d={p.d} fill="none" stroke={colors[p.layer] ?? fallback} strokeWidth={2} />
        ))}
      </svg>
      <ul className="mv-trend-legend">
        {paths.map((p) => (
          <li key={p.layer}>
            <span className="mv-trend-swatch" style={{ background: colors[p.layer] ?? fallback }} aria-hidden="true" />
            <span className="mv-trend-layer">{p.layer}</span>
            <span className={`chg ${changeDirection(p.latest)}`}>{formatChangePercent(p.latest)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
