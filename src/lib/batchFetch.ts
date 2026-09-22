"use client";

export interface ChunkFetchOptions {
  chunkSize?: number;
  concurrency?: number;
  signal?: AbortSignal;
}

/**
 * Fetches `buildUrl(chunk)` for successive slices of `symbols`, calling `onChunk` with each
 * chunk's parsed JSON as soon as it resolves. Used instead of one all-or-nothing request for
 * the whole symbol list so the UI can fill in results progressively (and show real progress)
 * rather than sitting on a blank "loading…" state for as long as the slowest symbol in a big
 * batch takes — which, behind our server's shared cross-route Finnhub rate limiter, can be
 * many seconds under load even though most individual symbols resolve almost immediately.
 */
export async function fetchInChunks<T extends Record<string, unknown>>(
  symbols: string[],
  buildUrl: (chunk: string[]) => string,
  onChunk: (data: T, chunk: string[]) => void,
  opts: ChunkFetchOptions = {}
): Promise<void> {
  const { chunkSize = 8, concurrency = 3, signal } = opts;
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += chunkSize) chunks.push(symbols.slice(i, i + chunkSize));

  let cursor = 0;
  async function worker() {
    while (cursor < chunks.length) {
      if (signal?.aborted) return;
      const chunk = chunks[cursor++];
      try {
        const res = await fetch(buildUrl(chunk), { signal });
        if (!res.ok) throw new Error(`status ${res.status}`);
        onChunk((await res.json()) as T, chunk);
      } catch {
        if (signal?.aborted) return;
        const fallback = Object.fromEntries(chunk.map((s) => [s, { error: "Service unreachable" }])) as T;
        onChunk(fallback, chunk);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, chunks.length) }, worker));
}
