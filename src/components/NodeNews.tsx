"use client";

import { useEffect } from "react";
import { useCompanyNews } from "@/hooks/useCompanyNews";

const REFRESH_MS = 30 * 60 * 1000;

function timeAgo(unixSeconds: number): string {
  if (!unixSeconds) return "";
  const mins = Math.max(0, Math.floor((Date.now() / 1000 - unixSeconds) / 60));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Self-refreshing per-node news feed. Shares its fetch and cache with every other
 * component reading the same symbol's news via useCompanyNews, and polls (refresh())
 * every 30 minutes while mounted; shows provider attribution and the last-refresh time
 * so staleness is explicit.
 */
export default function NodeNews({ symbol, companyName }: { symbol: string | null; companyName: string }) {
  const { data, loading, error, refresh } = useCompanyNews(symbol);
  const articles = data?.articles ?? [];
  const fetchedAt = data?.fetchedAt ?? null;

  useEffect(() => {
    if (!symbol) return;
    const interval = setInterval(() => refresh(), REFRESH_MS);
    return () => clearInterval(interval);
  }, [symbol, refresh]);

  return (
    <div className="news-block">
      <div className="news-head">
        <h3>Latest news</h3>
        <div className="news-head-actions">
          {fetchedAt && (
            <span className="news-updated" title={new Date(fetchedAt * 1000).toLocaleString()}>
              Updated {timeAgo(fetchedAt)} · auto-refreshes every 30 min
            </span>
          )}
          {symbol && (
            <button
              type="button"
              className="news-refresh"
              onClick={() => refresh()}
              disabled={loading}
              aria-label="Refresh news now"
              title="Refresh news now"
            >
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
          )}
        </div>
      </div>
      {!symbol ? (
        <p className="unavailable-note">{companyName} has no public US ticker, so no provider news feed is available.</p>
      ) : loading && articles.length === 0 ? (
        <p className="unavailable-note">Loading headlines…</p>
      ) : error && articles.length === 0 ? (
        <p className="unavailable-note">{error}</p>
      ) : articles.length === 0 ? (
        <p className="unavailable-note">No recent headlines found for this ticker.</p>
      ) : (
        <ul className="news-list">
          {articles.map((a) => (
            <li key={a.url} className="news-item">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="news-headline">
                {a.headline}
              </a>
              <div className="news-meta">
                <span className="news-source">{a.source}</span>
                {a.datetime > 0 && <span> · {timeAgo(a.datetime)}</span>}
              </div>
              {a.summary && <p className="news-summary">{a.summary}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="news-attrib">Headlines via Finnhub company news. Links open the publisher&apos;s site.</p>
    </div>
  );
}
