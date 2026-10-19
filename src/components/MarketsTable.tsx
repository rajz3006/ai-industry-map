"use client";

import { useMemo, useState } from "react";
import { nodeById } from "@/data/industry-map";
import { allTickerRows } from "@/data/tickers";
import type { QuoteMap } from "@/hooks/useQuotes";
import { useNowTick } from "@/hooks/useNowTick";
import { useEntryRanges } from "@/hooks/useEntryRanges";
import { EntryRangeCell } from "./EntryRangeCell";
import type { FundamentalRange } from "@/lib/evaluation/entryRange";
import type { TechnicalRange } from "@/lib/evaluation/technicalRange";
import {
  changeDirection,
  formatChangePercent,
  formatPollLabel,
  formatPrice,
  formatRelativeTime,
  formatTimestamp,
} from "@/lib/format";

type SortKey = "name" | "layer" | "ticker" | "price" | "chgPct" | "range" | "fundEntry" | "techEntry" | "asOf";

// How today's day-low (falling back to current price before the first low is known) compares
// to a computed entry range — purely a reference, not a buy signal.
type EntryTouchStatus = "below" | "touched" | "above" | null;

function entryTouchStatus(dayLow: number | undefined, priceLow: number, priceHigh: number): EntryTouchStatus {
  if (typeof dayLow !== "number") return null;
  if (dayLow < priceLow) return "below";
  if (dayLow <= priceHigh) return "touched";
  return "above";
}

const ALL_CATEGORIES = "All";

/** Tooltip content for the fundamental cell: the full methodology breakdown. */
function fundamentalTip(range: FundamentalRange, symbol: string) {
  const b = range.breakdown;
  const lines = [
    `Entry band ${formatPrice(range.priceLow, symbol)}–${formatPrice(range.priceHigh, symbol)} — intrinsic value ${formatPrice(range.ivLow, symbol)}–${formatPrice(range.ivHigh, symbol)} after ${(range.marginOfSafety * 100).toFixed(0)}% margin of safety`,
    ...b.lines,
    ...range.mosReasons.map((r) => `Margin of safety: ${r}`),
    `News read: ${range.newsScore.toFixed(1)}/5 (${range.newsVerdict}) — bad news widens the required discount`,
  ];
  return {
    title: "Fundamental range — intrinsic value with margin of safety",
    lines,
    warnings: b.warnings,
    footer: `Methodology v2 (owner-earnings DCF + Greenwald EPV + earnings-yield anchor; no peer comps) · computed ${formatTimestamp(range.computedAt)} · cached 24h · a reference point, not a recommendation`,
  };
}

/** Tooltip content for the technical cell: the full methodology breakdown. */
function technicalTip(range: TechnicalRange, symbol: string) {
  const lines = [
    `Accumulation zone ${formatPrice(range.priceLow, symbol)}–${formatPrice(range.priceHigh, symbol)} (center ${formatPrice(range.referenceLevel, symbol)})`,
    ...range.lines,
  ];
  return {
    title: "Technical range — institutional accumulation zone",
    lines,
    warnings: range.warnings,
    footer: `Methodology v2 (volume profile + swing lows + anchored VWAP, money-flow adjusted, ATR-sized) · recomputed live every refresh · up/down volume is a price×volume proxy, not true order-flow data · a reference point, not a recommendation`,
  };
}

export default function MarketsTable({
  quotes,
  pollMs,
  loading,
  lastUpdatedAt,
  onSelectNode,
  onOpenStock,
}: {
  quotes: QuoteMap;
  pollMs: number;
  loading: boolean;
  lastUpdatedAt: number | null;
  onSelectNode: (id: string) => void;
  onOpenStock: (symbol: string) => void;
}) {
  useNowTick(10_000); // keeps the "updated Xs/m ago" text below fresh
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "chgPct", dir: -1 });
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const { data: entryRangeData } = useEntryRanges();

  const rows = useMemo(() => {
    return allTickerRows.map((r) => {
      const n = nodeById[r.nodeId];
      const q = r.isUS ? quotes[r.symbol] : undefined;
      const live = q && !("error" in q) ? q : undefined;
      const errored = !!q && "error" in q;
      const symbolRanges = entryRangeData?.entries[r.symbol];
      const fundEntry = symbolRanges?.fundamental;
      const fundRange = fundEntry?.status === "ready" ? fundEntry.range : null;
      const fundTouch = fundRange ? entryTouchStatus(live?.low ?? live?.price, fundRange.priceLow, fundRange.priceHigh) : null;
      const techEntry = symbolRanges?.technical;
      const techRange = techEntry?.status === "ready" ? techEntry.range : null;
      // "Touched" compares against the zone's confluence center (referenceLevel), not the
      // displayed priceHigh — priceHigh includes the ATR cushion above the center that, for a
      // low-volatility stock, regularly sits above the day's actual low, which would fire
      // "touched" on almost every row regardless of whether price action ever neared the
      // real accumulation zone.
      const techTouch = techRange ? entryTouchStatus(live?.low ?? live?.price, techRange.priceLow, techRange.referenceLevel) : null;
      return {
        nodeId: r.nodeId,
        name: n?.name ?? r.nodeId,
        layer: n?.layer ?? "Other",
        symbol: r.symbol,
        exchange: r.exchange,
        isUS: r.isUS,
        note: r.note,
        errored,
        price: live?.price,
        changePercent: live?.changePercent,
        change: live?.change,
        low: live?.low,
        high: live?.high,
        timestamp: live?.timestamp,
        fundUnavailable: fundEntry?.status === "unavailable",
        fundRange,
        fundTouch,
        techUnavailable: techEntry?.status === "unavailable",
        techRange,
        techTouch,
      };
    });
  }, [quotes, entryRangeData]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const r of rows) {
      if (!seen.has(r.layer)) {
        seen.add(r.layer);
        ordered.push(r.layer);
      }
    }
    return [ALL_CATEGORIES, ...ordered];
  }, [rows]);

  const filtered = useMemo(
    () => (category === ALL_CATEGORIES ? rows : rows.filter((r) => r.layer === category)),
    [rows, category]
  );

  const sorted = useMemo(() => {
    const copy = filtered.slice();
    copy.sort((a, b) => {
      let av: string | number | undefined;
      let bv: string | number | undefined;
      switch (sort.key) {
        case "name":
          av = a.name;
          bv = b.name;
          break;
        case "layer":
          av = a.layer;
          bv = b.layer;
          break;
        case "ticker":
          av = a.symbol;
          bv = b.symbol;
          break;
        case "price":
          av = a.price;
          bv = b.price;
          break;
        case "chgPct":
          av = a.changePercent;
          bv = b.changePercent;
          break;
        case "range":
          av = a.price;
          bv = b.price;
          break;
        case "fundEntry":
        case "techEntry": {
          // Deepest "below range" first, then "touched," then "above"/unknown — i.e. the
          // most clearly-in-the-zone candidates sort to the top. Expressed as (ceiling -
          // dayLow): the bigger the gap below the ceiling, the stronger/deeper the touch.
          // The technical column's ceiling is the raw Bollinger lower band (matching
          // techTouch above), not its displayed priceHigh — see the note by techTouch.
          const aCeiling = sort.key === "fundEntry" ? a.fundRange?.priceHigh : a.techRange?.referenceLevel;
          const bCeiling = sort.key === "fundEntry" ? b.fundRange?.priceHigh : b.techRange?.referenceLevel;
          av = typeof aCeiling === "number" && typeof a.low === "number" ? aCeiling - a.low : -Infinity;
          bv = typeof bCeiling === "number" && typeof b.low === "number" ? bCeiling - b.low : -Infinity;
          break;
        }
        case "asOf":
          av = a.timestamp;
          bv = b.timestamp;
          break;
      }
      const an = av === undefined || av === null;
      const bn = bv === undefined || bv === null;
      if (an && bn) return 0;
      if (an) return 1;
      if (bn) return -1;
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * sort.dir;
      return ((av as number) - (bv as number)) * sort.dir;
    });
    return copy;
  }, [filtered, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => ({ key, dir: prev.key === key ? ((-prev.dir) as 1 | -1) : -1 }));
  }

  return (
    <div className="mk-wrap">
      <div className="mk-head">
        <div>
          <h2>Public-market pricing</h2>
          <p>
            Every identifiable public ticker among the mapped companies. Private companies (OpenAI, Anthropic, Humain,
            Crusoe, and others) have no market price and are omitted. Click a row to open its detail view.
          </p>
        </div>
        <span className="mk-refresh">
          Live via Finnhub (US-listed only) · {loading ? "updating…" : `updated ${formatRelativeTime(lastUpdatedAt)}`}
          {" · refreshes every "}
          {formatPollLabel(pollMs)}
        </span>
      </div>
      <p className="mk-entry-note">
        Two independent entry-range reads, kept separate on purpose so you can see whether they agree.{" "}
        <b>Fundamental range</b> is a Buffett-style intrinsic-value band — the business&rsquo;s own owner
        earnings (DCF), its no-growth Earnings Power Value, and an earnings-yield anchor, triangulated
        into a band and discounted by a margin of safety. No peer multiples anywhere. Recomputed once a
        day and cached, not live.{" "}
        <b>Technical range</b> is an institutional accumulation zone — volume-profile nodes, swing lows,
        and anchored VWAP in confluence, shifted by the buyer-vs-seller money-flow read (Chaikin Money
        Flow, up/down volume, OBV) and sized by ATR. Recomputed live every refresh. Hover any range for
        the full methodology breakdown; the ✓/∼ seal tells you whether the inputs were verified or
        estimated. Neither uses risk/reward sizing (that&rsquo;s the Trade Desk&rsquo;s job). &ldquo;Touched&rdquo;
        means today&rsquo;s low reached the zone&rsquo;s center — a reference point, not a recommendation.
        {entryRangeData && entryRangeData.computedToday < entryRangeData.totalSymbols && (
          <span className="mk-entry-progress">
            {" "}
            Computing today&rsquo;s fundamental ranges: {entryRangeData.computedToday}/{entryRangeData.totalSymbols}…
          </span>
        )}
      </p>
      <div className="mk-categories" role="tablist" aria-label="Filter by category">
        {categories.map((c) => (
          <button
            key={c}
            className={`mk-cat ${category === c ? "active" : ""}`}
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
            {c !== ALL_CATEGORIES && (
              <span className="mk-cat-count">{rows.filter((r) => r.layer === c).length}</span>
            )}
          </button>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="mk-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("name")}>Company</th>
              <th onClick={() => toggleSort("layer")}>Category</th>
              <th onClick={() => toggleSort("ticker")}>Ticker</th>
              <th className="num" onClick={() => toggleSort("price")}>
                Price
              </th>
              <th className="num" onClick={() => toggleSort("chgPct")}>
                Change
              </th>
              <th className="num">Day range</th>
              <th className="num" onClick={() => toggleSort("fundEntry")}>
                Fundamental range
              </th>
              <th className="num" onClick={() => toggleSort("techEntry")}>
                Technical range
              </th>
              <th onClick={() => toggleSort("asOf")}>As of</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const dir = changeDirection(r.changePercent);
              const clickable = r.isUS;
              return (
                <tr key={r.nodeId + r.symbol}>
                  <td
                    className="co"
                    onClick={() => onSelectNode(r.nodeId)}
                  >
                    {r.name}
                  </td>
                  <td className="exch">{r.layer}</td>
                  <td>
                    {r.symbol}
                    <span className="exch"> {r.exchange}</span>
                  </td>
                  <td
                    className="num"
                    style={clickable ? { cursor: "pointer" } : undefined}
                    onClick={() => clickable && onOpenStock(r.symbol)}
                  >
                    {clickable ? (
                      typeof r.price === "number" ? (
                        formatPrice(r.price, r.symbol)
                      ) : r.errored ? (
                        <span className="unavail">unavailable</span>
                      ) : (
                        <span className="exch">loading…</span>
                      )
                    ) : (
                      <span className="unavail">{r.note ?? "unavailable"}</span>
                    )}
                  </td>
                  <td className="num">
                    {typeof r.changePercent === "number" ? (
                      <span className={`chg ${dir}`}>{formatChangePercent(r.changePercent)}</span>
                    ) : (
                      <span className="exch">—</span>
                    )}
                  </td>
                  <td className="num">
                    {typeof r.low === "number" && typeof r.high === "number" ? (
                      `${formatPrice(r.low, r.symbol)}–${formatPrice(r.high, r.symbol)}`
                    ) : (
                      <span className="exch">—</span>
                    )}
                  </td>
                  <td className="num">
                    {!r.isUS ? (
                      <span className="exch">N/A</span>
                    ) : r.fundRange ? (
                      <EntryRangeCell
                        {...fundamentalTip(r.fundRange, r.symbol)}
                        seal={r.fundRange.seal}
                        touch={r.fundTouch}
                      >
                        {formatPrice(r.fundRange.priceLow, r.symbol)}–{formatPrice(r.fundRange.priceHigh, r.symbol)}
                      </EntryRangeCell>
                    ) : r.fundUnavailable ? (
                      <span className="exch" title="The business has no positive owner earnings to value — an honest 'cannot be valued on earnings' rather than a sales-multiple guess.">no data</span>
                    ) : (
                      <span className="exch">computing…</span>
                    )}
                  </td>
                  <td className="num">
                    {!r.isUS ? (
                      <span className="exch">N/A</span>
                    ) : r.techRange ? (
                      <EntryRangeCell
                        {...technicalTip(r.techRange, r.symbol)}
                        seal={r.techRange.seal}
                        touch={r.techTouch}
                      >
                        {formatPrice(r.techRange.priceLow, r.symbol)}–{formatPrice(r.techRange.priceHigh, r.symbol)}
                      </EntryRangeCell>
                    ) : r.techUnavailable ? (
                      <span className="exch" title="Not enough price history for a volume-profile read (needs 60+ sessions).">no data</span>
                    ) : (
                      <span className="exch">computing…</span>
                    )}
                  </td>
                  <td className="exch">
                    {r.isUS ? (typeof r.timestamp === "number" ? formatTimestamp(r.timestamp) : "—") : "N/A"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
