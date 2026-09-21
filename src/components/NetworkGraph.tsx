"use client";

import { useMemo } from "react";
import { columns, edges, nodeById, nodes, type MapEdge } from "@/data/industry-map";
import { tickers } from "@/data/tickers";
import type { QuoteMap } from "@/hooks/useQuotes";
import type { EarningsMap } from "@/app/api/earnings/route";
import { earningsLabel, nextEarningsDate } from "@/hooks/useEarnings";
import { changeDirection } from "@/lib/format";
import { useTheme } from "@/hooks/useTheme";
import { EDGE_COLORS } from "@/lib/theme";

interface Position {
  x: number;
  y: number;
  w: number;
  h: number;
}

const COL_X = [8, 225, 442, 659, 876, 1093];
const CHART_H = 856;

function computePositions(): Record<string, Position> {
  const positions: Record<string, Position> = {};
  columns.forEach((col, ci) => {
    const gap = CHART_H / col.ids.length;
    col.ids.forEach((id, idx) => {
      positions[id] = { x: COL_X[ci], y: 34 + idx * gap, w: 198, h: 46 };
    });
  });
  return positions;
}

function edgePath(a: Position, b: Position): string {
  const dir = b.x >= a.x ? 1 : -1;
  const x1 = dir > 0 ? a.x + a.w : a.x;
  const x2 = dir > 0 ? b.x : b.x + b.w;
  const y1 = a.y + a.h / 2;
  const y2 = b.y + b.h / 2;
  const bend = Math.max(45, Math.abs(x2 - x1) * 0.44);
  return `M${x1},${y1} C${x1 + dir * bend},${y1} ${x2 - dir * bend},${y2} ${x2},${y2}`;
}

function primaryTicker(nodeId: string, quotes: QuoteMap) {
  const tks = tickers[nodeId];
  if (!tks || !tks.length) return null;
  const us = tks.find((t) => t.isUS);
  const symbol = us?.symbol ?? tks[0].symbol;
  const q = us ? quotes[us.symbol] : undefined;
  const pct = q && !("error" in q) ? q.changePercent : undefined;
  return { symbol, pct, usSymbol: us?.symbol };
}

function earningsForNode(nodeId: string, earnings: EarningsMap): string | null {
  const tks = tickers[nodeId];
  const us = tks?.find((t) => t.isUS);
  if (!us) return null;
  return earningsLabel(nextEarningsDate(earnings, () => us.symbol));
}

export default function NetworkGraph({
  selected,
  onSelect,
  search,
  quotes,
  earnings,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  search: string;
  quotes: QuoteMap;
  earnings: EarningsMap;
}) {
  const positions = useMemo(() => computePositions(), []);
  const [theme] = useTheme();
  const arrowColors = EDGE_COLORS[theme];

  const q = search.trim().toLowerCase();
  const matches = q
    ? new Set(
        nodes
          .filter((n) => (n.name + " " + n.layer + " " + n.sub + " " + n.desc + " " + n.fact).toLowerCase().includes(q))
          .map((n) => n.id)
      )
    : null;

  const connected = selected ? edges.filter((e) => e.from === selected || e.to === selected) : [];
  const connectedIds = new Set(connected.flatMap((e) => [e.from, e.to]));

  return (
    <svg id="network" viewBox="0 0 1320 900" role="img" aria-label="Network map of the AI industry value chain">
      {columns.map((col, ci) => (
        <text key={col.label} x={COL_X[ci]} y={18} className="layer-label">
          {col.label}
        </text>
      ))}
      <defs>
        {(Object.keys(arrowColors) as MapEdge["type"][]).map((type) => (
          <marker
            key={type}
            id={`arrow-${type}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={arrowColors[type]} />
          </marker>
        ))}
      </defs>
      <g>
        {edges.map((e) => {
          const a = positions[e.from];
          const b = positions[e.to];
          if (!a || !b) return null;
          const isActive = selected ? e.from === selected || e.to === selected : false;
          const isMuted = matches ? true : selected ? !isActive : false;
          const cls = ["edge", e.type, e.type === "money" ? "risky" : "", isActive ? "active" : "", isMuted && !isActive ? "muted" : ""]
            .filter(Boolean)
            .join(" ");
          return (
            <path key={e.id} d={edgePath(a, b)} className={cls} markerEnd={`url(#arrow-${e.type})`}>
              <title>{`${nodeById[e.from]?.name ?? ""} → ${nodeById[e.to]?.name ?? ""}: ${e.label}`}</title>
            </path>
          );
        })}
      </g>
      <g>
        {nodes.map((n) => {
          const pos = positions[n.id];
          if (!pos) return null;
          const isSelected = n.id === selected;
          const isMuted = matches ? !matches.has(n.id) : selected ? n.id !== selected && !connectedIds.has(n.id) : false;
          const tk = primaryTicker(n.id, quotes);
          const dir = tk ? changeDirection(tk.pct) : "";
          const earn = earningsForNode(n.id, earnings);
          return (
            <g
              key={n.id}
              className={["node", isSelected ? "active" : "", isMuted ? "muted" : ""].filter(Boolean).join(" ")}
              transform={`translate(${pos.x} ${pos.y})`}
              tabIndex={0}
              role="button"
              aria-label={n.name}
              onClick={() => onSelect(n.id)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  onSelect(n.id);
                }
              }}
            >
              <rect width={pos.w} height={pos.h} />
              <text x={11} y={18}>
                {n.name}
              </text>
              <text className="sub" x={11} y={34}>
                {n.sub}
              </text>
              {earn && (
                <text className="earnings" x={pos.w - 8} y={34} textAnchor="end">
                  {earn}
                </text>
              )}
              {tk && (
                <text className={`ticker ${dir}`} x={pos.w - 8} y={14} textAnchor="end">
                  {tk.symbol}
                  {typeof tk.pct === "number" ? ` ${tk.pct >= 0 ? "+" : ""}${tk.pct.toFixed(1)}%` : ""}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
