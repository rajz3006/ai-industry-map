"use client";

import { useEffect, useMemo, useState } from "react";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useTradingAccount } from "@/hooks/useTradingAccount";
import { useTradingPositions } from "@/hooks/useTradingPositions";
import { useTradeJournal, type TradeJournalStatus } from "@/hooks/useTradeJournal";
import type { OpportunityRow } from "@/app/api/opportunities/route";
import type { NewsResult } from "@/app/api/news/route";
import { buildTradeSetup } from "@/lib/tradeSizing";
import { changeDirection, formatChangePercent, formatPrice, formatRelativeTime, isForeignDenominated } from "@/lib/format";

const DEFAULT_EQUITY = 5000;
const DEFAULT_RISK_PCT = 1;
const POOR_R_MULTIPLE = 1.5;

const STATUS_LABEL: Record<TradeJournalStatus, string> = {
  planned: "Planned",
  placed: "Placed",
  closed: "Closed",
};

function fmtZScore(z: number | null): string {
  if (z === null || Number.isNaN(z)) return "—";
  return `${z >= 0 ? "+" : ""}${z.toFixed(2)}σ`;
}

export default function TradeDesk() {
  const { data: opData, loading: opLoading, error: opError } = useOpportunities();
  const { data: account, loading: accountLoading, error: accountError, refetch: refetchAccount } = useTradingAccount();
  const {
    data: positions,
    loading: positionsLoading,
    error: positionsError,
    refetch: refetchPositions,
  } = useTradingPositions();
  const { entries: journal, logTrade } = useTradeJournal();

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [equity, setEquity] = useState(DEFAULT_EQUITY);
  const [riskPct, setRiskPct] = useState(DEFAULT_RISK_PCT);
  const [reasonNotes, setReasonNotes] = useState("");
  const [newsFor, setNewsFor] = useState<string | null>(null);
  const [newsCache, setNewsCache] = useState<Record<string, NewsResult | "loading" | "error">>({});
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Default the sizing equity to live account equity once it loads, but only the first time —
  // don't clobber a value the user has since typed over.
  const [equityHydrated, setEquityHydrated] = useState(false);
  useEffect(() => {
    if (!equityHydrated && account && account.equity > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEquityHydrated(true);
      setEquity(account.equity);
    }
  }, [account, equityHydrated]);

  const shortlist = useMemo(() => {
    if (!opData) return [];
    return opData.rows
      .filter((r) => !isForeignDenominated(r.symbol) && r.zScore !== null && r.zScore < 0)
      .slice(0, 25);
  }, [opData]);

  const selectedRow: OpportunityRow | null = selectedSymbol
    ? opData?.rows.find((r) => r.symbol === selectedSymbol) ?? null
    : null;

  const setup = useMemo(() => {
    if (!selectedRow) return null;
    return buildTradeSetup(selectedRow, equity, riskPct);
  }, [selectedRow, equity, riskPct]);

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

  function selectRow(symbol: string) {
    setSelectedSymbol(symbol);
    setReasonNotes("");
    setSubmitError(null);
  }

  async function closePosition(symbol: string) {
    setClosingSymbol(symbol);
    setCloseError(null);
    try {
      const res = await fetch(`/api/trading/order?symbol=${encodeURIComponent(symbol)}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) {
        setCloseError(body?.error ?? `Failed to close ${symbol} (${res.status})`);
      } else {
        refetchPositions();
        refetchAccount();
      }
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : `Failed to close ${symbol}`);
    } finally {
      setClosingSymbol(null);
    }
  }

  async function placeTrade() {
    if (!selectedRow || !setup) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/trading/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedRow.symbol,
          qty: setup.size.shares,
          takeProfitPrice: setup.targets.lockIn,
          stopLossPrice: setup.stopPrice,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSubmitError(body?.error ?? `Order failed (${res.status})`);
        return;
      }
      logTrade({
        symbol: selectedRow.symbol,
        entryPrice: setup.entryPrice,
        stopPrice: setup.stopPrice,
        takeProfitPrice: setup.targets.lockIn,
        shares: setup.size.shares,
        riskBudget: setup.size.riskBudget,
        rMultiple: setup.rMultipleLockIn,
        reasonNotes: reasonNotes.trim(),
        orderId: typeof body?.id === "string" ? body.id : null,
      });
      setReasonNotes("");
      refetchPositions();
      refetchAccount();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error placing order");
    } finally {
      setSubmitting(false);
    }
  }

  const placeDisabled =
    submitting ||
    !setup ||
    setup.size.shares < 1 ||
    !reasonNotes.trim() ||
    accountLoading ||
    !account ||
    positionsLoading;

  return (
    <div className="td-wrap">
      <div className="td-head">
        <h2>Trade Desk</h2>
        <p className="td-disclaimer">
          <b>Paper trading only</b> — this account is a $5,000 Alpaca paper account, never live money. Suggested
          levels below apply the house risk rules mechanically (1% risk per trade, a stop sized to 2x the stock&rsquo;s
          own trailing volatility, a +10% lock-in profit target) — they are arithmetic, not investment advice.
          Review every level before placing a trade.
        </p>
      </div>

      <section className="td-panel">
        <h3>Account overview</h3>
        {accountError && <p className="td-error">Couldn&rsquo;t load account: {accountError}</p>}
        {accountLoading && !account && <p className="td-loading">Loading account…</p>}
        {account && (
          <div className="td-account-stats">
            <span>
              Equity <b>{formatPrice(account.equity, "USD")}</b>
            </span>
            <span>
              Cash <b>{formatPrice(account.cash, "USD")}</b>
            </span>
            <span>
              Buying power <b>{formatPrice(account.buyingPower, "USD")}</b>
            </span>
            <button className="td-refresh-btn" onClick={refetchAccount}>
              Refresh
            </button>
          </div>
        )}

        {closeError && <p className="td-error">{closeError}</p>}
        {positionsError && <p className="td-error">Couldn&rsquo;t load positions: {positionsError}</p>}
        {positionsLoading && !positions && <p className="td-loading">Loading positions…</p>}
        {positions && positions.length === 0 && <p className="td-empty">No open positions.</p>}
        {positions && positions.length > 0 && (
          <table className="mk-table td-positions">
            <thead>
              <tr>
                <th>Symbol</th>
                <th className="num">Qty</th>
                <th className="num">Avg entry</th>
                <th className="num">Current</th>
                <th className="num">Unrealized P/L $</th>
                <th className="num">Unrealized P/L %</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.symbol}>
                  <td>{p.symbol}</td>
                  <td className="num">{p.qty}</td>
                  <td className="num">{formatPrice(p.avgEntryPrice, p.symbol)}</td>
                  <td className="num">{formatPrice(p.currentPrice, p.symbol)}</td>
                  <td className={`num chg ${changeDirection(p.unrealizedPl)}`}>
                    {formatPrice(p.unrealizedPl, p.symbol)}
                  </td>
                  <td className={`num chg ${changeDirection(p.unrealizedPlpc)}`}>
                    {formatChangePercent(p.unrealizedPlpc)}
                  </td>
                  <td className="num">
                    <button
                      className="td-close-btn"
                      disabled={closingSymbol === p.symbol}
                      onClick={() => closePosition(p.symbol)}
                    >
                      {closingSymbol === p.symbol ? "Closing…" : "Close"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="td-panel">
        <h3>Shortlist — today&rsquo;s dip candidates</h3>
        <p className="td-panel-note">Same universe and z-scores as the Opportunities screener.</p>
        {opError && <p className="td-error">Couldn&rsquo;t load shortlist: {opError}</p>}
        {opLoading && !opData && <p className="td-loading">Scoring today&rsquo;s session…</p>}
        {opData && shortlist.length === 0 && <p className="td-empty">No dip candidates clear the screen right now.</p>}
        {opData && shortlist.length > 0 && (
          <ul className="td-list">
            {shortlist.map((r) => (
              <li key={r.symbol} className={`td-row ${selectedSymbol === r.symbol ? "active" : ""}`}>
                <div className="td-row-top">
                  <span className="td-row-name">
                    <span className="mv-row-co">{r.name}</span>
                    <span className="mv-row-layer">{r.layer}</span>
                  </span>
                  <span className="td-row-price">
                    <span className="mv-row-symbol">{r.symbol}</span>
                    <span className="mv-row-amt">{formatPrice(r.price, r.symbol)}</span>
                    <span className={`chg ${changeDirection(r.changePercent)}`}>
                      {formatChangePercent(r.changePercent)}
                    </span>
                  </span>
                </div>
                <div className="td-row-meta">
                  <span className={`op-zscore ${r.zScore !== null && r.zScore >= 0 ? "up" : "down"}`}>
                    {fmtZScore(r.zScore)}
                  </span>
                  <button className="op-size-btn" onClick={() => selectRow(r.symbol)}>
                    Configure trade
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedRow && (
        <section className="td-panel td-setup">
          <h3>Trade setup — {selectedRow.symbol}</h3>

          <div className="td-setup-inputs">
            <label className="op-filter">
              <span>Account equity ($)</span>
              <input
                type="number"
                min={0}
                step={100}
                value={equity}
                onChange={(e) => setEquity(Number(e.target.value) || 0)}
              />
            </label>
            <label className="op-filter">
              <span>Risk per trade (%)</span>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={riskPct}
                onChange={(e) => setRiskPct(Number(e.target.value) || 0)}
              />
            </label>
          </div>

          {!setup && (
            <p className="td-empty">
              Not enough trailing volatility history for {selectedRow.symbol} to size a trade.
            </p>
          )}

          {setup && (
            <>
              <dl className="td-setup-facts">
                <div>
                  <dt>Entry price</dt>
                  <dd>{formatPrice(setup.entryPrice, selectedRow.symbol)}</dd>
                </div>
                <div>
                  <dt>Stop price</dt>
                  <dd>
                    {formatPrice(setup.stopPrice, selectedRow.symbol)}{" "}
                    <span className="td-dim">(&minus;{setup.stopDistancePct.toFixed(2)}%)</span>
                  </dd>
                </div>
                <div>
                  <dt>Position size</dt>
                  <dd>
                    {setup.size.shares.toLocaleString()} sh ({formatPrice(setup.size.positionValue, selectedRow.symbol)})
                  </dd>
                </div>
                <div>
                  <dt>Risk budget</dt>
                  <dd>{formatPrice(setup.size.riskBudget, "USD")}</dd>
                </div>
                <div>
                  <dt>Take-profit (lock-in, +10%)</dt>
                  <dd>{formatPrice(setup.targets.lockIn, selectedRow.symbol)}</dd>
                </div>
                <div>
                  <dt>Ceiling (+20%, informational)</dt>
                  <dd className="td-dim">{formatPrice(setup.targets.ceiling, selectedRow.symbol)}</dd>
                </div>
                <div>
                  <dt>R-multiple (lock-in)</dt>
                  <dd>
                    <span
                      className={`td-rmultiple ${
                        setup.rMultipleLockIn !== null && setup.rMultipleLockIn < POOR_R_MULTIPLE ? "poor" : ""
                      }`}
                    >
                      {setup.rMultipleLockIn === null ? "—" : `${setup.rMultipleLockIn.toFixed(2)}R`}
                      {setup.rMultipleLockIn !== null && setup.rMultipleLockIn < POOR_R_MULTIPLE && (
                        <span className="td-badge">poor reward:risk</span>
                      )}
                    </span>
                  </dd>
                </div>
              </dl>

              <button className="mv-news-toggle" onClick={() => toggleNews(selectedRow.symbol)}>
                {newsFor === selectedRow.symbol ? "Hide headlines" : "Top headlines"}
              </button>
              {newsFor === selectedRow.symbol && (
                <div className="mv-news-list">
                  {newsCache[selectedRow.symbol] === "loading" && <p className="mv-empty">Loading headlines…</p>}
                  {newsCache[selectedRow.symbol] === "error" && (
                    <p className="mv-empty">Couldn&rsquo;t load headlines for {selectedRow.symbol}.</p>
                  )}
                  {(() => {
                    const news = newsCache[selectedRow.symbol];
                    if (!news || news === "loading" || news === "error") return null;
                    return news.articles.length === 0 ? (
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
                    );
                  })()}
                </div>
              )}

              <label className="td-reason">
                <span>Why this trade?</span>
                <textarea
                  value={reasonNotes}
                  onChange={(e) => setReasonNotes(e.target.value)}
                  placeholder="What's the thesis? What would make you wrong?"
                  rows={3}
                />
              </label>

              {submitError && <p className="td-error">{submitError}</p>}

              <button className="td-place-btn" disabled={placeDisabled} onClick={placeTrade}>
                {submitting ? "Placing…" : "Place trade"}
              </button>
              {!reasonNotes.trim() && <p className="td-hint">Write down your reasoning to enable the order.</p>}
            </>
          )}
        </section>
      )}

      <section className="td-panel">
        <h3>Trade journal</h3>
        {journal.length === 0 && <p className="td-empty">No trades logged yet.</p>}
        {journal.length > 0 && (
          <ul className="td-journal">
            {journal.map((e) => (
              <li key={e.id} className="td-journal-row">
                <div className="td-journal-top">
                  <span className="td-journal-symbol">{e.symbol}</span>
                  <span className={`td-journal-status ${e.status}`}>{STATUS_LABEL[e.status]}</span>
                  <span className="td-dim">{formatRelativeTime(e.enteredAt)}</span>
                </div>
                <div className="td-journal-facts">
                  <span>Entry {formatPrice(e.entryPrice, e.symbol)}</span>
                  <span>Stop {formatPrice(e.stopPrice, e.symbol)}</span>
                  <span>Target {formatPrice(e.takeProfitPrice, e.symbol)}</span>
                  <span>{e.shares} sh</span>
                  <span>{e.rMultiple === null ? "—" : `${e.rMultiple.toFixed(2)}R`}</span>
                </div>
                {e.reasonNotes && <p className="td-journal-notes">{e.reasonNotes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
