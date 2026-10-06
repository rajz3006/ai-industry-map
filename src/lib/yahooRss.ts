// Unofficial, no-auth Yahoo Finance per-symbol RSS feed. Verified by hand against the
// live endpoint: it also syndicates Motley Fool / 247WallSt / Trefis / etc. items whose
// <link> points straight at the third-party domain, so filtering by that domain (done by
// the caller, not here) is what actually gets "Yahoo" down to Yahoo's own staff content.

const FETCH_TIMEOUT_MS = 5000;

export interface YahooRssItem {
  title: string;
  link: string;
  description: string;
  datetime: number; // unix seconds, 0 if unparseable
}

export async function fetchYahooRssNews(symbol: string): Promise<YahooRssItem[]> {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" }, // feed 404s without a browser-like UA
      cache: "no-store",
    });
    if (!res.ok) return [];
    return parseRssItems(await res.text());
  } catch {
    return []; // supplementary source only — never block the digest on Yahoo being flaky
  } finally {
    clearTimeout(timer);
  }
}

function parseRssItems(xml: string): YahooRssItem[] {
  const items: YahooRssItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml))) {
    const block = match[1];
    const title = decodeEntities(extractTag(block, "title"));
    const link = extractTag(block, "link");
    if (!title || !link) continue;
    const pubDateRaw = extractTag(block, "pubDate");
    const parsed = pubDateRaw ? Date.parse(pubDateRaw) : NaN;
    items.push({
      title,
      link,
      description: decodeEntities(extractTag(block, "description")),
      datetime: Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000),
    });
  }
  return items;
}

function extractTag(block: string, tag: string): string {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block);
  if (!match) return "";
  return match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
