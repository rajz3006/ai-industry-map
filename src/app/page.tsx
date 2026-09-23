import IndustryMap from "@/components/IndustryMap";
import { fetchQuoteMap } from "@/lib/serverQuotes";
import { fetchEarningsMap } from "@/lib/serverEarnings";
import { allUSSymbols } from "@/data/tickers";

// Prices/earnings are live data — never let Next.js bake a stale snapshot into a static
// build. Always render this page fresh on the server.
export const dynamic = "force-dynamic";

// Kept outside the component body so the direct Date.now() call site isn't inside a
// function the linter treats as a component render (react-hooks/purity) — this runs once
// per request on the server, not during a client re-render, so an impure timestamp is fine.
function currentTimestamp(): number {
  return Date.now();
}

// A full ~57-symbol batch shares the same process-wide Finnhub rate limiter as every other
// route (see lib/finnhub.ts), and quotes only cache for 10s — so under load, or on a cold
// cache, this can legitimately take well over a minute. The seed is a nice-to-have (skips
// the client's cold-load "Loading prices…" flash), never something worth blocking the page
// response on, so it's raced against a short deadline: fast enough, use it; otherwise skip
// it and let the client hooks fetch from scratch exactly as they already do without a seed.
const SEED_TIMEOUT_MS = 2_500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`seed fetch exceeded ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export default async function Home() {
  const fetchedAt = currentTimestamp();
  const [quotesResult, earningsResult] = await Promise.allSettled([
    withTimeout(fetchQuoteMap(allUSSymbols), SEED_TIMEOUT_MS),
    withTimeout(fetchEarningsMap(allUSSymbols), SEED_TIMEOUT_MS),
  ]);

  // If either call throws or times out, fall back to no seed rather than failing or
  // slowing the page render — the client hooks already know how to fetch from scratch.
  const quotesSeed =
    quotesResult.status === "fulfilled" ? { quotes: quotesResult.value, lastUpdatedAt: fetchedAt } : undefined;
  const earningsSeed =
    earningsResult.status === "fulfilled"
      ? { earnings: earningsResult.value, lastUpdatedAt: fetchedAt }
      : undefined;

  return <IndustryMap quotesSeed={quotesSeed} earningsSeed={earningsSeed} />;
}
