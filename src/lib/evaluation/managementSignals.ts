// Step 5 (Management & Capital Allocation) helper for the Evaluator tab: insider cluster-buy
// detection (SEC Form 4) and a buyback-size signal (FMP cash-flow-statement). See
// research_notes/Stock evaluation framework metrics/step5_6_management_technicals.md for the
// cluster-buy definition this implements (3+ distinct insiders, open-market code-"P" buys, within
// a short rolling window — that note cites ~60 days from openinsider.com's convention; this file
// uses a 90-day window per this feature's spec, which is strictly more inclusive).

import { fetchRecentFilingsForSymbol } from "@/lib/secFilings";
import { cacheGet, cacheSet } from "@/lib/finnhub";
import { getFmpKey, getAnnualCashFlow } from "@/lib/fmp";

const CLUSTER_WINDOW_DAYS = 90;
const CLUSTER_MIN_BUYERS = 3;
const FORM4_OWNER_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // a filed Form 4's content never changes

function secContact(): string {
  // Mirrors secFilings.ts's getSecContact() fallback; duplicated locally rather than importing a
  // private helper, since secFilings.ts doesn't export it and this is the one extra UA string we need.
  const configured = process.env.SEC_EDGAR_CONTACT?.trim();
  return configured || "ai-industry-map research-tool (set SEC_EDGAR_CONTACT in .env.local)";
}

/**
 * fetchRecentFilingsForSymbol's FilingEvent (src/lib/secFilings.ts) does NOT expose the reporting
 * owner's name or CIK — only symbol/companyName/form/filingDate/url/items. To dedupe "3+ distinct
 * insiders" we need the actual filer identity, so this fetches the filing document at `url` (the
 * same accession-root XML secFilings.ts itself fetches internally for transaction codes) and pulls
 * the reporting-owner CIK directly out of it. Best-effort: returns null on any parse/network
 * failure, in which case the caller falls back to treating the filing URL itself as the dedupe key
 * (i.e. "a distinct filing" rather than confirmed "a distinct person" — see getInsiderClusterSignal).
 */
async function fetchReportingOwnerCik(url: string): Promise<string | null> {
  const cacheKey = `mgmt:form4owner:${url}`;
  const cached = cacheGet<string | null>(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const res = await fetch(url, { headers: { "User-Agent": secContact() } });
    if (!res.ok) {
      cacheSet(cacheKey, null, FORM4_OWNER_CACHE_TTL_MS);
      return null;
    }
    const xml = await res.text();
    const match = xml.match(/<rptOwnerCik>\s*0*(\d+)\s*<\/rptOwnerCik>/);
    const cik = match ? match[1] : null;
    cacheSet(cacheKey, cik, FORM4_OWNER_CACHE_TTL_MS);
    return cik;
  } catch {
    return null;
  }
}

export interface InsiderClusterSignal {
  clusterBuy: boolean;
  buyCount90d: number;
  details: string;
}

/**
 * Cluster-buy signal: 3+ distinct insiders making open-market purchases (Form 4, code "P" — already
 * filtered by fetchRecentFilingsForSymbol) within the trailing 90 days. Dedupes by reporting-owner
 * CIK parsed from each filing (see fetchReportingOwnerCik above); a filing whose CIK can't be parsed
 * still counts as one distinct buyer, keyed by its filing URL, so a parse failure undercounts rather
 * than silently dropping a real buy.
 */
export async function getInsiderClusterSignal(symbol: string): Promise<InsiderClusterSignal> {
  const since = new Date(Date.now() - CLUSTER_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let form4Buys;
  try {
    const events = await fetchRecentFilingsForSymbol(symbol, since);
    form4Buys = events.filter((e) => e.form === "4");
  } catch {
    return {
      clusterBuy: false,
      buyCount90d: 0,
      details: "SEC EDGAR lookup failed — unable to check insider buying for this symbol.",
    };
  }

  if (form4Buys.length === 0) {
    return {
      clusterBuy: false,
      buyCount90d: 0,
      details: `No open-market insider buys (Form 4, code "P") in the trailing ${CLUSTER_WINDOW_DAYS} days.`,
    };
  }

  const ownerKeys = new Set<string>();
  for (const ev of form4Buys) {
    const cik = await fetchReportingOwnerCik(ev.url);
    ownerKeys.add(cik ? `cik:${cik}` : `url:${ev.url}`);
  }

  const buyCount90d = ownerKeys.size;
  const clusterBuy = buyCount90d >= CLUSTER_MIN_BUYERS;
  return {
    clusterBuy,
    buyCount90d,
    details: clusterBuy
      ? `${buyCount90d} distinct insiders filed open-market buys (Form 4, code "P") in the trailing ${CLUSTER_WINDOW_DAYS} days — cluster-buy threshold (${CLUSTER_MIN_BUYERS}+) met.`
      : `${buyCount90d} distinct insider open-market buy(s) (Form 4, code "P") in the trailing ${CLUSTER_WINDOW_DAYS} days — below the ${CLUSTER_MIN_BUYERS}-buyer cluster-buy threshold.`,
  };
}

export interface BuybackSignal {
  repurchasedTtm: number | null;
  note: string;
}

/**
 * Pulls "repurchase of common stock" off FMP's latest annual cash-flow-statement via
 * src/lib/fmp.ts's getAnnualCashFlow(). Returns a positive dollar figure (FMP's own sign convention
 * is a negative cash-flow-statement line for a repurchase; this flips it to a plain "$ spent on
 * buybacks" figure for display). Degrades gracefully to `{repurchasedTtm: null, note: ...}` at every
 * failure point — missing key, failed fetch, or a response that doesn't include the line item —
 * since there is no FMP_API_KEY configured in this repo yet and this path will be hit in testing.
 */
export async function getBuybackSignal(symbol: string): Promise<BuybackSignal> {
  if (!getFmpKey()) {
    return { repurchasedTtm: null, note: "FMP_API_KEY not set" };
  }
  const row = await getAnnualCashFlow(symbol);
  if (!row) {
    return { repurchasedTtm: null, note: "FMP cash-flow-statement unavailable for this symbol." };
  }
  if (row.repurchaseOfCommonStock == null) {
    return {
      repurchasedTtm: null,
      note: "FMP's cash-flow-statement response for this symbol did not include a repurchase-of-common-stock line item.",
    };
  }
  const year = row.date?.slice(0, 4) ?? "latest";
  return {
    repurchasedTtm: Math.abs(row.repurchaseOfCommonStock),
    note: `FMP cash-flow-statement, FY${year} annual filing.`,
  };
}
