// Free, keyless SEC EDGAR access for the Catalyst Radar's "filings" signal: recent 8-Ks
// (material events, by definition) and open-market insider buys (Form 4, transaction code
// "P" only — routine awards/withholding/option-exercise codes are noise, not signal).
// No API key: EDGAR just requires a descriptive User-Agent per its fair-access policy
// (https://www.sec.gov/os/webmaster-faq#developers) — see SEC_EDGAR_CONTACT in .env.example.

import { cacheGet, cacheSet } from "@/lib/finnhub";

const TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SUBMISSIONS_TTL_MS = 2 * 60 * 60 * 1000; // filings don't land intraday-frequently
const TICKERS_TTL_MS = 24 * 60 * 60 * 1000;
const FORM4_DOC_TTL_MS = 30 * 24 * 60 * 60 * 1000; // a filed Form 4's content never changes

function getSecContact(): string {
  const configured = process.env.SEC_EDGAR_CONTACT?.trim();
  if (configured) return configured;
  // Generic placeholder — works, but SEC asks requesters to self-identify. Set
  // SEC_EDGAR_CONTACT to "Your Name/App your-email@example.com" to follow that properly.
  return "ai-industry-map research-tool (set SEC_EDGAR_CONTACT in .env.local)";
}

async function secFetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": getSecContact(), Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`SEC EDGAR request failed (${res.status}): ${url}`);
  return (await res.json()) as T;
}

type CikEntry = { cik: string; name: string };

type RawTickerRow = { cik_str: number; ticker: string; title: string };

// EDGAR serves this as a JSON *object* keyed by numeric string index ({"0": {...}, "1": {...}}),
// not an array, despite looking array-like.
type RawTickerFile = Record<string, RawTickerRow>;

/** Ticker -> zero-padded 10-digit CIK + company title, from EDGAR's own ticker index. */
export async function getCikMap(): Promise<Map<string, CikEntry>> {
  const cacheKey = "sec:cik-map";
  const cached = cacheGet<Map<string, CikEntry>>(cacheKey);
  if (cached) return cached;

  const raw = await secFetchJson<RawTickerFile>(TICKERS_URL);
  const map = new Map<string, CikEntry>();
  for (const r of Object.values(raw)) {
    if (!r.ticker) continue;
    map.set(r.ticker.toUpperCase(), { cik: String(r.cik_str).padStart(10, "0"), name: r.title ?? r.ticker });
  }
  cacheSet(cacheKey, map, TICKERS_TTL_MS);
  return map;
}

interface SubmissionsRecent {
  form: string[];
  filingDate: string[];
  accessionNumber: string[];
  primaryDocument: string[];
  items: string[]; // "" for forms other than 8-K
}

interface SubmissionsJson {
  filings?: { recent?: Partial<SubmissionsRecent> };
}

async function fetchSubmissions(cik: string): Promise<SubmissionsRecent | null> {
  const cacheKey = `sec:submissions:${cik}`;
  const cached = cacheGet<SubmissionsRecent>(cacheKey);
  if (cached) return cached;

  const data = await secFetchJson<SubmissionsJson>(`https://data.sec.gov/submissions/CIK${cik}.json`);
  const recent = data.filings?.recent;
  if (!recent?.form || !recent.filingDate || !recent.accessionNumber || !recent.primaryDocument) return null;
  const result: SubmissionsRecent = {
    form: recent.form,
    filingDate: recent.filingDate,
    accessionNumber: recent.accessionNumber,
    primaryDocument: recent.primaryDocument,
    items: recent.items ?? recent.form.map(() => ""),
  };
  cacheSet(cacheKey, result, SUBMISSIONS_TTL_MS);
  return result;
}

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

function filingDocUrl(cik: string, accessionNumber: string, primaryDocument: string): string {
  const cikNoLeadingZeros = String(Number(cik));
  const accessionNoDashes = accessionNumber.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cikNoLeadingZeros}/${accessionNoDashes}/${primaryDocument}`;
}

/** Fetches a Form 4's XML and returns its transaction code(s) — "P" is an open-market buy,
 * which is the only one worth surfacing (vs. "S" sale, "A" award/grant, "F" tax withholding,
 * "M" option exercise, "G" gift — all routine, not a signal). Best-effort: a parse failure
 * just means this filing is skipped, never thrown. */
async function fetchForm4TransactionCodes(url: string): Promise<string[]> {
  const cacheKey = `sec:form4codes:${url}`;
  const cached = cacheGet<string[]>(cacheKey);
  if (cached) return cached;
  try {
    const res = await fetch(url, { headers: { "User-Agent": getSecContact() } });
    if (!res.ok) return [];
    const xml = await res.text();
    const codes = Array.from(xml.matchAll(/<transactionCode>([A-Z])<\/transactionCode>/g)).map((m) => m[1]);
    cacheSet(cacheKey, codes, FORM4_DOC_TTL_MS);
    return codes;
  } catch {
    return [];
  }
}

export interface FilingEvent {
  symbol: string;
  companyName: string;
  form: "4" | "8-K";
  filingDate: string; // YYYY-MM-DD
  url: string;
  /** Only set for 8-Ks — the disclosed item numbers, e.g. "1.01,9.01". */
  items?: string;
}

const MAX_FORM4_CHECKS_PER_SYMBOL = 3; // bounds worst-case XML fetches per symbol

/** Recent 8-Ks and open-market-buy Form 4s for one symbol, filtered to the last `sinceDate`
 * (YYYY-MM-DD, inclusive). Returns [] on any lookup failure rather than throwing, since a
 * single bad symbol (no CIK match, EDGAR hiccup) shouldn't take down the whole batch.
 *
 * `opts.forms` (default: both) lets a caller that only wants 8-Ks skip Form 4 processing
 * entirely — Form 4 handling fetches each candidate filing's raw XML to read its transaction
 * code (see fetchForm4TransactionCodes), which is real per-filing network cost that's wasted
 * when the caller is only going to read 8-K `items` (already present in the cached submissions
 * JSON with no extra fetch). src/lib/evaluation/scoreNews.ts's 8-K red-flag check is exactly
 * that case. */
export async function fetchRecentFilingsForSymbol(
  symbol: string,
  sinceDate: string,
  opts: { forms?: Array<"4" | "8-K"> } = {}
): Promise<FilingEvent[]> {
  const wantForm4 = opts.forms ? opts.forms.includes("4") : true;
  const wantForm8K = opts.forms ? opts.forms.includes("8-K") : true;

  const cikMap = await getCikMap();
  const entry = cikMap.get(symbol.toUpperCase());
  if (!entry) return [];

  const recent = await fetchSubmissions(entry.cik);
  if (!recent) return [];

  const events: FilingEvent[] = [];
  let form4Checked = 0;
  for (let i = 0; i < recent.form.length; i++) {
    const date = recent.filingDate[i];
    if (!date || date < sinceDate) continue;
    const form = recent.form[i];
    const url = filingDocUrl(entry.cik, recent.accessionNumber[i], recent.primaryDocument[i]);

    if (form === "8-K" && wantForm8K) {
      events.push({ symbol, companyName: entry.name, form: "8-K", filingDate: date, url, items: recent.items[i] || undefined });
    } else if (form === "4" && wantForm4 && form4Checked < MAX_FORM4_CHECKS_PER_SYMBOL) {
      form4Checked++;
      // submissions.json's primaryDocument for Form 4 points at the XSL-rendered human-readable
      // view (nicer as the click-through link, kept in `url` above); the raw XML with the actual
      // <transactionCode> tags always sits at the accession root under its own basename instead.
      const rawXmlUrl = filingDocUrl(entry.cik, recent.accessionNumber[i], basename(recent.primaryDocument[i]));
      const codes = await fetchForm4TransactionCodes(rawXmlUrl);
      if (codes.includes("P")) {
        events.push({ symbol, companyName: entry.name, form: "4", filingDate: date, url });
      }
    }
  }
  return events;
}
