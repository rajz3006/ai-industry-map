"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { nodeById } from "@/data/industry-map";
import { allTickerRows } from "@/data/tickers";
import type { QuoteMap } from "@/hooks/useQuotes";
import { formatPrice } from "@/lib/format";
import { STEP_NAMES, type EvaluationResult, type StepNumber, type StepVerdict } from "@/lib/evaluation/types";

type SortKey = "name" | "layer" | "symbol" | "price" | "composite" | "verdict";

type CacheEntry = EvaluationResult | "loading" | "error";

// The bulk endpoint (GET /api/evaluate, no `symbol`) returns a lighter row per symbol — a fast
// "preview" composite that skips Step 5's expensive insider cluster-buy check (see
// src/app/api/evaluate/route.ts and src/lib/evaluation/score.ts's `fast` mode) so all 57 rows
// can populate eagerly on mount instead of waiting on a per-row click.
type BulkRow = Pick<EvaluationResult, "symbol" | "compositeScore" | "compositeVerdict" | "riskReward" | "asOf">;
type BulkStatus = "loading" | "ready" | "error";

/** Pure fetch+parse for the bulk endpoint — no setState here, so both the mount effect and the
 * Retry button's handler can call it and apply their own state transitions around it. */
async function fetchBulkRows(): Promise<Record<string, BulkRow>> {
  const res = await fetch("/api/evaluate");
  if (!res.ok) throw new Error(`status ${res.status}`);
  const body = (await res.json()) as BulkRow[];
  const map: Record<string, BulkRow> = {};
  for (const row of body) map[row.symbol] = row;
  return map;
}

// Higher rank sorts first when sorting verdict "high to low" — mirrors the strong>good>...
// ordering `verdictFromScore` already encodes by score threshold.
const VERDICT_RANK: Record<StepVerdict, number> = {
  strong: 5,
  good: 4,
  neutral: 3,
  weak: 2,
  poor: 1,
  unknown: 0,
};

const VERDICT_LABEL: Record<StepVerdict, string> = {
  strong: "Strong",
  good: "Good",
  neutral: "Neutral",
  weak: "Weak",
  poor: "Poor",
  unknown: "Unknown",
};

/** Same 3-bucket coloring the task spec calls for: green >= 3.5, amber 2.5-3.5, red < 2.5. */
function scoreTone(score: number): "up" | "mid" | "down" {
  if (score >= 3.5) return "up";
  if (score >= 2.5) return "mid";
  return "down";
}

const STEP_ORDER: StepNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];

export default function StockEvaluator({
  quotes,
  onOpenStock,
}: {
  quotes: QuoteMap;
  onOpenStock?: (symbol: string) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "composite", dir: -1 });
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [evalCache, setEvalCache] = useState<Record<string, CacheEntry>>({});
  const [activeStep, setActiveStep] = useState<StepNumber>(1);
  const [bulk, setBulk] = useState<Record<string, BulkRow>>({});
  const [bulkStatus, setBulkStatus] = useState<BulkStatus>("loading");

  // One row per distinct US-listed symbol (57 of them) — allTickerRows has a row per
  // node that references a ticker, so the same symbol (e.g. MSFT via both "azure" and
  // "microsoftai") can appear more than once; dedupe the same way CatalystRadar's
  // upcoming-earnings list does, keeping the first node's name/category as the label.
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const list: { symbol: string; nodeId: string; name: string; layer: string }[] = [];
    for (const r of allTickerRows) {
      if (!r.isUS || seen.has(r.symbol)) continue;
      seen.add(r.symbol);
      const n = nodeById[r.nodeId];
      list.push({ symbol: r.symbol, nodeId: r.nodeId, name: n?.name ?? r.nodeId, layer: n?.layer ?? "Other" });
    }
    return list;
  }, []);

  async function fetchEvaluation(symbol: string) {
    setEvalCache((prev) => ({ ...prev, [symbol]: "loading" }));
    try {
      const res = await fetch(`/api/evaluate?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = (await res.json()) as EvaluationResult;
      setEvalCache((prev) => ({ ...prev, [symbol]: body }));
    } catch {
      setEvalCache((prev) => ({ ...prev, [symbol]: "error" }));
    }
  }

  async function fetchBulk() {
    setBulkStatus("loading");
    try {
      const map = await fetchBulkRows();
      setBulk(map);
      setBulkStatus("ready");
    } catch {
      setBulkStatus("error");
    }
  }

  // Fetch-on-mount, same pattern as useOpportunities/useMovers/useFilings: the state-setting
  // async work is declared inline inside the effect (with a `cancelled` guard) rather than
  // calling the outer `fetchBulk` (which exists for the Retry button's onClick) directly, since
  // a component-scope function that itself calls setState shouldn't be invoked synchronously
  // from an effect body.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setBulkStatus("loading");
      try {
        const map = await fetchBulkRows();
        if (cancelled) return;
        setBulk(map);
        setBulkStatus("ready");
      } catch {
        if (!cancelled) setBulkStatus("error");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleExpand(symbol: string) {
    if (expandedSymbol === symbol) {
      setExpandedSymbol(null);
      return;
    }
    setExpandedSymbol(symbol);
    setActiveStep(1);
    if (!evalCache[symbol]) fetchEvaluation(symbol);
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => ({ key, dir: prev.key === key ? ((-prev.dir) as 1 | -1) : -1 }));
  }

  function resultFor(symbol: string): EvaluationResult | null {
    const entry = evalCache[symbol];
    return entry && entry !== "loading" && entry !== "error" ? entry : null;
  }

  /** Score/Verdict columns prefer a full single-symbol detail result (once a row's been
   * expanded) and fall back to the bulk/fast preview composite otherwise, so every row shows
   * something as soon as the bulk fetch resolves instead of staying on a placeholder until
   * clicked. */
  function compositeFor(symbol: string): { compositeScore: number; compositeVerdict: StepVerdict } | null {
    const full = resultFor(symbol);
    if (full) return full;
    const row = bulk[symbol];
    return row ? { compositeScore: row.compositeScore, compositeVerdict: row.compositeVerdict } : null;
  }

  const sorted = useMemo(() => {
    const copy = rows.slice();
    copy.sort((a, b) => {
      const qa = quotes[a.symbol];
      const qb = quotes[b.symbol];
      const liveA = qa && !("error" in qa) ? qa : undefined;
      const liveB = qb && !("error" in qb) ? qb : undefined;
      const compA = compositeFor(a.symbol);
      const compB = compositeFor(b.symbol);

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
        case "symbol":
          av = a.symbol;
          bv = b.symbol;
          break;
        case "price":
          av = liveA?.price;
          bv = liveB?.price;
          break;
        case "composite":
          av = compA?.compositeScore;
          bv = compB?.compositeScore;
          break;
        case "verdict":
          av = compA ? VERDICT_RANK[compA.compositeVerdict] : undefined;
          bv = compB ? VERDICT_RANK[compB.compositeVerdict] : undefined;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resultFor/compositeFor close over evalCache/bulk already in deps
  }, [rows, quotes, evalCache, bulk, sort]);

  return (
    <div className="ev-wrap">
      <div className="ev-head">
        <div>
          <h2>Stock Evaluator</h2>
          <p>
            An 8-step framework — moat, industry cycle, statement quality, valuation, management,
            technicals, news context, and a composite risk/reward read — scored 0-5 per step for
            every tracked symbol. Click a row to run (or review) its full breakdown.
          </p>
          <p className="ev-section-note">
            Score and Verdict below are a fast preview (6 of 8 steps — the insider cluster-buy
            check is skipped for speed). Click a row for the full 8-step evaluation, including
            insider activity.
          </p>
        </div>
      </div>

      {bulkStatus === "error" && (
        <p className="ev-error">
          Couldn&rsquo;t load preview scores.{" "}
          <button className="ev-retry" onClick={fetchBulk}>
            Retry
          </button>
        </p>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="ev-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("name")}>Company</th>
              <th onClick={() => toggleSort("layer")}>Category</th>
              <th onClick={() => toggleSort("symbol")}>Ticker</th>
              <th className="num" onClick={() => toggleSort("price")}>
                Price
              </th>
              <th className="num" onClick={() => toggleSort("composite")}>
                Score
              </th>
              <th onClick={() => toggleSort("verdict")}>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const q = quotes[r.symbol];
              const live = q && !("error" in q) ? q : undefined;
              const entry = evalCache[r.symbol];
              const result = resultFor(r.symbol);
              const comp = compositeFor(r.symbol);
              const expanded = expandedSymbol === r.symbol;
              return (
                <Fragment key={r.symbol}>
                  <tr className={`ev-row ${expanded ? "expanded" : ""}`} onClick={() => toggleExpand(r.symbol)}>
                    <td
                      className="co"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenStock?.(r.symbol);
                      }}
                    >
                      {r.name}
                    </td>
                    <td className="exch">{r.layer}</td>
                    <td>{r.symbol}</td>
                    <td className="num">
                      {typeof live?.price === "number" ? (
                        formatPrice(live.price, r.symbol)
                      ) : (
                        <span className="exch">{q ? "unavailable" : "loading…"}</span>
                      )}
                    </td>
                    <td className="num">
                      {comp ? (
                        <span className={`ev-score-badge ${scoreTone(comp.compositeScore)}`}>
                          {comp.compositeScore.toFixed(1)}
                        </span>
                      ) : entry === "loading" || bulkStatus === "loading" ? (
                        <span className="ev-score-pending">…</span>
                      ) : entry === "error" || bulkStatus === "error" ? (
                        <span className="ev-score-pending ev-error-text">error</span>
                      ) : (
                        <span className="ev-score-pending">—</span>
                      )}
                    </td>
                    <td>
                      {comp ? (
                        <span className={`ev-verdict-badge ${comp.compositeVerdict}`}>
                          {VERDICT_LABEL[comp.compositeVerdict]}
                        </span>
                      ) : (
                        <span className="ev-score-pending">
                          {entry === "loading"
                            ? "evaluating…"
                            : bulkStatus === "loading"
                              ? "loading preview…"
                              : bulkStatus === "error"
                                ? "preview failed"
                                : "n/a"}
                        </span>
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="ev-detail-row">
                      <td colSpan={6}>
                        {entry === "loading" && <p className="ev-loading">Running the 8-step evaluation for {r.symbol}…</p>}
                        {entry === "error" && (
                          <p className="ev-error">
                            Couldn&rsquo;t evaluate {r.symbol}.{" "}
                            <button
                              className="ev-retry"
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchEvaluation(r.symbol);
                              }}
                            >
                              Retry
                            </button>
                          </p>
                        )}
                        {!entry && <p className="ev-loading">Preparing evaluation for {r.symbol}…</p>}
                        {result && (
                          <EvaluationDetail
                            result={result}
                            activeStep={activeStep}
                            onStepSelect={setActiveStep}
                          />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EvaluationDetail({
  result,
  activeStep,
  onStepSelect,
}: {
  result: EvaluationResult;
  activeStep: StepNumber;
  onStepSelect: (step: StepNumber) => void;
}) {
  const step = result.steps.find((s) => s.step === activeStep) ?? result.steps[0];

  return (
    <div className="ev-expand">
      <div className="ev-composite">
        <span className={`ev-score-badge lg ${scoreTone(result.compositeScore)}`}>
          {result.compositeScore.toFixed(1)}
        </span>
        <div className="ev-composite-meta">
          <span className={`ev-verdict-badge ${result.compositeVerdict}`}>
            {VERDICT_LABEL[result.compositeVerdict]}
          </span>
          <span className="ev-asof">Composite score · as of {new Date(result.asOf).toLocaleString("en-US")}</span>
        </div>
        {result.riskReward && (
          <div className="ev-rr">
            <span>
              Entry <b>${result.riskReward.entry.toFixed(2)}</b>
            </span>
            <span>
              Target <b>${result.riskReward.target.toFixed(2)}</b>
            </span>
            <span>
              Stop <b>${result.riskReward.stop.toFixed(2)}</b>
            </span>
            <span>
              R:R <b>{result.riskReward.ratio.toFixed(2)}x</b>
            </span>
          </div>
        )}
      </div>
      {result.riskReward && <p className="ev-rr-note">{result.riskReward.note}</p>}
      {result.dataWarnings.length > 0 && (
        <ul className="ev-warnings">
          {result.dataWarnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <div className="ev-stepper" role="tablist" aria-label="Evaluation steps">
        {STEP_ORDER.map((n) => {
          const s = result.steps.find((x) => x.step === n);
          if (!s) return null;
          return (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={activeStep === n}
              className={`ev-step-btn ${activeStep === n ? "active" : ""} ${s.verdict}`}
              onClick={(e) => {
                e.stopPropagation();
                onStepSelect(n);
              }}
            >
              <span className="ev-step-num">{n}</span>
              <span className="ev-step-label">{STEP_NAMES[n]}</span>
            </button>
          );
        })}
      </div>

      {step && (
        <div className="ev-step-detail">
          <div className="ev-step-detail-head">
            <h4>
              Step {step.step} · {STEP_NAMES[step.step]}
            </h4>
            <span className={`ev-verdict-badge ${step.verdict}`}>{VERDICT_LABEL[step.verdict]}</span>
            <span className={`ev-score-badge ${scoreTone(step.score)}`}>{step.score.toFixed(1)}</span>
          </div>
          <p className="ev-step-summary">{step.summary}</p>
          {step.metrics.length > 0 && (
            <ul className="ev-metrics">
              {step.metrics.map((m) => (
                <li key={m.label} className="ev-metric-row">
                  <span className="ev-metric-label">{m.label}</span>
                  <span className="ev-metric-value">{m.value}</span>
                  {m.note && <span className="ev-metric-note">{m.note}</span>}
                </li>
              ))}
            </ul>
          )}
          {step.sources.length > 0 && (
            <p className="ev-sources">
              Sources:{" "}
              {step.sources.map((s, i) => (
                <span key={s}>
                  {i > 0 && " · "}
                  {/^https?:\/\//.test(s) ? (
                    <a href={s} target="_blank" rel="noopener noreferrer">
                      {s}
                    </a>
                  ) : (
                    s
                  )}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
