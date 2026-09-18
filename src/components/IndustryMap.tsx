"use client";

import { useState } from "react";
import { edges, nodes } from "@/data/industry-map";
import { allUSSymbols } from "@/data/tickers";
import { useQuotes } from "@/hooks/useQuotes";
import { POLL_OPTIONS, usePollingInterval } from "@/hooks/usePollingInterval";
import { formatPollLabel } from "@/lib/format";
import NetworkGraph from "./NetworkGraph";
import MobileMap from "./MobileMap";
import Dossier from "./Dossier";
import MoneyLoops from "./MoneyLoops";
import Fragility from "./Fragility";
import MarketsTable from "./MarketsTable";
import StockDetail from "./StockDetail";

type View = "network" | "loops" | "risks" | "markets";

const TABS: { view: View; label: string }[] = [
  { view: "network", label: "Value chain" },
  { view: "loops", label: "Money loops" },
  { view: "risks", label: "Fragility" },
  { view: "markets", label: "Markets" },
];

export default function IndustryMap() {
  const [view, setView] = useState<View>("network");
  const [selected, setSelected] = useState<string | null>("apple");
  const [search, setSearch] = useState("");
  const [stockSymbol, setStockSymbol] = useState<string | null>(null);
  const [pollMs, setPollMs] = usePollingInterval();

  // One shared poll covering every US-listed symbol in the map, used by the network graph,
  // dossier panel and Markets table alike — avoids duplicate polling loops and means every
  // node's ticker badge (not just the selected one) reflects a live change%.
  const { quotes } = useQuotes(allUSSymbols, pollMs);

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
          <h1>Who pays whom — and what breaks first</h1>
        </div>
        <p className="dek">
          The AI economy is not a neat stack. It is a web of <strong>capital, compute commitments, chip supply and
          power constraints</strong> concentrated in a few hands. Follow the links, then inspect the pressure points.
        </p>
      </section>

      <section className="metrics" aria-label="Key concentration metrics">
        <div className="metric">
          <b>~$0.9T</b>
          <span>
            UBS-implied 2026 AI capex
            <br />
            (from $1.2T in 2027, +33%)
          </span>
        </div>
        <div className="metric">
          <b>73%</b>
          <span>
            TSMC share of global foundry
            <br />
            &gt;90% advanced logic (widely cited)
          </span>
        </div>
        <div className="metric">
          <b>~50%</b>
          <span>
            SK Hynix projected 2026
            <br />
            share of HBM
          </span>
        </div>
        <div className="metric">
          <b>94%</b>
          <span>
            ASML estimated share of
            <br />
            global lithography
          </span>
        </div>
      </section>

      <div className="context">
        <p>
          <strong>Read the map as dependency, not market share.</strong> Lines show reported commercial or capital
          relationships; thickness does not encode deal value. Dashed gold links are investment flows. Red links
          point toward power dependencies.
        </p>
        <span className="stamp">
          {nodes.length} selected nodes · {edges.length} reported links
        </span>
      </div>

      <nav className="toolbar" aria-label="Map view controls">
        <div className="toolbar-left">
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t.view}
                className={`tab ${view === t.view ? "active" : ""}`}
                onClick={() => setView(t.view)}
              >
                {t.label}
              </button>
            ))}
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
        <div className="map-shell">
          <div className="chart-side">
            <div className="map-head">
              <div>
                <h2>The dependency graph</h2>
                <p>Select a company to isolate its incoming and outgoing links.</p>
              </div>
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
            </div>
            <div className="desktop-map">
              <NetworkGraph selected={selected} onSelect={selectNode} search={search} quotes={quotes} />
            </div>
            <MobileMap onSelect={selectNode} quotes={quotes} />
          </div>
          <Dossier
            selected={selected}
            onSelect={selectNode}
            quotes={quotes}
            pollMs={pollMs}
            onOpenStock={setStockSymbol}
          />
        </div>
        <section className="chain">
          <div className="chain-head">
            <h2>One prompt, eight dependencies</h2>
            <p>A simplified physical route from model demand to electricity. Each hop can delay the one above it.</p>
          </div>
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
        </section>
      </section>

      <section className={`insight ${view === "loops" ? "active" : ""}`}>
        <MoneyLoops />
      </section>

      <section className={`insight ${view === "risks" ? "active" : ""}`}>
        <Fragility />
      </section>

      <section className={`insight ${view === "markets" ? "active" : ""}`}>
        {view === "markets" && (
          <MarketsTable quotes={quotes} pollMs={pollMs} onSelectNode={selectNode} onOpenStock={setStockSymbol} />
        )}
      </section>

      <section className="method">
        <div>
          <h2>How to use this map</h2>
          <p>
            Start with a model lab, then follow its cloud commitments into software, accelerators, foundries,
            memory, packaging, racks and power. Apple is mapped through Private Cloud Compute, Google Cloud, Nvidia
            GPUs and TSMC. This is a selected dependency graph rather than a complete company census. Nodes with
            &ldquo;reported,&rdquo; &ldquo;talks&rdquo; or &ldquo;estimate&rdquo; retain that caveat; unverified
            claims were removed.
          </p>
        </div>
        <div className="notes">
          <h2>Reporting basis</h2>
          <p>
            Relationship, ownership and concentration data ported from an independent six-domain cross-check
            (Sep 14–18, 2026 passes). Public-market prices are live, fetched from Finnhub&rsquo;s free-tier API
            (US-listed stocks and ADRs only) and refreshed every {formatPollLabel(pollMs)} — configurable from the
            toolbar.
            Foreign-listed names (Samsung, SK Hynix, SMIC, Cambricon, the Taiwan ODMs, Innolight, Eoptolink,
            SoftBank) are not covered by Finnhub&rsquo;s free tier and show a live-pricing-unavailable notice
            instead of a stale or fabricated number. See the Markets tab or any node&rsquo;s panel for exchange and
            ticker detail, and the project README for API and deployment notes.
          </p>
        </div>
      </section>

      {stockSymbol && <StockDetail symbol={stockSymbol} onClose={() => setStockSymbol(null)} />}
    </main>
  );
}
