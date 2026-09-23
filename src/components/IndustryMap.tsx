"use client";

import { useEffect, useState } from "react";
import { edges, nodes } from "@/data/industry-map";
import { allUSSymbols } from "@/data/tickers";
import { useQuotes } from "@/hooks/useQuotes";
import { useEarnings } from "@/hooks/useEarnings";
import { usePriceAlerts, describeAlert } from "@/hooks/usePriceAlerts";
import { POLL_OPTIONS, usePollingInterval } from "@/hooks/usePollingInterval";
import { useTheme } from "@/hooks/useTheme";
import { useNowTick } from "@/hooks/useNowTick";
import { formatPollLabel, formatRelativeTime } from "@/lib/format";
import NetworkGraph from "./NetworkGraph";
import MobileMap from "./MobileMap";
import Dossier from "./Dossier";
import MoneyLoops from "./MoneyLoops";
import Fragility from "./Fragility";
import MarketsTable from "./MarketsTable";
import MoversTable from "./MoversTable";
import OpportunitiesScreener from "./OpportunitiesScreener";
import EarningsCalendar from "./EarningsCalendar";
import StockDetail from "./StockDetail";
import AlertsPanel from "./AlertsPanel";

type View = "network" | "loops" | "risks" | "markets" | "movers" | "opportunities" | "calendar";

// "Who pays whom" and "What breaks first" live under one "AI Overview" top-level tab as
// sub-tabs, rather than each taking a top-level slot next to Markets/Movers/Calendar.
const OVERVIEW_VIEWS: View[] = ["loops", "risks"];
const OVERVIEW_DEFAULT: View = "loops";
const OVERVIEW_SUBTABS: { view: View; label: string }[] = [
  { view: "loops", label: "Who pays whom" },
  { view: "risks", label: "What breaks first" },
];

type TabDef =
  | { kind: "single"; view: View; label: string }
  | { kind: "group"; label: string; views: View[]; defaultView: View };

const TABS: TabDef[] = [
  { kind: "single", view: "network", label: "The Map" },
  { kind: "group", label: "AI Overview", views: OVERVIEW_VIEWS, defaultView: OVERVIEW_DEFAULT },
  { kind: "single", view: "markets", label: "Markets" },
  { kind: "single", view: "movers", label: "Daily movers" },
  { kind: "single", view: "opportunities", label: "Opportunities" },
  { kind: "single", view: "calendar", label: "Earnings calendar" },
];

export default function IndustryMap() {
  const [view, setView] = useState<View>("network");
  const [selected, setSelected] = useState<string | null>("apple");
  const [search, setSearch] = useState("");
  const [stockSymbol, setStockSymbol] = useState<string | null>(null);
  const [pollMs, setPollMs] = usePollingInterval();
  const [theme, setTheme] = useTheme();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertSymbol, setAlertSymbol] = useState<string | null>(null);

  // Escape closes the topmost overlay first (alerts panel, then stock drawer).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (alertsOpen) setAlertsOpen(false);
      else setStockSymbol(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alertsOpen]);

  // One shared poll covering every US-listed symbol in the map, used by the network graph,
  // dossier panel and Markets table alike — avoids duplicate polling loops and means every
  // node's ticker badge (not just the selected one) reflects a live change%.
  const { quotes, loading: quotesLoading, progress: quotesProgress, lastUpdatedAt } = useQuotes(
    allUSSymbols,
    pollMs
  );
  // Forces a re-render every ~10s purely so the "updated Xs/m ago" text below stays fresh.
  useNowTick(10_000);
  // Earnings calendars move slowly: one shared batch fetch, refreshed every 6 hours,
  // powering the "E {date}" labels on nodes, mobile cards and the dossier.
  const { earnings, loading: earningsLoading, lastUpdatedAt: earningsUpdatedAt } = useEarnings(allUSSymbols);
  // User-created, browser-local price alerts, evaluated against the shared quote poll.
  const alertApi = usePriceAlerts(quotes);

  function selectNode(id: string) {
    setSelected(id);
    setView("network");
  }

  return (
    <main className="wrap">
      <section className="mast">
        <div>
          <p className="edition">
            <span className="pulse" />
            Investigative map · live pricing via Finnhub
          </p>
          <h1>The AI industry, mapped and priced</h1>
        </div>
        <p className="dek">
          The AI economy is not a neat stack. It is a web of <strong>capital, compute, chips and power</strong>{" "}
          concentrated in a few hands. <strong>AI Overview</strong> traces who pays whom and what breaks first;{" "}
          <strong>Markets</strong>, <strong>Daily movers</strong> and the <strong>Earnings calendar</strong> track
          how that concentration is pricing in real time.
        </p>
      </section>

      <nav className="toolbar" aria-label="Map view controls">
        <div className="toolbar-left">
          <div className="tabs">
            {TABS.map((t) =>
              t.kind === "single" ? (
                <button
                  key={t.view}
                  className={`tab ${view === t.view ? "active" : ""}`}
                  onClick={() => setView(t.view)}
                >
                  {t.label}
                </button>
              ) : (
                <button
                  key={t.label}
                  className={`tab ${t.views.includes(view) ? "active" : ""}`}
                  onClick={() => setView(t.views.includes(view) ? view : t.defaultView)}
                >
                  {t.label}
                </button>
              )
            )}
          </div>
          <label className="poll-select">
            <span className="sr-only">Live price refresh interval</span>
            <select
              value={pollMs}
              onChange={(e) => setPollMs(Number(e.target.value))}
              aria-label="Live price refresh interval"
            >
              {POLL_OPTIONS.map((o) => (
                <option key={o.ms} value={o.ms}>
                  Refresh: {o.label}
                </option>
              ))}
            </select>
          </label>
          <span className="quote-status" role="status">
            {quotesLoading && quotesProgress.total > 0 ? (
              <>
                <span className="quote-status-dot" aria-hidden="true" />
                Loading prices… {quotesProgress.loaded}/{quotesProgress.total}
              </>
            ) : (
              <>Prices updated {formatRelativeTime(lastUpdatedAt)}</>
            )}
          </span>
          <button
            className="alerts-open"
            onClick={() => {
              setAlertSymbol(null);
              setAlertsOpen(true);
            }}
            aria-label={`Price alerts${alertApi.alerts.length ? `, ${alertApi.alerts.length} active` : ""}`}
          >
            🔔 Alerts{alertApi.alerts.filter((a) => !a.triggeredAt).length > 0 && (
              <span className="alerts-count">{alertApi.alerts.filter((a) => !a.triggeredAt).length}</span>
            )}
          </button>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M20.5 14.7A8.5 8.5 0 1 1 9.3 3.5a7 7 0 0 0 11.2 11.2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span>{theme === "dark" ? "Dark" : "Light"}</span>
          </button>
        </div>
        {view === "network" && (
          <label className="search">
            <span className="sr-only">Find a company</span>
            <input
              type="search"
              placeholder="Find a company…"
              aria-label="Find a company"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2" />
            </svg>
          </label>
        )}
      </nav>

      <section className={`insight ${view === "network" ? "active" : ""}`}>
        <details className="reading-guide">
          <summary>
            <b>How to read the columns</b>
            <span>One prompt, eight dependencies — each hop can delay the one above it.</span>
          </summary>
          <div className="route">
            {[
              ["Frontier lab", "model demand"],
              ["Cloud / neocloud", "compute contract"],
              ["GPU or XPU", "accelerator design"],
              ["EDA + software", "design and runtime moat"],
              ["HBM + packaging", "memory and CoWoS"],
              ["Foundry + EUV", "fabrication equipment"],
              ["ODM + rack", "system integration"],
              ["Power", "grid, gas or nuclear"],
            ].map(([b, s]) => (
              <div className="stop" key={b}>
                <div className="dot" />
                <b>{b}</b>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </details>
        <div className="map-shell">
          <div className="chart-side">
            <div className="map-head">
              <div>
                <h2>The dependency graph</h2>
                <p>
                  Lines show reported commercial or capital relationships — read as <b>dependency, not market
                  share</b>. Thickness does not encode deal value. Select a company to isolate its links.
                </p>
              </div>
              <div className="map-side">
                <div className="legend">
                  <span className="key" style={{ color: "var(--supply)" }}>
                    <i className="swatch" />
                    supply
                  </span>
                  <span className="key" style={{ color: "var(--money)" }}>
                    <i className="swatch dash" />
                    capital
                  </span>
                  <span className="key" style={{ color: "var(--partner)" }}>
                    <i className="swatch" />
                    customer / partner
                  </span>
                  <span className="key" style={{ color: "var(--power)" }}>
                    <i className="swatch" />
                    power
                  </span>
                </div>
                <span className="stamp">
                  {nodes.length} nodes · {edges.length} reported links
                </span>
              </div>
            </div>
            <div className="desktop-map">
              <NetworkGraph selected={selected} onSelect={selectNode} search={search} quotes={quotes} earnings={earnings} />
            </div>
            <MobileMap onSelect={selectNode} quotes={quotes} earnings={earnings} />
          </div>
          <Dossier
            selected={selected}
            onSelect={selectNode}
            quotes={quotes}
            earnings={earnings}
            pollMs={pollMs}
            onOpenStock={setStockSymbol}
          />
        </div>
      </section>

      <section className={`insight ${OVERVIEW_VIEWS.includes(view) ? "active" : ""}`}>
        <div className="subtabs" role="tablist" aria-label="AI Overview sections">
          {OVERVIEW_SUBTABS.map((t) => (
            <button
              key={t.view}
              role="tab"
              aria-selected={view === t.view}
              className={`subtab ${view === t.view ? "active" : ""}`}
              onClick={() => setView(t.view)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {view === "loops" && <MoneyLoops />}
        {view === "risks" && <Fragility onSelectNode={selectNode} />}
      </section>

      <section className={`insight ${view === "markets" ? "active" : ""}`}>
        {view === "markets" && (
          <MarketsTable
            quotes={quotes}
            pollMs={pollMs}
            loading={quotesLoading}
            lastUpdatedAt={lastUpdatedAt}
            onSelectNode={selectNode}
            onOpenStock={setStockSymbol}
          />
        )}
      </section>

      <section className={`insight ${view === "movers" ? "active" : ""}`}>
        {view === "movers" && (
          <MoversTable earnings={earnings} onSelectNode={selectNode} onOpenStock={setStockSymbol} />
        )}
      </section>

      <section className={`insight ${view === "opportunities" ? "active" : ""}`}>
        {view === "opportunities" && (
          <OpportunitiesScreener onSelectNode={selectNode} onOpenStock={setStockSymbol} />
        )}
      </section>

      <section className={`insight ${view === "calendar" ? "active" : ""}`}>
        {view === "calendar" && (
          <EarningsCalendar
            earnings={earnings}
            loading={earningsLoading}
            lastUpdatedAt={earningsUpdatedAt}
            onOpenStock={setStockSymbol}
          />
        )}
      </section>

      <section className="method">
        <h2>About the data</h2>
        <p>
          A selected dependency graph, not a company census. Lines show reported commercial or capital
          relationships; relationship, ownership and concentration figures reflect an independent six-domain
          cross-check (Sep 14–18, 2026). Nodes marked &ldquo;reported,&rdquo; &ldquo;talks&rdquo; or
          &ldquo;estimate&rdquo; retain that caveat; unverified claims were removed.
        </p>
        <p>
          Public-market prices are live via Finnhub&rsquo;s free-tier API (US-listed stocks and ADRs only),
          refreshed every {formatPollLabel(pollMs)} — configurable in the toolbar. Foreign-listed names
          (Samsung, SK Hynix, SMIC, Cambricon, the Taiwan ODMs, Innolight, Eoptolink, SoftBank) show a
          live-pricing-unavailable notice instead of a stale or fabricated number.
        </p>
      </section>

      {stockSymbol && (
        <StockDetail
          symbol={stockSymbol}
          onClose={() => setStockSymbol(null)}
          onSetAlert={(sym) => {
            setAlertSymbol(sym);
            setAlertsOpen(true);
          }}
        />
      )}
      <AlertsPanel
        key={`alerts-${alertsOpen}-${alertSymbol ?? "none"}`}
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        initialSymbol={alertSymbol}
        quotes={quotes}
        alerts={alertApi.alerts}
        fired={alertApi.fired}
        addAlert={alertApi.addAlert}
        removeAlert={alertApi.removeAlert}
        clearFired={alertApi.clearFired}
      />
      {alertApi.fired.length > 0 && (
        <div className="toast-stack" aria-live="polite">
          {alertApi.fired.slice(0, 3).map((a) => (
            <div className="toast" key={a.id}>
              <b>🔔 {a.symbol}</b> is {describeAlert(a)}
              <button onClick={() => alertApi.clearFired(a.id)} aria-label="Dismiss">×</button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
