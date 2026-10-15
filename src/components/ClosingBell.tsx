"use client";

import { useEffect, useMemo, useState } from "react";
import { useClosingCandidates } from "@/hooks/useClosingCandidates";
import {
  computePositionSize,
  computeRMultiple,
  computeStopPrice,
} from "@/lib/tradeSizing";
import { changeDirection, formatChangePercent, formatPrice, formatRelativeTime, formatTimestamp, ordinal } from "@/lib/format";
import type { ClosingCandidate, ClosingFilters, DropBasis } from "@/app/api/closing/route";

type StopMode = "vol" | "fixed";

interface TicketPrefs {
  equity: number;
  riskPct: number;
  profitPct: number;
  stopMode: StopMode;
  stopPct: number;
}

const DEFAULT_PREFS: TicketPrefs = {
  equity: 5000,
  riskPct: 1,
  profitPct: 10,
  stopMode: "vol",
  stopPct: 4,
};

const PREFS_KEY = "cb-ticket-prefs";
const FILTERS_KEY = "cb-filters";

const DEFAULT_FILTERS: ClosingFilters = {
  dropBasis: "pct",
  minDropPct: 1,
  minZScore: 1,
  minFundamentals: "good",
  minValuation: "neutral",
  minTechnicals: "good",
};

const VERDICT_OPTIONS: ClosingFilters["minFundamentals"][] = ["strong", "good", "neutral", "weak"];

function loadFilters(): ClosingFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  try {
    const raw = window.localStorage.getItem(FILTERS_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<ClosingFilters>;
    const dropBasis: DropBasis = parsed.dropBasis === "zscore" ? "zscore" : DEFAULT_FILTERS.dropBasis;
    const minDropPct =
      typeof parsed.minDropPct === "number" && Number.isFinite(parsed.minDropPct)
        ? Math.min(50, Math.max(0, parsed.minDropPct))
        : DEFAULT_FILTERS.minDropPct;
    const minZScore =
      typeof parsed.minZScore === "number" && Number.isFinite(parsed.minZScore)
        ? Math.min(10, Math.max(0, parsed.minZScore))
        : DEFAULT_FILTERS.minZScore;
    const minFundamentals = VERDICT_OPTIONS.includes(parsed.minFundamentals as ClosingFilters["minFundamentals"])
      ? (parsed.minFundamentals as ClosingFilters["minFundamentals"])
      : DEFAULT_FILTERS.minFundamentals;
    const minValuation = VERDICT_OPTIONS.includes(parsed.minValuation as ClosingFilters["minValuation"])
      ? (parsed.minValuation as ClosingFilters["minValuation"])
      : DEFAULT_FILTERS.minValuation;
    const minTechnicals = VERDICT_OPTIONS.includes(parsed.minTechnicals as ClosingFilters["minTechnicals"])
      ? (parsed.minTechnicals as ClosingFilters["minTechnicals"])
      : DEFAULT_FILTERS.minTechnicals;
    return { dropBasis, minDropPct, minZScore, minFundamentals, minValuation, minTechnicals };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function loadPrefs(): TicketPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<TicketPrefs>;
    return {
      equity: typeof parsed.equity === "number" && parsed.equity > 0 ? parsed.equity : DEFAULT_PREFS.equity,
      riskPct: typeof parsed.riskPct === "number" && parsed.riskPct > 0 ? parsed.riskPct : DEFAULT_PREFS.riskPct,
      profitPct:
        typeof parsed.profitPct === "number" && parsed.profitPct > 0 ? parsed.profitPct : DEFAULT_PREFS.profitPct,
      stopMode: parsed.stopMode === "fixed" ? "fixed" : "vol",
      stopPct: typeof parsed.stopPct === "number" && parsed.stopPct > 0 ? parsed.stopPct : DEFAULT_PREFS.stopPct,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function verdictTone(v: string): "up" | "down" | "" {
  if (v === "strong" || v === "good") return "up";
  if (v === "weak" || v === "poor") return "down";
  return "";
}

export default function ClosingBell({ onOpenStock }: { onOpenStock: (symbol: string) => void }) {
  const [appliedFilters, setAppliedFilters] = useState<ClosingFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<ClosingFilters>(DEFAULT_FILTERS);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const { data, loading, error, refresh } = useClosingCandidates(appliedFilters);

  const [prefs, setPrefs] = useState<TicketPrefs>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeResult, setPlaceResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const stored = loadPrefs();
    const storedFilters = loadFilters();
    // Hydration-safe init: the first render uses defaults on both server and client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(stored);
    setPrefsLoaded(true);
    setAppliedFilters(storedFilters);
    setDraftFilters(storedFilters);
    setFiltersLoaded(true);
  }, []);

  useEffect(() => {
    if (!filtersLoaded) return;
    try {
      window.localStorage.setItem(FILTERS_KEY, JSON.stringify(appliedFilters));
    } catch {
      /* ignore */
    }
  }, [appliedFilters, filtersLoaded]);

  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs, prefsLoaded]);

  const selected: ClosingCandidate | null = useMemo(
    () => (selectedSymbol ? data?.candidates.find((c) => c.symbol === selectedSymbol) ?? null : null),
    [data, selectedSymbol]
  );

  const ticket = useMemo(() => {
    if (!selected) return null;
    const entry = selected.price;
    let stop: number | null = null;
    let stopNote: string | null = null;
    if (prefs.stopMode === "vol") {
      if (selected.trailingStdDevPct && selected.trailingStdDevPct > 0) {
        stop = computeStopPrice(entry, selected.trailingStdDevPct);
      } else {
        stopNote = "Not enough price history for a volatility stop — switch to fixed %.";
      }
    } else {
      stop = entry * (1 - prefs.stopPct / 100);
    }
    if (stop === null || stop <= 0 || stop >= entry) return { stopNote: stopNote ?? "Stop must sit below the entry price.", entry };
    const target = entry * (1 + prefs.profitPct / 100);
    const size = computePositionSize(entry, stop, prefs.equity, prefs.riskPct);
    const rMultiple = computeRMultiple(entry, stop, target);
    return { entry, stop, target, size, rMultiple, stopNote: null as string | null };
  }, [selected, prefs]);

  function updatePrefs(patch: Partial<TicketPrefs>) {
    setPrefs((p) => ({ ...p, ...patch }));
    setPlaceResult(null);
  }

  function selectCandidate(symbol: string) {
    setSelectedSymbol(symbol);
    setPlaceResult(null);
  }

  function applyFilters() {
    setAppliedFilters({ ...draftFilters });
    refresh();
  }

  function resetFilters() {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    refresh();
  }

  const activeFilters = data?.filters ?? appliedFilters;
  const dropBasisLabel =
    activeFilters.dropBasis === "zscore"
      ? `drop ≥ ${activeFilters.minZScore}σ (vs. own 20d volatility)`
      : `drop ≥ ${activeFilters.minDropPct}%`;
  const filterSummary = `${dropBasisLabel} · fundamentals ≥ ${activeFilters.minFundamentals} · valuation ≥ ${activeFilters.minValuation} · technicals ≥ ${activeFilters.minTechnicals}`;

  async function placeOrder() {
    if (!selected || !ticket || !("size" in ticket) || !ticket.size || ticket.size.shares <= 0) return;
    setPlacing(true);
    setPlaceResult(null);
    try {
      const res = await fetch("/api/trading/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selected.symbol,
          qty: ticket.size.shares,
          takeProfitPrice: Number(ticket.target.toFixed(2)),
          stopLossPrice: Number(ticket.stop.toFixed(2)),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPlaceResult({ ok: false, message: body?.error ?? `Order failed (${res.status})` });
      } else {
        setPlaceResult({
          ok: true,
          message: `Paper bracket order placed: ${ticket.size.shares} ${selected.symbol} @ ${formatPrice(ticket.entry, selected.symbol)}, stop ${formatPrice(ticket.stop, selected.symbol)}, target ${formatPrice(ticket.target, selected.symbol)}.`,
        });
      }
    } catch (err) {
      setPlaceResult({ ok: false, message: err instanceof Error ? err.message : "Order failed" });
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="cb-wrap">
      <div className="cb-head">
        <div>
          <h2>Stock Picker</h2>
          <p className="cb-disclaimer">
            Screens today&rsquo;s session on the latest available price, any time the market is open — it is not
            tied to the close. It looks for stocks that <b>dropped in today&rsquo;s session</b> while their{" "}
            <b>fundamentals</b> (financial-statement quality), <b>valuation</b> (not obviously overpriced for the
            dip), and <b>technicals</b> (chart indicators) all clear your thresholds. It is a screening tool that
            narrows a watchlist, <b>not a recommendation</b> — a dip can keep dipping, and today&rsquo;s price can
            still move before the bell. Nothing here is investment advice, and orders placed from the ticket below
            are paper trades.
          </p>
        </div>
        <div className="cb-clock-wrap">
          <button className="cb-refresh-btn" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh now"}
          </button>
          {data && <span className="cb-asof">Updated {formatRelativeTime(new Date(data.asOf).getTime())}</span>}
        </div>
      </div>

      {data && (
        <p className="cb-session">
          Session {data.sessionDate} · {data.evaluated} symbols tracked · {data.dropped} cleared the drop filter ·{" "}
          {data.candidates.length} matching ({filterSummary})
          {data.excludedForDataGap > 0 && (
            <span className="cb-datagap-note">
              {" "}
              · {data.excludedForDataGap} more dropped but {data.excludedForDataGap === 1 ? "has" : "have"} incomplete
              fundamentals/valuation/technicals data right now — not excluded for failing the bar, just unscored; open
              the symbol directly or re-run in a few minutes.
            </span>
          )}
          {data.excludedForQuality > 0 && ` · ${data.excludedForQuality} dropped but didn't clear the quality bar.`}
        </p>
      )}
      {error && <p className="cb-error">Couldn&rsquo;t load the screen: {error}</p>}
      {loading && !data && <p className="cb-loading">Scoring the session against fundamentals and technicals…</p>}

      <div className="cb-filters">
        <label className="cb-filter">
          <span>Drop basis</span>
          <select
            value={draftFilters.dropBasis}
            onChange={(e) => setDraftFilters((f) => ({ ...f, dropBasis: e.target.value as DropBasis }))}
          >
            <option value="pct">Flat % drop</option>
            <option value="zscore">Vs. own volatility (z-score)</option>
          </select>
        </label>
        {draftFilters.dropBasis === "zscore" ? (
          <label className="cb-filter">
            <span>Min drop (σ vs. own 20d volatility)</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.25}
              value={draftFilters.minZScore}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, minZScore: Math.min(5, Math.max(0, Number(e.target.value) || 0)) }))
              }
            />
          </label>
        ) : (
          <label className="cb-filter">
            <span>Min intraday drop (%)</span>
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={draftFilters.minDropPct}
              onChange={(e) =>
                setDraftFilters((f) => ({
                  ...f,
                  minDropPct: Math.min(10, Math.max(0, Number(e.target.value) || 0)),
                }))
              }
            />
          </label>
        )}
        <label className="cb-filter">
          <span>Fundamentals at least</span>
          <select
            value={draftFilters.minFundamentals}
            onChange={(e) =>
              setDraftFilters((f) => ({ ...f, minFundamentals: e.target.value as ClosingFilters["minFundamentals"] }))
            }
          >
            {VERDICT_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v[0].toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="cb-filter">
          <span>Valuation at least</span>
          <select
            value={draftFilters.minValuation}
            onChange={(e) =>
              setDraftFilters((f) => ({ ...f, minValuation: e.target.value as ClosingFilters["minValuation"] }))
            }
          >
            {VERDICT_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v[0].toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="cb-filter">
          <span>Technicals at least</span>
          <select
            value={draftFilters.minTechnicals}
            onChange={(e) =>
              setDraftFilters((f) => ({ ...f, minTechnicals: e.target.value as ClosingFilters["minTechnicals"] }))
            }
          >
            {VERDICT_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v[0].toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <div className="cb-filter-actions">
          <button className="cb-apply-btn" onClick={applyFilters}>
            Apply filters
          </button>
          <button className="cb-reset-btn" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </div>
      <p className="cb-filters-note">
        Defaults: drop ≥ 1%, fundamentals ≥ good, valuation ≥ neutral, technicals ≥ good. The z-score drop basis
        compares today&rsquo;s move to the stock&rsquo;s own trailing volatility instead of a flat %, so a routine
        move in a volatile name and a genuinely unusual move in a quiet one aren&rsquo;t treated the same. Loosening
        a filter widens the net; tightening it narrows to higher-conviction dips. Your last-used filters are
        remembered.
      </p>

      {selected && (
        <div className="cb-ticket">
          <div className="cb-ticket-head">
            <h3>
              Trade ticket — {selected.symbol} <span className="cb-ticket-name">{selected.name}</span>
            </h3>
            <button className="cb-ticket-close" onClick={() => { setSelectedSymbol(null); setPlaceResult(null); }}>
              Close
            </button>
          </div>
          <p className="cb-ticket-note">
            Entry defaults to the last price ({formatPrice(selected.price, selected.symbol)}). Tune the risk, profit
            target, and stop below — the ticket recomputes size and reward:risk live. Placing an order submits a paper
            bracket trade, visible on the Trade Desk tab.
          </p>
          <div className="cb-ticket-inputs">
            <label className="cb-field">
              <span>Account equity ($)</span>
              <input
                type="number"
                min={1}
                step={100}
                value={prefs.equity}
                onChange={(e) => updatePrefs({ equity: Math.max(1, Number(e.target.value) || 1) })}
              />
            </label>
            <label className="cb-field">
              <span>Risk per trade (%)</span>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.25}
                value={prefs.riskPct}
                onChange={(e) => updatePrefs({ riskPct: Math.min(100, Math.max(0.1, Number(e.target.value) || 0.1)) })}
              />
            </label>
            <label className="cb-field">
              <span>Profit target (%)</span>
              <input
                type="number"
                min={0.5}
                max={500}
                step={1}
                value={prefs.profitPct}
                onChange={(e) => updatePrefs({ profitPct: Math.min(500, Math.max(0.5, Number(e.target.value) || 0.5)) })}
              />
            </label>
            <div className="cb-field">
              <span>Stop mode</span>
              <div className="cb-radio-row" role="radiogroup" aria-label="Stop mode">
                <label>
                  <input
                    type="radio"
                    name="cb-stop-mode"
                    checked={prefs.stopMode === "vol"}
                    onChange={() => updatePrefs({ stopMode: "vol" })}
                  />
                  Volatility (2σ)
                </label>
                <label>
                  <input
                    type="radio"
                    name="cb-stop-mode"
                    checked={prefs.stopMode === "fixed"}
                    onChange={() => updatePrefs({ stopMode: "fixed" })}
                  />
                  Fixed %
                </label>
              </div>
            </div>
            {prefs.stopMode === "fixed" && (
              <label className="cb-field">
                <span>Stop distance (%)</span>
                <input
                  type="number"
                  min={0.5}
                  max={50}
                  step={0.5}
                  value={prefs.stopPct}
                  onChange={(e) => updatePrefs({ stopPct: Math.min(50, Math.max(0.5, Number(e.target.value) || 0.5)) })}
                />
              </label>
            )}
          </div>

          {ticket && "stopNote" in ticket && ticket.stopNote && (
            <p className="cb-error">{ticket.stopNote}</p>
          )}
          {ticket && "size" in ticket && ticket.size && (
            <div className="cb-ticket-result">
              <span>Entry <b>{formatPrice(ticket.entry, selected.symbol)}</b></span>
              <span>Stop <b>{formatPrice(ticket.stop, selected.symbol)}</b></span>
              <span>Target <b>{formatPrice(ticket.target, selected.symbol)}</b></span>
              <span>Shares <b>{ticket.size.shares.toLocaleString()}</b></span>
              <span>Position <b>${ticket.size.positionValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}</b></span>
              <span>Risk <b>${ticket.size.riskBudget.toLocaleString("en-US", { maximumFractionDigits: 0 })}</b></span>
              <span>
                Reward:risk{" "}
                <b>{ticket.rMultiple === null ? "—" : `${ticket.rMultiple.toFixed(2)}:1`}</b>
              </span>
            </div>
          )}
          {ticket && "size" in ticket && ticket.size && ticket.size.shares <= 0 && (
            <p className="cb-error">Risk budget buys zero shares at this stop distance — raise equity or risk %, or tighten the stop.</p>
          )}

          <div className="cb-ticket-actions">
            <button
              className="cb-place-btn"
              disabled={placing || !ticket || !("size" in ticket) || !ticket.size || ticket.size.shares <= 0}
              onClick={placeOrder}
            >
              {placing ? "Placing…" : "Place paper trade"}
            </button>
            <button className="cb-refresh-btn" onClick={() => onOpenStock(selected.symbol)}>
              Open {selected.symbol} detail
            </button>
          </div>
          {placeResult && (
            <p className={placeResult.ok ? "cb-success" : "cb-error"}>{placeResult.message}</p>
          )}
          <p className="cb-how">
            How this ticket works: the stop is either 2× the stock&rsquo;s own trailing 20-day daily volatility below
            entry (wider for choppier names) or your fixed % — your pick. Shares are sized so a stop-out loses no more
            than your risk % of equity. The profit target is your % above entry; reward:risk tells you what a win pays
            relative to a stop-out.
          </p>
        </div>
      )}

      {data && data.candidates.length === 0 && !loading && (
        <p className="cb-empty">
          No matches with the current filters ({filterSummary}).{" "}
          {data.excludedForDataGap > 0
            ? `${data.excludedForDataGap} symbol(s) dropped but have incomplete data right now rather than a failed quality check — try again in a few minutes, or open one directly.`
            : data.excludedForQuality > 0
              ? `${data.excludedForQuality} symbol(s) dropped but didn't clear the quality bar.`
              : "Nothing dropped enough today to reach the screen."}{" "}
          Try loosening a filter above, or <button className="cb-link-btn" onClick={refresh}>re-run the screen</button>.
        </p>
      )}

      {data && data.candidates.length > 0 && (
        <>
          <ul className="cb-list">
            {data.candidates.map((c) => (
              <li key={c.symbol} className="cb-row">
                <div className="cb-row-top">
                  <button className="cb-symbol" onClick={() => onOpenStock(c.symbol)}>
                    {c.symbol}
                  </button>
                  <span className="cb-name">{c.name}</span>
                  <span className={`cb-change ${changeDirection(c.changePct)}`}>
                    {formatChangePercent(c.changePct)}
                    {c.zScore !== null && <span className="cb-zscore"> ({c.zScore.toFixed(1)}σ)</span>}
                  </span>
                  <span className="cb-price">{formatPrice(c.price, c.symbol)}</span>
                  <button
                    className={`cb-config-btn${selectedSymbol === c.symbol ? " active" : ""}`}
                    onClick={() => selectCandidate(c.symbol)}
                  >
                    {selectedSymbol === c.symbol ? "Configuring…" : "Configure trade"}
                  </button>
                </div>
                <div className="cb-row-meta">
                  <span className={`cb-verdict ${verdictTone(c.financialsVerdict)}`}>
                    Fundamentals: {c.financialsVerdict} ({c.financialsScore.toFixed(1)}/5)
                  </span>
                  <span className={`cb-verdict ${verdictTone(c.valuationVerdict)}`}>
                    Valuation: {c.valuationVerdict} ({c.valuationScore.toFixed(1)}/5)
                  </span>
                  <span className={`cb-verdict ${verdictTone(c.technicalsVerdict)}`}>
                    Technicals: {c.technicalsVerdict} ({c.technicalsScore.toFixed(1)}/5)
                  </span>
                  <span className="cb-offhigh">Off day high {formatChangePercent(c.offHighPct)}</span>
                  {c.peerValuation && (
                    <span className="cb-verdict cb-peer">
                      vs. {c.layer} peers: {ordinal(c.peerValuation.percentile)} pct on {c.peerValuation.metric} (
                      {c.peerValuation.value.toFixed(1)}x)
                    </span>
                  )}
                </div>
                <ul className="cb-reasons">
                  {c.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
                {c.topHeadline ? (
                  <p className="cb-headline">
                    <a href={c.topHeadline.url} target="_blank" rel="noopener noreferrer">
                      {c.topHeadline.headline}
                    </a>
                    <span className="cb-headline-source">
                      {" "}
                      — {c.topHeadline.source} · {formatTimestamp(c.topHeadline.datetime)}
                    </span>
                  </p>
                ) : (
                  <p className="cb-headline cb-headline-empty">No recent trusted headline found for {c.symbol}.</p>
                )}
              </li>
            ))}
          </ul>
          <button className="cb-refresh-btn" onClick={refresh}>Re-run the screen</button>
        </>
      )}
    </div>
  );
}
