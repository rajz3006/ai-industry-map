"use client";

import { useEffect, useState } from "react";
import type { NewsArticle, NewsResult } from "@/app/api/news/route";

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
 * Self-refreshing per-node news feed. Polls /api/news every 30 minutes while mounted;
 * shows provider attribution and the last-refresh time so staleness is explicit.
 */
export default function NodeNews({ symbol, companyName }: { symbol: string | null; companyName: string }) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    const sym: string = symbol;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/news?symbol=${encodeURIComponent(sym)}`);
        const json = (await res.json()) as NewsResult & { error?: string };
        if (cancelled) return;
        if (!res.ok || json.error) {
          setError(json.error || `News request failed (${res.status})`);
          setArticles([]);
        } else {
          setArticles(json.articles ?? []);
          setFetchedAt(json.fetchedAt ?? null);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "News feed unreachable");
          setArticles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbol]);

  return (
    <div className="news-block">
      <div className="news-head">
        <h3>Latest news</h3>
        {fetchedAt && (
          <span className="news-updated" title={new Date(fetchedAt * 1000).toLocaleString()}>
            Updated {timeAgo(fetchedAt)} · auto-refreshes every 30 min
          </span>
        )}
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
