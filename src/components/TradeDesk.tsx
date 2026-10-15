"use client";

import { useEffect, useMemo, useState } from "react";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useTradingAccount } from "@/hooks/useTradingAccount";
import { useTradingPositions } from "@/hooks/useTradingPositions";
import { useTradeJournal, type TradeJournalStatus } from "@/hooks/useTradeJournal";
import { useCompanyNews } from "@/hooks/useCompanyNews";
import TradeChart from "@/components/TradeChart";
import InfoTip from "@/components/InfoTip";
import type { OpportunityRow } from "@/app/api/opportunities/route";
import { buildTradeSetup, type StopMode } from "@/lib/tradeSizing";
import { changeDirection, formatChangePercent, formatPrice, formatRelativeTime, isForeignDenominated } from "@/lib/format";

const DEFAULT_EQUITY = 5000;
const DEFAULT_RISK_PCT = 1;
const DEFAULT_PROFIT_PCT = 10;
const DEFAULT_STOP_MODE: StopMode = "vol";
const DEFAULT_STOP_PCT = 4;
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
  const [symbolQuery, setSymbolQuery] = useState("");
  const [equity, setEquity] = useState(DEFAULT_EQUITY);
  const [riskPct, setRiskPct] = useState(DEFAULT_RISK_PCT);
  const [profitPct, setProfitPct] = useState(DEFAULT_PROFIT_PCT);
  const [stopMode, setStopMode] = useState<StopMode>(DEFAULT_STOP_MODE);
  const [stopPct, setStopPct] = useState(DEFAULT_STOP_PCT);
  const [reasonNotes, setReasonNotes] = useState("");
  const [newsFor, setNewsFor] = useState<string | null>(null);
  const { data: newsData, loading: newsLoading, error: newsError } = useCompanyNews(newsFor);
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

  // Free-form picker: any of the full tracked universe, not just the dip shortlist. Reuses
  // the same opData rows (already has price/zScore/trailingStdDevPct for every US symbol),
  // so selecting a result here drives the exact same trade-setup section below as the
  // shortlist does — no separate data path or sizing logic needed.
  const searchResults = useMemo(() => {
    const q = symbolQuery.trim().toUpperCase();
    if (!q || !opData) return [];
    return opData.rows
      .filter(
        (r) => !isForeignDenominated(r.symbol) && (r.symbol.toUpperCase().includes(q) || r.name.toUpperCase().includes(q))
      )
      .slice(0, 10);
  }, [opData, symbolQuery]);

  const selectedRow: OpportunityRow | null = selectedSymbol
    ? opData?.rows.find((r) => r.symbol === selectedSymbol) ?? null
    : null;

  const setup = useMemo(() => {
    if (!selectedRow) return null;
    return buildTradeSetup(selectedRow, equity, riskPct, { stopMode, stopPct, profitPct });
  }, [selectedRow, equity, riskPct, stopMode, stopPct, profitPct]);

  function toggleNews(symbol: string) {
    setNewsFor((prev) => (prev === symbol ? null : symbol));
  }

  function selectRow(symbol: string) {
    setSelectedSymbol(symbol);
    setReasonNotes("");
    setSubmitError(null);
    setSymbolQuery("");
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
          <b>Paper trading only</b> — this account is a $5,000 Alpaca paper account, never live money. Levels below
          default to the house risk rules (1% risk per trade, a stop sized to 2x the stock&rsquo;s own trailing
          volatility, a +10% lock-in profit target) but every input — equity, risk %, profit target, and stop mode —
          is yours to tune. They are arithmetic, not investment advice. Review every level before placing a trade.
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
        <h3>Search any symbol</h3>
        <p className="td-panel-note">
          Not limited to the shortlist below — configure a trade for any tracked symbol, not just today&rsquo;s dip
          candidates.
        </p>
        <input
          type="text"
          className="td-symbol-search"
          placeholder="Search by ticker or company name…"
          value={symbolQuery}
          onChange={(e) => setSymbolQuery(e.target.value)}
        />
        {opError && symbolQuery.trim() && <p className="td-error">Couldn&rsquo;t load symbol data: {opError}</p>}
        {opLoading && !opData && symbolQuery.trim() && <p className="td-loading">Loading symbol data…</p>}
        {opData && symbolQuery.trim() && searchResults.length === 0 && (
          <p className="td-empty">No tracked symbol matches &ldquo;{symbolQuery.trim()}&rdquo;.</p>
        )}
        {searchResults.length > 0 && (
          <ul className="td-list">
            {searchResults.map((r) => (
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
              <span>
                Account equity ($)
                <InfoTip text="Capital this ticket sizes against — not necessarily your whole account. It scales position size and risk budget directly, so lowering it sizes every trade down proportionally." />
              </span>
              <input
                type="number"
                min={0}
                step={100}
                value={equity}
                onChange={(e) => setEquity(Number(e.target.value) || 0)}
              />
            </label>
            <label className="op-filter">
              <span>
                Risk per trade (%)
                <InfoTip text="Max % of account equity this trade can lose if the stop is hit. House rule is 1%. Keep it low (0.5-2%) so one stop-out doesn't meaningfully dent the account — raising it buys more shares but makes a loss hurt more." />
              </span>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={riskPct}
                onChange={(e) => setRiskPct(Number(e.target.value) || 0)}
              />
            </label>
            <label className="op-filter">
              <span>
                Profit target (%)
                <InfoTip text="Price above entry where the bracket order takes profit (the lock-in exit). House default is +10%. The informational ceiling below is always 2x this target — a discipline cap on how far a winner is allowed to run, not a real order." />
              </span>
              <input
                type="number"
                min={0.5}
                max={500}
                step={1}
                value={profitPct}
                onChange={(e) => setProfitPct(Math.min(500, Math.max(0.5, Number(e.target.value) || 0.5)))}
              />
            </label>
            <div className="op-filter">
              <span>
                Stop mode
                <InfoTip text="Volatility (2σ) sets the stop at 2x the stock's own trailing 20-day volatility — wider for choppy names, tighter for calm ones, and adapts automatically. Fixed % uses the same flat distance for every stock. Volatility is the better default; use Fixed % for a predictable distance or when a symbol lacks enough price history to compute volatility." />
              </span>
              <div className="cb-radio-row" role="radiogroup" aria-label="Stop mode">
                <label>
                  <input
                    type="radio"
                    name="td-stop-mode"
                    checked={stopMode === "vol"}
                    onChange={() => setStopMode("vol")}
                  />
                  Volatility (2σ)
                </label>
                <label>
                  <input
                    type="radio"
                    name="td-stop-mode"
                    checked={stopMode === "fixed"}
                    onChange={() => setStopMode("fixed")}
                  />
                  Fixed %
                </label>
              </div>
            </div>
            {stopMode === "fixed" && (
              <label className="op-filter">
                <span>
                  Stop distance (%)
                  <InfoTip text="How far below entry the stop sits, as a flat percentage. Too tight and normal daily noise stops you out early; too wide and a loss costs more than intended. 2-5% is reasonable for most liquid names — switch to Volatility mode first to see what the stock's own trailing moves actually look like before picking a number." />
                </span>
                <input
                  type="number"
                  min={0.5}
                  max={50}
                  step={0.5}
                  value={stopPct}
                  onChange={(e) => setStopPct(Math.min(50, Math.max(0.5, Number(e.target.value) || 0.5)))}
                />
              </label>
            )}
          </div>

          {!setup && (
            <p className="td-empty">
              {stopMode === "vol"
                ? `Not enough trailing volatility history for ${selectedRow.symbol} to size a trade — switch to fixed %.`
                : `Risk budget buys zero shares at this stop distance for ${selectedRow.symbol} — raise equity or risk %, or tighten the stop.`}
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
                  <dt>Take-profit (lock-in, +{profitPct}%)</dt>
                  <dd>{formatPrice(setup.targets.lockIn, selectedRow.symbol)}</dd>
                </div>
                <div>
                  <dt>Ceiling (+{profitPct * 2}%, informational)</dt>
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

              <TradeChart
                symbol={selectedRow.symbol}
                levels={{
                  entry: setup.entryPrice,
                  stop: setup.stopPrice,
                  target: setup.targets.lockIn,
                  ceiling: setup.targets.ceiling,
                }}
              />

              <button className="mv-news-toggle" onClick={() => toggleNews(selectedRow.symbol)}>
                {newsFor === selectedRow.symbol ? "Hide headlines" : "Top headlines"}
              </button>
              {newsFor === selectedRow.symbol && (
                <div className="mv-news-list">
                  {newsLoading && !newsData && <p className="mv-empty">Loading headlines…</p>}
                  {newsError && !newsData && (
                    <p className="mv-empty">Couldn&rsquo;t load headlines for {selectedRow.symbol}.</p>
                  )}
                  {newsData && (
                    newsData.articles.length === 0 ? (
                      <p className="mv-empty">No recent headlines found.</p>
                    ) : (
                      <ul>
                        {newsData.articles.slice(0, 3).map((a) => (
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
