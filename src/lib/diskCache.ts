// Small server-only JSON cache on disk (.cache/fmp, git-ignored) so slow-moving fundamentals survive
// dev-server restarts, plus a persisted daily call budget for the FMP free tier (250 req/day).
// Every function degrades silently (undefined / true) if the disk is unavailable — callers keep
// working with the in-process cache only.

import { promises as fs } from "fs";
import os from "os";
import path from "path";

// Deployed (Vercel) the project folder is read-only; only the OS temp dir is writable, and it lives per
// server instance. Locally the cache sits in the git-ignored .cache folder and survives restarts.
const DIR = process.env.VERCEL ? path.join(os.tmpdir(), "fmp-cache") : path.join(process.cwd(), ".cache", "fmp");

function fileFor(key: string): string {
  return path.join(DIR, `${key.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`);
}

async function writeAtomic(file: string, text: string): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, text);
  await fs.rename(tmp, file);
}

export async function diskGet<T>(key: string, ttlMs: number): Promise<T | undefined> {
  try {
    const parsed = JSON.parse(await fs.readFile(fileFor(key), "utf8")) as { savedAt: number; value: T };
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > ttlMs) return undefined;
    return parsed.value;
  } catch {
    return undefined;
  }
}

export async function diskSet<T>(key: string, value: T): Promise<void> {
  try {
    await writeAtomic(fileFor(key), JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    /* disk cache is best-effort */
  }
}

// --- FMP daily call budget -------------------------------------------------------------------
// FMP's free plan allows 250 calls/day. We stop at DAILY_LIMIT to keep a reserve; callers treat the
// resulting FmpError like any other FMP failure and degrade to SEC / Finnhub data.

const DAILY_LIMIT = 220;
const BUDGET_FILE = path.join(DIR, "_budget.json");
let budgetChain: Promise<unknown> = Promise.resolve();
// In-process count: keeps the budget enforced for this instance even if the file cannot be written.
let memState = { day: "", calls: 0 };

/** Counts one FMP call against today's (UTC) budget. Returns false when the budget is used up.
 * Serialized in-process so parallel requests can't race on the file. */
export function takeFmpBudget(): Promise<boolean> {
  const run = budgetChain.then(async () => {
    const today = new Date().toISOString().slice(0, 10);
    let state = { day: today, calls: 0 };
    try {
      const parsed = JSON.parse(await fs.readFile(BUDGET_FILE, "utf8")) as typeof state;
      if (parsed.day === today && Number.isFinite(parsed.calls)) state = parsed;
    } catch {
      /* first call of the day, or no file yet */
    }
    if (memState.day === today) state.calls = Math.max(state.calls, memState.calls);
    if (state.calls >= DAILY_LIMIT) return false;
    state.calls += 1;
    memState = { day: today, calls: state.calls };
    try {
      await writeAtomic(BUDGET_FILE, JSON.stringify(state));
    } catch {
      /* best-effort */
    }
    return true;
  });
  budgetChain = run.catch(() => undefined);
  return run;
}
