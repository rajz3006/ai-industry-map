"use client";

import { useMemo } from "react";
import { nodeById } from "@/data/industry-map";
import { allTickerRows } from "@/data/tickers";
import { useMovers } from "@/hooks/useMovers";
import { useFilings } from "@/hooks/useFilings";
import type { EarningsMap } from "@/app/api/earnings/route";
import { changeDirection, formatChangePercent, formatDate } from "@/lib/format";

// A layer averaging less than this is normal day-to-day noise, not "today's theme" —
// mirrors the same threshold /api/movers/news uses to decide whether to call out a theme.
const MIN_THEME_AVG_PCT = 1;
const MIN_THEME_COUNT = 2;
const UPCOMING_EARNINGS_DAYS = 10;
const FILINGS_LOOKBACK_DAYS = 10;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export default function CatalystRadar({
  earnings,
  onSelectNode,
  onOpenStock,
}: {
  earnings: EarningsMap;
  onSelectNode: (id: string) => void;
  onOpenStock: (symbol: string) => void;
}) {
  const { data: moversData, loading: moversLoading, error: moversError } = useMovers(null);
  const { data: filingsData, loading: filingsLoading, error: filingsError } = useFilings(FILINGS_LOOKBACK_DAYS);

  // Peer/theme watch: the day's hottest and coldest layer, each with its member symbols —
  // not just the one name that led the move. The logic behind this: once one name in a
  // thematic bucket moves on real news (a hyperscaler-nuclear PPA, a competitor capacity
  // scare), the rest of the bucket is probabilistically "in play" for the same story, days
  // before any one of them individually makes headlines.
  const themeClusters = useMemo(() => {
    if (!moversData) return [];
    const seen = new Set<string>();
    const bySymbol = moversData.movers.filter((m) => {
      if (seen.has(m.symbol)) return false;
      seen.add(m.symbol);
      return true;
    });
    const byLayer = new Map<string, typeof bySymbol>();
    for (const m of bySymbol) {
      const arr = byLayer.get(m.layer) ?? [];
      arr.push(m);
      byLayer.set(m.layer, arr);
    }

    const candidates = moversData.categoryTrends.filter(
      (t) => Math.abs(t.avgChangePercent) >= MIN_THEME_AVG_PCT && t.count >= MIN_THEME_COUNT
    );
    const top = candidates[0];
    const bottom = candidates[candidates.length - 1];
    const picked = [top, bottom].filter((t, i, arr): t is NonNullable<typeof t> => !!t && arr.indexOf(t) === i);

    return picked.map((trend) => {
      const members = (byLayer.get(trend.layer) ?? []).slice().sort((a, b) => b.changePercent - a.changePercent);
      const anchor = trend.avgChangePercent >= 0 ? members[0] : members[members.length - 1];
      const peers = members.filter((m) => m.symbol !== anchor?.symbol);
      return { layer: trend.layer, avgChangePercent: trend.avgChangePercent, anchor, peers };
    });
  }, [moversData]);

  const upcomingEarnings = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const cutoffKey = addDays(new Date(), UPCOMING_EARNINGS_DAYS).toISOString().slice(0, 10);
    const rows: { symbol: string; nodeId: string; name: string; layer: string; date: string }[] = [];
    const seen = new Set<string>();
    for (const row of allTickerRows) {
      if (!row.isUS || seen.has(row.symbol)) continue;
      const e = earnings[row.symbol];
      if (!e || "error" in e || !e.next?.date) continue;
      if (e.next.date < todayKey || e.next.date > cutoffKey) continue;
      seen.add(row.symbol);
      const n = nodeById[row.nodeId];
      rows.push({ symbol: row.symbol, nodeId: row.nodeId, name: n?.name ?? row.nodeId, layer: n?.layer ?? "Other", date: e.next.date });
    }
    return rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [earnings]);

  return (
    <div className="cr-wrap">
      <h2>Catalyst Radar</h2>
      <p className="cr-intro">
        The other tabs explain what already happened. This one is forward-looking: same-theme
        peers to watch when one name moves on news, known events in the next {UPCOMING_EARNINGS_DAYS} days,
        and fresh insider open-market buys / material-event (8-K) filings — all free, public data,
        no paid feed required.
      </p>

      <section className="cr-section">
        <h3>Theme watch — today&rsquo;s hottest/coldest bucket</h3>
        <p className="cr-section-note">
          When a theme moves this much on one name, the rest of its bucket is worth a look for
          follow-through — sector-wide capacity/demand stories rarely stay contained to a single ticker.
        </p>
        {moversError && <p className="cr-error">Couldn&rsquo;t load today&rsquo;s movers: {moversError}</p>}
        {moversLoading && !moversData && <p className="cr-loading">Loading today&rsquo;s session…</p>}
        {moversData && themeClusters.length === 0 && (
          <p className="cr-empty">No theme moved more than {MIN_THEME_AVG_PCT}% on average today — a quiet, stock-specific session.</p>
        )}
        {themeClusters.map((cluster) => (
          <div className="cr-cluster" key={cluster.layer}>
            <div className="cr-cluster-head">
              <span className={`cr-theme-tag ${changeDirection(cluster.avgChangePercent)}`}>{cluster.layer}</span>
              <span className={`chg ${changeDirection(cluster.avgChangePercent)}`}>
                {formatChangePercent(cluster.avgChangePercent)} avg
              </span>
            </div>
            {cluster.anchor && (
              <button className="cr-anchor" onClick={() => onOpenStock(cluster.anchor!.symbol)} title="Open stock detail">
                {cluster.anchor.name} ({cluster.anchor.symbol}){" "}
                <span className={`chg ${changeDirection(cluster.anchor.changePercent)}`}>
                  {formatChangePercent(cluster.anchor.changePercent)}
                </span>
                <span className="cr-anchor-label">led the move</span>
              </button>
            )}
            {cluster.peers.length > 0 ? (
              <div className="cr-peers">
                {cluster.peers.map((p) => (
                  <button key={p.symbol} className="cr-peer-chip" onClick={() => onOpenStock(p.symbol)} title="Open stock detail">
                    {p.symbol} <span className={changeDirection(p.changePercent)}>{formatChangePercent(p.changePercent)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="cr-empty">No other tracked name shares this theme today.</p>
            )}
          </div>
        ))}
      </section>

      <section className="cr-section">
        <h3>Known events — next {UPCOMING_EARNINGS_DAYS} days</h3>
        <p className="cr-section-note">
          Earnings dates are the one catalyst you always see coming. Full history/trend lives in
          the Earnings calendar tab — this is just the near-term slice.
        </p>
        {upcomingEarnings.length === 0 ? (
          <p className="cr-empty">No tracked symbol reports within {UPCOMING_EARNINGS_DAYS} days.</p>
        ) : (
          <ul className="cr-list">
            {upcomingEarnings.map((e) => (
              <li key={e.symbol} className="cr-row">
                <button className="cr-row-name" onClick={() => onSelectNode(e.nodeId)} title="Open in dependency graph">
                  {e.name} <span className="cr-row-symbol">{e.symbol}</span>
                </button>
                <span className="cr-row-meta">
                  <span className="cr-row-layer">{e.layer}</span>
                  <button className="cr-row-date" onClick={() => onOpenStock(e.symbol)}>
                    {formatDate(e.date)}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cr-section">
        <h3>Filings radar — insider buys &amp; material events (last {FILINGS_LOOKBACK_DAYS} days)</h3>
        <p className="cr-section-note">
          Straight from SEC EDGAR, no paid data: open-market insider purchases (routine
          awards/withholding/option-exercise filings are filtered out) and 8-Ks, which by
          definition disclose a material event — often the paper trail behind a move before
          the press picks it up.
        </p>
        {filingsError && <p className="cr-error">Couldn&rsquo;t load filings: {filingsError}</p>}
        {filingsLoading && !filingsData && <p className="cr-loading">Reading SEC EDGAR…</p>}
        {filingsData && filingsData.filings.length === 0 && (
          <p className="cr-empty">No qualifying 8-K or insider-buy filings in the last {FILINGS_LOOKBACK_DAYS} days.</p>
        )}
        {filingsData && filingsData.filings.length > 0 && (
          <ul className="cr-list">
            {filingsData.filings.map((f) => (
              <li key={f.url} className="cr-row">
                <button className="cr-row-name" onClick={() => onOpenStock(f.symbol)} title="Open stock detail">
                  {f.companyName} <span className="cr-row-symbol">{f.symbol}</span>
                </button>
                <span className="cr-row-meta">
                  <span className={`cr-filing-tag ${f.form === "4" ? "buy" : ""}`}>
                    {f.form === "4" ? "Insider buy" : "8-K"}
                    {f.items ? ` · ${f.items}` : ""}
                  </span>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="cr-row-date">
                    {formatDate(f.filingDate)}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
