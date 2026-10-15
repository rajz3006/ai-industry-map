// Peer-relative valuation for the Stock Picker tab: Step 4's "is this price reasonable"
// read (scoreValuation.ts) uses fixed multiple bands (P/E < 15x "good", > 40x "bad") that
// penalize every structurally-expensive AI/chip name the same way, regardless of what its
// own peers trade at. This is a separate, additive signal — it does NOT change Step 4's
// verdict or score (that stays the documented methodology used across the whole app) — it
// just ranks a candidate's multiple against the other US-listed symbols in its own industry
// layer (Cloud & compute, Fabrication & links, etc.), so "cheap relative to something" has
// an actual peer group behind it instead of a one-size-fits-all band.

import { allTickerRows } from "@/data/tickers";
import { nodeMeta } from "@/lib/moversData";
import { mapWithConcurrency } from "@/lib/finnhub";
import { getFinnhubFundamentals } from "./finnhubFundamentals";
import { LIVE_FUNDAMENTALS_ONLY_OPTIONS } from "./types";

// Bounds worst-case Finnhub call volume: at most one layer-wide fetch per distinct layer
// touched by a request's candidates (cached 4h per symbol after that), not per candidate.
const MAX_PEERS_PER_LAYER = 15;
const LAYER_FETCH_CONCURRENCY = 4;
// Below this many peers with a usable reading, a percentile isn't a meaningful statistic.
const MIN_PEERS_FOR_SIGNAL = 4;

export interface LayerMultiples {
  peTTM: number | null;
  psTTM: number | null;
}

export interface PeerValuation {
  metric: "P/E" | "P/S";
  value: number;
  peerCount: number;
  /** How many peers trade at a richer multiple than this symbol. */
  cheaperThanCount: number;
  /** 0-100; higher = cheaper than a larger share of its own layer peers. */
  percentile: number;
}

/** Every distinct US-listed symbol tracked in `layer`, capped so one request can't fan out
 * to an unbounded peer set. Deterministic order (as tickers.ts lists them). */
export function layerPeerSymbols(layer: string): string[] {
  const seen = new Set<string>();
  const symbols: string[] = [];
  for (const t of allTickerRows) {
    if (!t.isUS || seen.has(t.symbol)) continue;
    if (nodeMeta(t.nodeId).layer !== layer) continue;
    seen.add(t.symbol);
    symbols.push(t.symbol);
    if (symbols.length >= MAX_PEERS_PER_LAYER) break;
  }
  return symbols;
}

/** Fetches P/E and P/S for every symbol in a layer (bounded, see layerPeerSymbols), reusing
 * getFinnhubFundamentals's own 4h per-symbol cache — cheap on any repeat call within that
 * window, and a cache hit outright for any symbol Step 4 already live-scored this request. */
export async function fetchLayerMultiples(layer: string): Promise<Map<string, LayerMultiples>> {
  const symbols = layerPeerSymbols(layer);
  const snapshot = new Map<string, LayerMultiples>();
  await mapWithConcurrency(symbols, LAYER_FETCH_CONCURRENCY, async (sym) => {
    try {
      const f = await getFinnhubFundamentals(sym, LIVE_FUNDAMENTALS_ONLY_OPTIONS);
      snapshot.set(sym, { peTTM: f?.peTTM ?? null, psTTM: f?.psTTM ?? null });
    } catch {
      snapshot.set(sym, { peTTM: null, psTTM: null });
    }
  });
  return snapshot;
}

/** Ranks `symbol` against the other entries in `snapshot` (its own layer). Prefers P/E —
 * matching scoreValuation.ts's own profitable/unprofitable split — falling back to P/S only
 * when the symbol itself has no trailing P/E (no earnings to anchor one). Returns null when
 * too few peers have a usable reading on the same metric for a percentile to mean anything. */
export function rankPeerValuation(symbol: string, snapshot: Map<string, LayerMultiples>): PeerValuation | null {
  const own = snapshot.get(symbol);
  if (!own) return null;

  function rank(metric: "P/E" | "P/S", value: number | null, pick: (m: LayerMultiples) => number | null): PeerValuation | null {
    if (value === null || value <= 0) return null;
    const peerValues: number[] = [];
    for (const [sym, m] of snapshot) {
      if (sym === symbol) continue;
      const v = pick(m);
      if (v !== null && v > 0) peerValues.push(v);
    }
    if (peerValues.length < MIN_PEERS_FOR_SIGNAL) return null;
    const cheaperThanCount = peerValues.filter((v) => v > value).length;
    return {
      metric,
      value,
      peerCount: peerValues.length,
      cheaperThanCount,
      percentile: Math.round((cheaperThanCount / peerValues.length) * 100),
    };
  }

  return rank("P/E", own.peTTM, (m) => m.peTTM) ?? rank("P/S", own.psTTM, (m) => m.psTTM);
}
