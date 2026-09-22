"use client";

import { useState } from "react";
import { useMoversSignals } from "@/hooks/useMoversSignals";
import { nextEarningsDate } from "@/hooks/useEarnings";
import type { EarningsMap } from "@/app/api/earnings/route";
import type { NewsResult } from "@/app/api/news/route";
import { changeDirection, formatChangePercent } from "@/lib/format";

function fmtShortDate(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function momentumLabel(thisWeek: number, lastWeek: number): { text: string; tone: "up" | "down" | "" } {
  const delta = thisWeek - lastWeek;
  const reversed = Math.sign(thisWeek) !== 0 && Math.sign(lastWeek) !== 0 && Math.sign(thisWeek) !== Math.sign(lastWeek);
  if (reversed) return { text: thisWeek > 0 ? "Reversing up" : "Reversing down", tone: thisWeek > 0 ? "up" : "down" };
  if (thisWeek > 0 && delta > 0.5) return { text: "Accelerating up", tone: "up" };
  if (thisWeek > 0 && delta < -0.5) return { text: "Losing steam", tone: "" };
  if (thisWeek < 0 && delta < -0.5) return { text: "Accelerating down", tone: "down" };
  if (thisWeek < 0 && delta > 0.5) return { text: "Stabilizing", tone: "" };
  return { text: "Steady", tone: "" };
}

interface WeeklyRow {
  symbol: string;
  nodeId: string;
  name: string;
  layer: string;
  changePercent: number;
}

export default function SignalsPanel({
  earnings,
  onSelectNode,
  onOpenStock,
}: {
  earnings: EarningsMap;
  onSelectNode: (id: string) => void;
  onOpenStock: (symbol: string) => void;
}) {
  const { data, loading, error } = useMoversSignals();
  const [newsFor, setNewsFor] = useState<string | null>(null);
  const [newsCache, setNewsCache] = useState<Record<string, NewsResult | "loading" | "error">>({});

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

  const combined: WeeklyRow[] = data ? [...data.weeklyLeaders, ...data.weeklyLaggards] : [];

  return (
    <section className="mv-signals-section">
      <div className="mv-trend-head">
        <h3>Signals — what to watch</h3>
      </div>
      <p className="mv-signals-note">
        Momentum shifts, scheduled catalysts and recent headlines drawn from this week&rsquo;s data — patterns to
        watch, not predictions or investment advice.
      </p>

      {error && <p className="mv-error">Couldn&rsquo;t load signals: {error}</p>}
      {loading && !data && <p className="mv-loading">Reading this week&rsquo;s sessions…</p>}

      {data && (
        <>
          <p className="mv-session">
            This week ({fmtShortDate(data.thisWeek.start)}–{fmtShortDate(data.thisWeek.end)}) vs. last week (
            {fmtShortDate(data.lastWeek.start)}–{fmtShortDate(data.lastWeek.end)})
          </p>

          <p className="mv-trend-subhead">Segment momentum</p>
          <ul className="mv-momentum-list">
            {data.categoryMomentum.map((c) => {
              const m = momentumLabel(c.thisWeekPct, c.lastWeekPct);
              return (
                <li key={c.layer} className="mv-momentum-row">
                  <span className="mv-cat-name">{c.layer}</span>
                  <span className={`mv-momentum-tag ${m.tone}`}>{m.text}</span>
                  <span className={`chg ${changeDirection(c.thisWeekPct)}`}>{formatChangePercent(c.thisWeekPct)}</span>
                  <span className="mv-momentum-prior">(prior wk {formatChangePercent(c.lastWeekPct)})</span>
                </li>
              );
            })}
          </ul>

          <p className="mv-trend-subhead">Names driving this week&rsquo;s moves</p>
          <ul className="mv-signal-list">
            {combined.map((r) => {
              const earningsDate = nextEarningsDate(earnings, () => r.symbol);
              const news = newsCache[r.symbol];
              return (
                <li key={r.symbol} className="mv-signal-row">
                  <div className="mv-signal-top">
                    <button className="mv-row-name" onClick={() => onSelectNode(r.nodeId)} title="Open in dependency graph">
                      <span className="mv-row-co">{r.name}</span>
                      <span className="mv-row-layer">{r.layer}</span>
                    </button>
                    <button className="mv-row-price" onClick={() => onOpenStock(r.symbol)} title="Open stock detail">
                      <span className="mv-row-symbol">{r.symbol}</span>
                      <span className={`chg ${changeDirection(r.changePercent)}`}>{formatChangePercent(r.changePercent)}</span>
                    </button>
                  </div>
                  <div className="mv-signal-meta">
                    {earningsDate && <span className="mv-earnings-badge">Next earnings {fmtShortDate(earningsDate)}</span>}
                    <button className="mv-news-toggle" onClick={() => toggleNews(r.symbol)}>
                      {newsFor === r.symbol ? "Hide news" : "Why it moved"}
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
    </section>
  );
}
