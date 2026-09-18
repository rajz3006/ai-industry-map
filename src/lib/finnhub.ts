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

export async function finnhubGet<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const key = getFinnhubKey();
  if (!key) {
    throw new FinnhubError("FINNHUB_API_KEY is not configured on the server.");
  }
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    token: key,
  });
  const res = await fetch(`${BASE_URL}${path}?${qs.toString()}`, {
    // Finnhub responses change frequently; caching is handled by our own layer + route headers.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new FinnhubError(`Finnhub request failed (${res.status}) for ${path}`, res.status);
  }
  const data = (await res.json()) as T;
  return data;
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
