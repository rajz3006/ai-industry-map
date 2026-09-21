"use client";

import { edges, nodeById, sources } from "@/data/industry-map";
import { tickers } from "@/data/tickers";
import type { QuoteMap } from "@/hooks/useQuotes";
import type { EarningsMap } from "@/app/api/earnings/route";
import { earningsLabel, nextEarningsDate } from "@/hooks/useEarnings";
import NodeNews from "./NodeNews";
import { changeDirection, formatChangeAbs, formatChangePercent, formatDate, formatPollLabel, formatPrice } from "@/lib/format";

export default function Dossier({
  selected,
  onSelect,
  quotes,
  earnings,
  pollMs,
  onOpenStock,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  quotes: QuoteMap;
  earnings: EarningsMap;
  pollMs: number;
  onOpenStock: (symbol: string) => void;
}) {
  if (!selected) {
    return (
      <aside className="dossier" aria-live="polite">
        <p className="empty">Select a company to isolate its incoming and outgoing links.</p>
      </aside>
    );
  }

  const n = nodeById[selected];
  if (!n) return <aside className="dossier" aria-live="polite" />;

  const connected = edges.filter((e) => e.from === selected || e.to === selected);
  const src = sources[n.src];
  const tks = tickers[selected] ?? [];
  const usTicker = tks.find((t) => t.isUS);
  // Primary ticker leads the market snapshot; any additional listings follow compactly.
  const primary = usTicker ?? tks[0] ?? null;
  const others = primary ? tks.filter((t) => t.symbol !== primary.symbol) : [];
  const nextEarnDate = usTicker ? nextEarningsDate(earnings, () => usTicker.symbol) : null;
  const nextEarnLabel = earningsLabel(nextEarnDate);

  function tickerRow(t: (typeof tks)[number], hero: boolean) {
    const q = t.isUS ? quotes[t.symbol] : undefined;
    const hasQuote = q && !("error" in q);
    const dir = hasQuote ? changeDirection((q as { changePercent: number }).changePercent) : "";
    return (
      <div
        className={`mrow${hero ? " hero" : ""}`}
        key={t.symbol}
        onClick={() => t.isUS && onOpenStock(t.symbol)}
        role={t.isUS ? "button" : undefined}
      >
        <span>
          <span className="tk">{t.symbol}</span> <span className="exch">{t.exchange}</span>
          {t.note && <span className="rng">{t.note}</span>}
          {!t.isUS && !t.note && <span className="rng">Live pricing unavailable on this exchange — check a local source</span>}
        </span>
        <span>
          {hasQuote ? (
            <>
              <span className="px">{formatPrice((q as { price: number }).price, t.symbol)}</span>
              <span className={`chg ${dir}`}>
                {formatChangePercent((q as { changePercent: number }).changePercent)} (
                {formatChangeAbs((q as { change: number }).change)})
              </span>
            </>
          ) : t.isUS ? (
            <span className="px" style={{ color: "var(--dim)", fontSize: 11 }}>
              {q && "error" in q ? "unavailable" : "loading…"}
            </span>
          ) : (
            <span className="px" style={{ color: "var(--dim)", fontSize: 11 }}>
              —
            </span>
          )}
          {hero && t.isUS && <span className="open-detail">Detail →</span>}
        </span>
      </div>
    );
  }

  return (
    <aside className="dossier" aria-live="polite">
      <div className="eyebrow">{n.layer}</div>
      <h2>{n.name}</h2>
      <p className="desc">{n.desc}</p>

      {primary && (
        <div className="market-block">
          <b>Market</b>
          {tickerRow(primary, true)}
          {others.map((t) => tickerRow(t, false))}
          <div className="asof">
            {tks.some((t) => t.isUS)
              ? `Live via Finnhub, refreshed every ${formatPollLabel(pollMs)}.`
              : "Not financial advice — verify before trading."}
          </div>
          {usTicker && nextEarnDate && (
            <div className="earn-line">
              Next earnings {usTicker.symbol}: <b>{formatDate(nextEarnDate)}</b>
              {nextEarnLabel && <span className="earn-tag">{nextEarnLabel}</span>}
            </div>
          )}
        </div>
      )}

      <div className="links">
        <h3>
          {connected.length} mapped relationship{connected.length === 1 ? "" : "s"}
        </h3>
        {connected.map((e) => {
          const other = nodeById[e.from === selected ? e.to : e.from];
          if (!other) return null;
          const arrow = e.from === selected ? "→" : "←";
          return (
            <button key={e.id} className="relation" onClick={() => onSelect(other.id)}>
              {arrow} {other.name}
              <span className="type">
                {e.type} · {e.label}
                <br />
                reported by {e.cite}
              </span>
            </button>
          );
        })}
      </div>

      <NodeNews symbol={usTicker?.symbol ?? null} companyName={n.name} />

      <div className="fact">
        <b>Signal</b>
        <span>{n.fact}</span>
        {src &&
          (src.url ? (
            <a className="source" href={src.url} target="_blank" rel="noopener noreferrer">
              Reported by {src.label} ↗
            </a>
          ) : (
            <span className="source">Reported by {src.label}</span>
          ))}
      </div>
    </aside>
  );
}
