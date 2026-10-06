"use client";

import { useMoversNews } from "@/hooks/useMoversNews";
import { formatChangePercent, formatTimestamp } from "@/lib/format";
import type { NewsArticle } from "@/app/api/news/route";

export default function MoversNewsPanel({ date }: { date: string | null }) {
  const { data, loading, error } = useMoversNews(date);

  return (
    <aside className="mv-digest" aria-label="News digest for today's movers and losers">
      <h3>Why today moved</h3>
      <p className="mv-digest-note">
        Trusted finance outlets only — Reuters, Bloomberg, CNBC, and Yahoo Finance&rsquo;s own staff
        articles — covering the top names driving today&rsquo;s session.
      </p>

      {error && <p className="mv-error">Couldn&rsquo;t load the news digest: {error}</p>}
      {loading && !data && <p className="mv-loading">Reading trusted-source headlines…</p>}

      {data && (
        <>
          {data.topTheme ? (
            <p className="mv-digest-theme">
              <span className={`mv-digest-theme-tag ${data.topTheme.avgChangePercent >= 0 ? "up" : "down"}`}>
                {data.topTheme.layer}
              </span>{" "}
              {data.topTheme.avgChangePercent >= 0 ? "led the gains" : "led the declines"} today —{" "}
              <span className={`chg ${data.topTheme.avgChangePercent >= 0 ? "up" : "down"}`}>
                {formatChangePercent(data.topTheme.avgChangePercent)}
              </span>{" "}
              avg across {data.topTheme.count} names.
            </p>
          ) : (
            <p className="mv-digest-theme muted">
              No single segment stood out today &mdash; today&rsquo;s moves look stock-specific rather than thematic.
            </p>
          )}

          <div className="mv-digest-col">
            <h4>Top gainers — news</h4>
            <DigestList articles={data.movers} empty="No trusted-source headlines found for today's gainers." />
          </div>
          <div className="mv-digest-col">
            <h4>Top losers — news</h4>
            <DigestList articles={data.losers} empty="No trusted-source headlines found for today's losers." />
          </div>
        </>
      )}
    </aside>
  );
}

function DigestList({ articles, empty }: { articles: NewsArticle[]; empty: string }) {
  if (articles.length === 0) return <p className="mv-empty">{empty}</p>;
  return (
    <ul className="mv-digest-list">
      {articles.map((a) => (
        <li key={a.url}>
          <a href={a.url} target="_blank" rel="noopener noreferrer">
            {a.headline}
          </a>
          <span className="mv-news-source">
            {" "}
            — {a.source} · {formatTimestamp(a.datetime)}
          </span>
        </li>
      ))}
    </ul>
  );
}
