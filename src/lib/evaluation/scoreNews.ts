// Step 7: News & Market Context.
//
// Methodology per research_notes/.../step7_8_news_scoring.md: SEC filings sit at the top of the
// source-reliability ladder (legal liability for inaccuracy), so the primary score movers here
// are SEC EDGAR 8-K red-flag items (bankruptcy/debt-default/impairment/delisting/auditor-change/
// restatement — the same RED_FLAG_ITEMS list cited in reports/Stock evaluation framework
// metrics.md and already used by scripts/dip-stock-checklist.mjs) and the insider cluster-buy
// signal re-surfaced from Step 5. Finnhub /company-news is used only as a crude recency/coverage
// signal (article count) — this is explicitly NOT sentiment analysis, and the summary says so;
// headline text isn't scored for tone at all, since doing that honestly would need an NLP model
// this feature doesn't have.

import { cacheGet, cacheSet, finnhubGet, getFinnhubKey } from "@/lib/finnhub";
import { fetchRecentFilingsForSymbol } from "@/lib/secFilings";
import { getInsiderClusterSignal } from "./managementSignals";
import type { StepMetric } from "./types";
import { verdictFromScore } from "./types";
import type { StepComputation } from "./scoreFinancials";

const NEWS_COUNT_CACHE_TTL_MS = 45 * 60_000; // matches the API route's EvaluationResult cache TTL
const RED_FLAG_ITEMS = ["1.03", "2.04", "2.06", "3.01", "4.01", "4.02"];
const RED_FLAG_LABELS: Record<string, string> = {
  "1.03": "bankruptcy/receivership",
  "2.04": "debt default/acceleration",
  "2.06": "material impairment",
  "3.01": "delisting notice",
  "4.01": "auditor change",
  "4.02": "non-reliance/restatement",
};
const LOOKBACK_DAYS = 180;

interface FinnhubNewsItem {
  headline?: string;
  datetime?: number;
}

export async function scoreNews(symbol: string, opts: { fast: boolean } = { fast: false }): Promise<StepComputation> {
  const warnings: string[] = [];
  const metrics: StepMetric[] = [];
  const sources = new Set<string>();

  const sinceDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let filings: Awaited<ReturnType<typeof fetchRecentFilingsForSymbol>> = [];
  let filingsFailed = false;
  try {
    // 8-K only: this check never uses Form 4 data (filtered out below), so skip the per-filing
    // XML fetch fetchRecentFilingsForSymbol would otherwise do for Form 4s (see its header
    // comment) — that cost is wasted work for a check that only reads 8-K `items`.
    filings = await fetchRecentFilingsForSymbol(symbol, sinceDate, { forms: ["8-K"] });
  } catch {
    filingsFailed = true;
    warnings.push(`SEC EDGAR filings lookup failed for ${symbol}.`);
  }
  const redFlags = filings.filter(
    (f) => f.form === "8-K" && (f.items ?? "").split(",").some((it) => RED_FLAG_ITEMS.includes(it.trim()))
  );
  if (filings.length > 0 || !filingsFailed) sources.add("SEC EDGAR 8-K");

  let newsCount = 0;
  let newsFailed = false;
  const newsCacheKey = `eval:company-news-count:${symbol.toUpperCase()}`;
  if (getFinnhubKey()) {
    const cachedCount = cacheGet<number>(newsCacheKey);
    if (cachedCount !== undefined) {
      newsCount = cachedCount;
      sources.add("Finnhub /company-news");
    } else if (opts.fast) {
      // Fast/preview mode: same shared-rate-limit rationale as finnhubFundamentals.ts — don't
      // block a 57-symbol bulk pass on a live /company-news call per symbol. Use whatever's
      // already cached (from a prior full detail view or bulk pass) and otherwise skip.
      newsFailed = true;
      warnings.push(`Finnhub /company-news not yet cached for ${symbol} — skipped in preview mode to avoid the shared rate limit; see full detail.`);
    } else {
      try {
        const to = new Date().toISOString().slice(0, 10);
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const items = await finnhubGet<FinnhubNewsItem[]>("/company-news", { symbol, from, to });
        newsCount = Array.isArray(items) ? items.filter((it) => it.headline).length : 0;
        cacheSet(newsCacheKey, newsCount, NEWS_COUNT_CACHE_TTL_MS);
        sources.add("Finnhub /company-news");
      } catch {
        newsFailed = true;
        warnings.push(`Finnhub /company-news lookup failed for ${symbol}.`);
      }
    }
  } else {
    newsFailed = true;
    warnings.push("FINNHUB_API_KEY not set — Step 7 news-coverage count unavailable.");
  }

  // Fast/preview mode: this re-surfaces the same expensive per-Form-4 XML lookup Step 5 skips
  // (see scoreManagement.ts) — skip it here too rather than paying that cost twice per symbol.
  // Unlike Step 5, this is only a bonus signal within an otherwise-real step, so Step 7 itself
  // is NOT forced to "unknown" — it's just scored without the insider bonus.
  let insiderFailed = false;
  let insiderSkipped = false;
  const insider = opts.fast
    ? (() => {
        insiderSkipped = true;
        return { clusterBuy: false, buyCount90d: 0, details: "Insider cluster-buy check skipped in preview mode — see full detail for this symbol." };
      })()
    : await getInsiderClusterSignal(symbol).catch(() => {
        insiderFailed = true;
        return { clusterBuy: false, buyCount90d: 0, details: "Insider lookup failed." };
      });
  if (!insiderFailed && !insiderSkipped) sources.add("SEC EDGAR Form 4");
  if (insiderSkipped) warnings.push(`Insider cluster-buy re-surfacing skipped in Step 7 preview mode for ${symbol}.`);

  if (filingsFailed && newsFailed && insiderFailed) {
    return {
      score: 2.5,
      verdict: "unknown",
      summary: `No news or filings data was reachable for ${symbol} (SEC EDGAR and Finnhub both failed) — scored neutral rather than penalized for a provider outage.`,
      metrics: [],
      sources: [],
      warnings,
    };
  }

  let score = 2.5;
  const notes: string[] = [];

  metrics.push({
    label: "News articles (30d)",
    value: newsFailed ? "n/a" : String(newsCount),
    note: "recency/coverage count only — NOT a sentiment score; this feature has no headline-tone analysis",
    source: "Finnhub /company-news",
  });
  if (!newsFailed && newsCount === 0) {
    score -= 0.25;
    notes.push("no recent news coverage found — limited visibility either way");
  }

  metrics.push({
    label: "SEC 8-K red flags (180d)",
    value: redFlags.length === 0 ? "None" : `${redFlags.length}: ${redFlags.map((f) => `${f.filingDate} item ${f.items}`).join("; ")}`,
    note: "bankruptcy, debt default, impairment, delisting, auditor change, or restatement items",
    source: "SEC EDGAR 8-K",
  });
  if (redFlags.length > 0) {
    const flagNames = redFlags
      .flatMap((f) => (f.items ?? "").split(","))
      .map((it) => it.trim())
      .filter((it) => RED_FLAG_ITEMS.includes(it))
      .map((it) => RED_FLAG_LABELS[it] ?? it);
    const uniqueFlags = Array.from(new Set(flagNames));
    score -= Math.min(2.0, 1.5 + 0.5 * (redFlags.length - 1));
    notes.push(`SEC 8-K red flag(s) in the trailing ${LOOKBACK_DAYS}d: ${uniqueFlags.join(", ")}`);
  }

  metrics.push({
    label: "Insider cluster buy (90d, re-surfaced from Step 5)",
    value: insiderSkipped ? "Not checked (preview mode)" : insider.clusterBuy ? "Yes" : "No",
    note: insider.details,
    source: "SEC EDGAR Form 4",
  });
  if (insider.clusterBuy) {
    score += 1.0;
    notes.push("insider cluster buy is a bullish context signal (see Step 5 for detail)");
  }

  score = Math.max(0, Math.min(5, Math.round(score * 10) / 10));
  const verdict = verdictFromScore(score);
  const summary =
    `${symbol}'s news/context read is ${verdict} (${score.toFixed(1)}/5)` +
    (notes.length ? ` — ${notes.join("; ")}.` : ".") +
    " News coverage here is a recency/volume count, not sentiment analysis — read actual headlines before acting on this step alone.";

  return { score, verdict, summary, metrics, sources: Array.from(sources), warnings };
}
