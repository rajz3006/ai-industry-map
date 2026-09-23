"use client";

import { useMemo, useState } from "react";
import { useOpportunities } from "@/hooks/useOpportunities";
import type { OpportunityRow } from "@/app/api/opportunities/route";
import type { NewsResult } from "@/app/api/news/route";
import { changeDirection, formatChangePercent, formatPrice, isForeignDenominated } from "@/lib/format";

type SortKey = "zScore" | "changePercent" | "edgeCount" | "upsidePct";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "zScore", label: "Z-score" },
  { value: "changePercent", label: "Raw % change" },
  { value: "edgeCount", label: "Edge count" },
  { value: "upsidePct", label: "Analyst upside" },
];

function fmtZScore(z: number | null): string {
  if (z === null || Number.isNaN(z)) return "—";
  return `${z >= 0 ? "+" : ""}${z.toFixed(2)}σ`;
}

function zTone(z: number | null): "up" | "down" | "" {
  if (z === null) return "";
  return z >= 0 ? "up" : "down";
}

export default function OpportunitiesScreener({
  onSelectNode,
  onOpenStock,
}: {
  onSelectNode: (id: string) => void;
  onOpenStock: (symbol: string) => void;
}) {
  const { data, loading, error } = useOpportunities();
  const [minAbsZ, setMinAbsZ] = useState(1);
  const [minEdges, setMinEdges] = useState(0);
  const [excludeIncomplete, setExcludeIncomplete] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("zScore");

  const [newsFor, setNewsFor] = useState<string | null>(null);
  const [newsCache, setNewsCache] = useState<Record<string, NewsResult | "loading" | "error">>({});

  const [calcSymbol, setCalcSymbol] = useState<string | null>(null);
  const [capital, setCapital] = useState(5000);
  const [maxRiskPct, setMaxRiskPct] = useState(1);

  async function toggleNews(symbol: string) {
    if (newsFor === symbol) {
      setNewsFor(null);
      return;
    }
    setNewsFor(symbol);
    if (newsCache[symbol]) return;
    setNewsCache((prev) => ({ ...prev, [symbol]: "loading" }));
    try {
      const res = await fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`);
      const body = await res.json();
      setNewsCache((prev) => ({ ...prev, [symbol]: body?.error ? "error" : (body as NewsResult) }));
    } catch {
      setNewsCache((prev) => ({ ...prev, [symbol]: "error" }));
    }
  }

  const filteredSorted = useMemo(() => {
    if (!data) return [];
    let rows = data.rows.filter((r) => {
      if (excludeIncomplete && (isForeignDenominated(r.symbol) || r.zScore === null)) return false;
      if (r.edgeCount < minEdges) return false;
      const absZ = r.zScore === null ? 0 : Math.abs(r.zScore);
      if (absZ < minAbsZ) return false;
      return true;
    });
    rows = rows.slice().sort((a, b) => {
      const val = (r: OpportunityRow): number => {
        if (sortKey === "zScore") return r.zScore === null ? -Infinity : Math.abs(r.zScore);
        if (sortKey === "changePercent") return Math.abs(r.changePercent);
        if (sortKey === "edgeCount") return r.edgeCount;
        return r.upsidePct === null ? -Infinity : r.upsidePct;
      };
      return val(b) - val(a);
    });
    return rows;
  }, [data, minAbsZ, minEdges, excludeIncomplete, sortKey]);

  const calcRow = calcSymbol ? data?.rows.find((r) => r.symbol === calcSymbol) ?? null : null;
  const calc = useMemo(() => {
    if (!calcRow || calcRow.trailingStdDevPct === null || calcRow.trailingStdDevPct === 0) return null;
    const dollarRiskPerShare = calcRow.price * (calcRow.trailingStdDevPct / 100);
    if (dollarRiskPerShare <= 0) return null;
    const dollarRiskBudget = capital * (maxRiskPct / 100);
    const shares = Math.floor(dollarRiskBudget / dollarRiskPerShare);
    const positionValue = shares * calcRow.price;
    return { dollarRiskPerShare, dollarRiskBudget, shares, positionValue };
  }, [calcRow, capital, maxRiskPct]);

  return (
    <div className="op-wrap">
      <div className="op-head">
        <div>
          <h2>Opportunities — dip screener</h2>
          <p className="op-disclaimer">
            This is a triage tool that narrows a reading list, not a signal generator. It ranks moves by how
            unusual they are for <b>that stock&rsquo;s own</b> normal volatility, not by raw percent change — but a
            big drop is just as often a value trap as an opportunity. Nothing here is investment advice; read the
            headlines before acting on a number.
          </p>
        </div>
      </div>

      {error && <p className="op-error">Couldn&rsquo;t load the screener: {error}</p>}
      {loading && !data && <p className="op-loading">Scoring today&rsquo;s session against trailing volatility…</p>}

      {data && (
        <>
          <p className="op-session">
            As of {data.asOfDate}
            {!data.priceTargetsAvailable && (
              <span className="op-pt-note"> · analyst price targets unavailable on this plan</span>
            )}
          </p>

          <div className="op-filters">
            <label className="op-filter">
              <span>Min |z-score|</span>
              <input
                type="number"
                min={0}
                max={10}
                step={0.25}
                value={minAbsZ}
                onChange={(e) => setMinAbsZ(Number(e.target.value) || 0)}
              />
            </label>
            <label className="op-filter">
              <span>Min edge count</span>
              <input
                type="number"
                min={0}
                max={30}
                step={1}
                value={minEdges}
                onChange={(e) => setMinEdges(Number(e.target.value) || 0)}
              />
            </label>
            <label className="op-filter op-filter-toggle">
              <input
                type="checkbox"
                checked={excludeIncomplete}
                onChange={(e) => setExcludeIncomplete(e.target.checked)}
              />
              <span>Exclude foreign / incomplete-data names</span>
            </label>
            <label className="op-filter">
              <span>Sort by</span>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="op-calc">
            <h3>Position-sizing calculator</h3>
            <p className="op-calc-note">
              Arithmetic only, not a recommendation — sizes a position off the focused stock&rsquo;s{" "}
              <b>own</b> trailing volatility, so the same risk budget buys fewer shares of a choppier name.
            </p>
            <div className="op-calc-inputs">
              <label className="op-filter">
                <span>Focused stock</span>
                <select value={calcSymbol ?? ""} onChange={(e) => setCalcSymbol(e.target.value || null)}>
                  <option value="">Select a row…</option>
                  {filteredSorted.map((r) => (
                    <option key={r.symbol} value={r.symbol}>
                      {r.symbol} — {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="op-filter">
                <span>Capital ($)</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value) || 0)}
                />
              </label>
              <label className="op-filter">
                <span>Max risk per position (%)</span>
                <input
                  type="number"
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={maxRiskPct}
                  onChange={(e) => setMaxRiskPct(Number(e.target.value) || 0)}
                />
              </label>
            </div>
            {!calcRow && <p className="op-empty">Pick a row above to size a position against its own volatility.</p>}
            {calcRow && !calc && (
              <p className="op-empty">Not enough trailing history for {calcRow.symbol} to size a position.</p>
            )}
            {calcRow && calc && (
              <div className="op-calc-result">
                <span>
                  Risk unit: <b>{formatPrice(calc.dollarRiskPerShare, calcRow.symbol)}</b>/share (
                  {calcRow.trailingStdDevPct?.toFixed(2)}% trailing daily vol)
                </span>
                <span>
                  Risk budget: <b>${calc.dollarRiskBudget.toFixed(2)}</b>
                </span>
                <span>
                  Suggested size: <b>{calc.shares.toLocaleString()} sh</b> (
                  {formatPrice(calc.positionValue, calcRow.symbol)})
                </span>
              </div>
            )}
          </div>

          <ul className="op-list">
            {filteredSorted.length === 0 && <p className="op-empty">No names clear these filters right now.</p>}
            {filteredSorted.map((r) => {
              const news = newsCache[r.symbol];
              return (
                <li key={r.symbol} className="op-row">
                  <div className="op-row-top">
                    <button className="mv-row-name" onClick={() => onSelectNode(r.nodeId)} title="Open in dependency graph">
                      <span className="mv-row-co">{r.name}</span>
                      <span className="mv-row-layer">{r.layer}</span>
                    </button>
                    <button className="mv-row-price" onClick={() => onOpenStock(r.symbol)} title="Open stock detail">
                      <span className="mv-row-symbol">{r.symbol}</span>
                      <span className="mv-row-amt">{formatPrice(r.price, r.symbol)}</span>
                      <span className={`chg ${changeDirection(r.changePercent)}`}>
                        {formatChangePercent(r.changePercent)}
                      </span>
                    </button>
                  </div>
                  <div className="op-row-meta">
                    <span className={`op-zscore ${zTone(r.zScore)}`}>{fmtZScore(r.zScore)}</span>
                    <span className="op-edges">{r.edgeCount} edge{r.edgeCount === 1 ? "" : "s"}</span>
                    {r.upsidePct !== null && (
                      <span className={`op-upside ${changeDirection(r.upsidePct)}`}>
                        Analyst upside {formatChangePercent(r.upsidePct)}
                      </span>
                    )}
                    <button className="op-size-btn" onClick={() => setCalcSymbol(r.symbol)}>
                      Size this
                    </button>
                    <button className="mv-news-toggle" onClick={() => toggleNews(r.symbol)}>
                      {newsFor === r.symbol ? "Hide headlines" : "Top headlines"}
                    </button>
                  </div>
                  {newsFor === r.symbol && (
                    <div className="mv-news-list">
                      {news === "loading" && <p className="mv-empty">Loading headlines…</p>}
                      {news === "error" && <p className="mv-empty">Couldn&rsquo;t load headlines for {r.symbol}.</p>}
                      {news && news !== "loading" && news !== "error" && (
                        news.articles.length === 0 ? (
                          <p className="mv-empty">No recent headlines found.</p>
                        ) : (
                          <ul>
                            {news.articles.slice(0, 3).map((a) => (
                              <li key={a.url}>
                                <a href={a.url} target="_blank" rel="noopener noreferrer">
                                  {a.headline}
                                </a>
                                <span className="mv-news-source"> — {a.source}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
