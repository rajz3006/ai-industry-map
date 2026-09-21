// Server-only Finnhub client helper: key handling, a tiny in-memory TTL cache,
// and a small concurrency limiter for batch requests (free tier: 60 calls/min).

const BASE_URL = "https://finnhub.io/api/v1";

export function getFinnhubKey(): string | null {
  const key = process.env.FINNHUB_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

/** Simple per-process TTL cache. Not shared across serverless instances, but cuts
 * duplicate calls within a single warm instance between polls. */
export function cacheGet<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export class FinnhubError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "FinnhubError";
    this.status = status;
  }
}

// Shared, process-wide rolling-window rate limiter for ALL outbound Finnhub calls,
// regardless of which route makes them. Free tier caps at 60 req/min; each route's own
// mapWithConcurrency(6) limiter only bounds concurrency *within* that one route, so e.g.
// a page load firing /api/quote and /api/earnings at once (45 symbols each) could burst
// ~90 near-simultaneous calls and get 429'd across the board. This queues calls so the
// combined total across every route stays under the cap, and backs off on a 429 that
// still slips through (e.g. from load before this process's window has any history).
const RATE_LIMIT = 50; // stay safely under Finnhub's 60/min free-tier cap
const WINDOW_MS = 60_000;
const callTimestamps: number[] = [];

async function waitForRateLimitSlot(): Promise<void> {
  for (;;) {
    const now = Date.now();
    while (callTimestamps.length && now - callTimestamps[0] > WINDOW_MS) {
      callTimestamps.shift();
    }
    if (callTimestamps.length < RATE_LIMIT) {
      callTimestamps.push(now);
      return;
    }
    const waitMs = WINDOW_MS - (now - callTimestamps[0]) + 25;
    await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 50)));
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function finnhubGet<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const key = getFinnhubKey();
  if (!key) {
    throw new FinnhubError("FINNHUB_API_KEY is not configured on the server.");
  }
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    token: key,
  });
  const url = `${BASE_URL}${path}?${qs.toString()}`;

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await waitForRateLimitSlot();
    const res = await fetch(url, {
      // Finnhub responses change frequently; caching is handled by our own layer + route headers.
      cache: "no-store",
    });
    if (res.status === 429 && attempt < MAX_ATTEMPTS) {
      await sleep(500 * attempt);
      continue;
    }
    if (!res.ok) {
      throw new FinnhubError(`Finnhub request failed (${res.status}) for ${path}`, res.status);
    }
    return (await res.json()) as T;
  }
  throw new FinnhubError(`Finnhub request failed (429, rate limited) for ${path}`, 429);
}

/** Runs async tasks with a max concurrency, preserving input order in the output array. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
