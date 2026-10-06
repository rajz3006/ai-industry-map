// Trusted-source gate for the Daily Movers news digest, built from real output rather
// than guessed: pulling 10 symbols' worth of Finnhub /company-news showed only
// {Yahoo, Benzinga, SeekingAlpha, ChartMill, CNBC, Fintel} ever appear in the `source`
// field. CNBC is the only one that's reliably staff-written wire/broadcast coverage —
// Benzinga and SeekingAlpha are mostly contributor opinion ("Smart Money Is Pounding the
// Table"), ChartMill is templated daily-recap boilerplate, and Fintel is too thin to
// matter. Finnhub's own `url` is a finnhub.io redirect (not the publisher's domain), so
// unlike the Yahoo RSS feed there's no way to further filter Finnhub's "Yahoo" items by
// where they actually came from — they're excluded here for that reason, and Yahoo
// coverage instead comes from fetchYahooRssNews's own finance.yahoo.com domain filter.
const TRUSTED_FINNHUB_SOURCES = new Set(["cnbc", "reuters", "bloomberg"]);

export function isTrustedFinnhubSource(source: string): boolean {
  return TRUSTED_FINNHUB_SOURCES.has(source.trim().toLowerCase());
}

// Only Yahoo's own staff articles live on this host; syndicated Motley Fool / 247WallSt /
// Trefis / etc. pieces link straight to the third party's own domain instead.
export const YAHOO_FINANCE_HOST = "finance.yahoo.com";

export function isTrustedYahooLink(link: string): boolean {
  try {
    return new URL(link).hostname.toLowerCase() === YAHOO_FINANCE_HOST;
  } catch {
    return false;
  }
}

// The finance.yahoo.com domain filter alone still lets through Yahoo's own templated
// "should you buy/sell/hold" and "N best/top stocks" advice listicles (confirmed against
// live output) — exactly the "speculation" the digest is meant to screen out, so catch
// the title pattern even though the source/domain checks out.
const SPECULATIVE_HEADLINE_PATTERNS = [
  /\bshould you\b/i,
  /^top \d+[\s\S]*\bstocks\b/i,
  /\bis\s.+\s(a buy|a sell)\b/i,
  /\b\d+\s+stocks?\b.*\bto (buy|sell)\b/i,
];

export function isSpeculativeHeadline(headline: string): boolean {
  return SPECULATIVE_HEADLINE_PATTERNS.some((re) => re.test(headline));
}
