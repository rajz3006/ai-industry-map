import { NextResponse } from "next/server";
import { AlpacaError } from "@/lib/alpaca";
import { allTickerRows } from "@/data/tickers";
import { edges } from "@/data/industry-map";
import { cacheGet, cacheSet, finnhubGet, FinnhubError, getFinnhubKey } from "@/lib/finnhub";
import { loadBarSet, nodeMeta } from "@/lib/moversData";

// Trailing window for the "normal volatility" baseline a z-score is measured against.
// 20 trading sessions (~1 calendar month) is a common short-window vol convention and
// matches the daily-return cadence this route already has from the shared bar cache.
const VOL_WINDOW = 20;
const MIN_CLOSES_REQUIRED = VOL_WINDOW + 1; // need 20 daily returns => 21 closes
// Never spend the shared Finnhub rate-limit budget fetching price targets for every
// symbol — only the names the z-score actually flagged as unusual are worth the calls.
const PRICE_TARGET_CANDIDATES = 25;
const PRICE_TARGET_CACHE_TTL_MS = 18 * 60 * 60_000; // analyst targets move slowly

export interface PriceTarget {
  mean: number;
  high: number;
  low: number;
}

export interface OpportunityRow {
  symbol: string;
  nodeId: string;
  name: string;
  layer: string;
  isUS: boolean;
  price: number;
  changePercent: number;
  trailingStdDevPct: number | null;
  zScore: number | null;
  edgeCount: number;
  priceTarget: PriceTarget | null;
  upsidePct: number | null;
}

export interface OpportunitiesResponse {
  asOfDate: string;
  priceTargetsAvailable: boolean;
  rows: OpportunityRow[];
}

interface FinnhubPriceTarget {
  targetMean?: number;
  targetHigh?: number;
  targetLow?: number;
  symbol?: string;
}

/** Count of edges (either direction) touching this node — a cheap, static proxy for how
 * structurally load-bearing a node is in the dependency graph, computed once per request. */
function buildEdgeCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of edges) {
    counts.set(e.from, (counts.get(e.from) ?? 0) + 1);
    counts.set(e.to, (counts.get(e.to) ?? 0) + 1);
  }
  return counts;
}

function stddev(returns: number[]): number {
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

export async function GET() {
  try {
    const { bySymbol, dates } = await loadBarSet();
    if (dates.length < 2) {
      return NextResponse.json({ error: "Not enough historical bar data available yet" }, { status: 503 });
    }
    const asOfDate = dates[dates.length - 1];
    const edgeCounts = buildEdgeCounts();

    const rows: OpportunityRow[] = [];
    const seenSymbols = new Set<string>();
    for (const row of allTickerRows) {
      if (!row.isUS || seenSymbols.has(row.symbol)) continue;
      const bars = bySymbol.get(row.symbol);
      if (!bars || bars.length === 0) continue;
      seenSymbols.add(row.symbol);

      // Sorted ascending by loadBarSet(); take the trailing window ending at the latest bar.
      const closes = bars.map((b) => b.c);
      const latest = closes[closes.length - 1];
      const prev = closes[closes.length - 2];
      if (typeof latest !== "number" || typeof prev !== "number" || prev === 0) continue;
      const changePercent = ((latest - prev) / prev) * 100;

      let trailingStdDevPct: number | null = null;
      let zScore: number | null = null;
      if (closes.length >= MIN_CLOSES_REQUIRED) {
        const window = closes.slice(-MIN_CLOSES_REQUIRED);
        const dailyReturns: number[] = [];
        for (let i = 1; i < window.length; i++) {
          if (window[i - 1] === 0) continue;
          dailyReturns.push(((window[i] - window[i - 1]) / window[i - 1]) * 100);
        }
        if (dailyReturns.length >= VOL_WINDOW - 2) {
          const sd = stddev(dailyReturns);
          trailingStdDevPct = sd;
          zScore = sd > 0 ? changePercent / sd : null;
        }
      }

      const { name, layer } = nodeMeta(row.nodeId);
      rows.push({
        symbol: row.symbol,
        nodeId: row.nodeId,
        name,
        layer,
        isUS: row.isUS,
        price: latest,
        changePercent,
        trailingStdDevPct,
        zScore,
        edgeCount: edgeCounts.get(row.nodeId) ?? 0,
        priceTarget: null,
        upsidePct: null,
      });
    }

    rows.sort((a, b) => {
      const za = a.zScore === null ? -1 : Math.abs(a.zScore);
      const zb = b.zScore === null ? -1 : Math.abs(b.zScore);
      return zb - za;
    });

    // Analyst price targets: Finnhub's free tier does not serve /stock/price-target (403s),
    // confirmed by direct probe. We still attempt it here (in case a deploy's key is on a
    // paid plan) but stop after the first 403 rather than burning the shared rate-limit
    // budget on calls that are certain to keep failing, and only ever try the top-|zScore|
    // subset — never all US symbols.
    const GATED_CACHE_KEY = "price-target:gated-on-this-plan";
    let priceTargetsAvailable = getFinnhubKey() !== null && !cacheGet<boolean>(GATED_CACHE_KEY);
    if (priceTargetsAvailable) {
      const candidates = rows.slice(0, PRICE_TARGET_CANDIDATES);
      for (const r of candidates) {
        if (!priceTargetsAvailable) break;
        const cacheKey = `price-target:${r.symbol}`;
        const cached = cacheGet<PriceTarget | null>(cacheKey);
        if (cached !== undefined) {
          if (cached) {
            r.priceTarget = cached;
            r.upsidePct = r.price > 0 ? ((cached.mean - r.price) / r.price) * 100 : null;
          }
          continue;
        }
        try {
          const pt = await finnhubGet<FinnhubPriceTarget>("/stock/price-target", { symbol: r.symbol });
          const value: PriceTarget | null =
            typeof pt.targetMean === "number" && pt.targetMean > 0
              ? { mean: pt.targetMean, high: pt.targetHigh ?? pt.targetMean, low: pt.targetLow ?? pt.targetMean }
              : null;
          cacheSet(cacheKey, value, PRICE_TARGET_CACHE_TTL_MS);
          if (value) {
            r.priceTarget = value;
            r.upsidePct = r.price > 0 ? ((value.mean - r.price) / r.price) * 100 : null;
          }
        } catch (err) {
          if (err instanceof FinnhubError && err.status === 403) {
            // Gated on this plan (confirmed: Finnhub's free tier 403s on /stock/price-target).
            // Remember it for a while so future requests in this process don't burn a shared
            // rate-limit slot on a call that is certain to keep failing.
            priceTargetsAvailable = false;
            cacheSet(GATED_CACHE_KEY, true, PRICE_TARGET_CACHE_TTL_MS);
          }
          // Any other error: skip this symbol, keep going.
        }
      }
    }

    const response: OpportunitiesResponse = { asOfDate, priceTargetsAvailable, rows };
    return NextResponse.json(response);
  } catch (err) {
    const status = err instanceof AlpacaError ? err.status ?? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error computing opportunities" },
      { status }
    );
  }
}
