# Evaluator tab — implementation status

Tracking the build-out of the new "Evaluator" tab: a table of all 57 symbols with a
composite score (from the 8-step framework in `reports/Stock evaluation framework
metrics.md`), where clicking a row expands into a per-step stepper with the underlying
data for each step.

Shared contract: `src/lib/evaluation/types.ts` (written up front, all tasks import from it).

## Wave 1 — parallel, independent

| # | Task | Owner | Status | Output |
|---|---|---|---|---|
| 1 | Data providers: FMP client (fundamentals), indicator extensions (OBV/CMF/up-down volume), Step 5 insider/buyback helpers | Agent | **done** | `src/lib/fmp.ts`, `src/lib/indicators.ts` additions, `src/lib/evaluation/managementSignals.ts`, `src/lib/evaluation/README.md` |
| 2 | Curated moat & industry-cycle dataset for all 57 symbols | Agent | **done** | `src/data/moatIndustryData.ts` |
| 3 | Frontend tab UI (table + expandable 8-step stepper), built against a local mock of the API contract | Agent | **done** | `src/components/StockEvaluator.tsx`, `src/lib/evaluation/mockEvaluation.ts`, `globals.css` additions, `IndustryMap.tsx` wiring |

## Wave 2 — depends on Wave 1 tasks 1 & 2

| # | Task | Owner | Status | Output |
|---|---|---|---|---|
| 4 | Scoring engine (all 8 steps, composite, risk/reward) + `/api/evaluate` route (bulk + single-symbol modes, shared cache) | Agent | **done** (verified live: AAPL single-symbol 4.2s, bulk-57 182s — see perf fix below) | `src/lib/evaluation/score*.ts`, `src/app/api/evaluate/route.ts` |

## Wave 3 — stitch & verify

| # | Task | Owner | Status | Output |
|---|---|---|---|---|
| 5 | Perf-fix bulk endpoint (exclude per-symbol SEC Form-4 XML lookups from bulk path), rewire UI to eager-fetch bulk scores + real per-symbol detail, remove silent mock fallback, full build/lint, smoke-test dev server | Agent | **done** | working tab end to end — see "Shipped" below |

## Feedback from Wave 1 to fold into Wave 2 (API route)
- **Needs a bulk mode.** UI agent correctly flagged: the table wants composite score +
  verdict for all 57 symbols up front (like `useOpportunities`'s precomputed `zScore`),
  but the contract so far only covers one full 8-step detail per symbol. `/api/evaluate`
  must support `?symbols=all` (or no param) → lightweight `{symbol, compositeScore,
  compositeVerdict}[]` for all 57 in one batched call, AND `?symbol=XXX` → full
  `EvaluationResult` for the expand-to-detail view. Wave 3 will switch the UI from
  "click to evaluate" per row to eager bulk-load on mount once this exists.
- **Step 8 ambiguity**: make explicit that step 8's `score` must equal the top-level
  `compositeScore` (it's a narrative wrapper around the composite + risk/reward, not an
  independent 9th input) — avoid divergence between the two.
- `sources: string[]` mixing citation labels and URLs is a known minor rough edge
  (UI auto-links anything starting with `http`); not worth reworking now since two
  Wave-1 tasks already ship data in this shape — leave as-is.

## Known constraints going in
- No `FMP_API_KEY` currently set in `.env.local` — fundamentals provider must degrade
  gracefully (Finnhub-only fields) and surface a `dataWarnings` entry rather than fail.
- No cron/scheduled job exists anywhere in this repo — `/api/evaluate` follows the
  existing live-fetch + short in-process-cache pattern (like `/api/opportunities`), not a
  precomputed snapshot.
- 57-symbol universe already centralized in `src/data/tickers.ts` (`allUSSymbols`) — do
  not duplicate it.
- Styling convention is a hand-written `globals.css` with semantic class prefixes per
  feature (no Tailwind usage in JSX) — new tab uses prefix `ev-*`.

## Shipped

**What it does end to end.** The Evaluator tab shows all 57 tracked symbols in a sortable
table. On mount it eagerly fetches `GET /api/evaluate` (bulk/"fast" mode) and populates the
Score and Verdict columns for every row within a few seconds, with a loading state on just
those two columns while the fetch is in flight, and a Retry banner if it fails. Clicking a
row expands it and fetches `GET /api/evaluate?symbol=XXX` (single-symbol/"full" mode) for the
complete 8-step stepper (moat, industry, financials, valuation, management, technicals,
news, composite + risk/reward), with its own loading/error/Retry state. Sorting by Score or
Verdict now works immediately after the bulk load, not only after a row's been clicked.

**Fast vs. full composite — why two scores exist.** Bulk/"fast" mode skips the expensive
per-symbol lookups and uses only what's already cached, so Step 5 (Management) comes back
`unknown`/neutral with a `dataWarnings` note, and Step 7 (News)'s insider-cluster bonus is
skipped (the rest of Step 7 — 8-K red flags, news count — still computes normally, from the
cache where available). The composite renormalizes across non-`unknown` steps per the
existing `types.ts` contract, so the fast composite is a real (if slightly thinner) score,
not a stub. Every fast-mode `EvaluationResult` carries a `dataWarnings` entry: "Preview score
based on 6 of 8 steps — open this symbol for the full evaluation including insider
activity." The UI surfaces the same idea in a footnote under the table header. Full
single-symbol detail mode (triggered by expanding a row) always computes all 8 steps live,
with no such warning. Fast and full results are cached under separate keys
(`${symbol}:fast` / `${symbol}:full`), so a bulk-mode cache entry can never silently satisfy
a full-detail request.

**Bulk-endpoint latency, before and after.** The previous agent measured the unoptimized
bulk endpoint (all 57 symbols) at **~182s live**. After this pass it's **~5.9s cold / ~20ms
warm-cached** — confirmed by re-running the identical live `curl` test against a local dev
server after the fix (see commits/diff for exact numbers). Two root causes were found and
fixed, not just the one originally diagnosed:
1. **SEC Form-4 XML lookups** (the originally diagnosed cause): `getInsiderClusterSignal`
   fetched each Form 4's raw XML per symbol to resolve the reporting-owner CIK, for both Step
   5 and Step 7's insider re-surfacing. Fast mode now skips this entirely (Step 5 → `unknown`;
   Step 7 → insider bonus skipped, rest of the step unaffected). A related waste was also
   found and fixed: `scoreNews.ts`'s 8-K red-flag check called the same shared
   `fetchRecentFilingsForSymbol` helper, which *also* did Form-4 XML fetches internally even
   though the 8-K check never uses Form-4 data — `fetchRecentFilingsForSymbol` now takes an
   optional `forms` filter so an 8-K-only caller skips that work.
2. **Finnhub's shared, process-wide 50-calls/60s rate limiter** (not part of the original
   diagnosis, discovered when the fix above alone didn't move the measured latency):
   `scoreFinancials` and `scoreValuation` both independently called `getFinnhubFundamentals`
   for the same symbol, and since `evaluateSymbol` runs those two steps concurrently, this
   silently *doubled* Finnhub call volume via a cache-miss race. Fixed with an in-flight
   de-dup map (benefits both fast and full mode). More importantly, 57 symbols × ~2 Finnhub
   calls each (`/stock/metric` + `/company-news`) was, on its own, enough to blow well past a
   60s ceiling under Finnhub's real rate limit — independent of the SEC XML cost. Fast mode
   now treats Finnhub as cache-only (peek, no live fetch) for both calls; full single-symbol
   mode is unaffected and still fetches live every time. `/company-news` results are now also
   cached (45 min TTL, previously uncached), so repeated full-mode views and later bulk passes
   can reuse them.

**Defense in depth.** `src/app/api/evaluate/route.ts` now exports `maxDuration = 60` with a
comment flagging that 60s is already at/past typical Vercel Hobby-plan ceilings, so a future
maintainer shouldn't raise it without checking the deployment's actual plan.

**Build/lint/typecheck.** `npx tsc --noEmit` — 0 errors. `npx eslint .` — 0 errors, 0
warnings on every Evaluator-related file (a couple of pre-existing unused-const warnings in
`src/data/moatIndustryData.ts` were cleaned up as part of this pass; the remaining warnings
in `scripts/pick-dip-fundamentals.mjs` are pre-existing and unrelated to this feature).
`npm run build` — succeeds cleanly, all routes compile including `/api/evaluate`.

**Dev-server smoke test.** Confirmed via a scripted Playwright pass against a local dev
server: Evaluator tab appears in the tab bar; clicking it shows the 57-row table; Score and
Verdict populate for all 57 rows within a few seconds (no stuck placeholders); sorting by
Score/Verdict re-orders rows; clicking a row expands it with a real (non-mock) composite
score, risk/reward block, and browsable 8-step stepper with real per-step data and sources;
collapsing, switching tabs, and returning to Evaluator all work cleanly; zero browser console
errors observed. Port 3000 confirmed free after the server was stopped.

**Deviations from the original task spec, and why.**
- The spec's diagnosed root cause (SEC Form-4 XML) was real and is fixed as specified, but
  fixing it alone left bulk latency essentially unchanged (~188s measured after that fix in
  isolation) because of the separate Finnhub rate-limit bottleneck described above. Extending
  fast mode to also skip live Finnhub calls was necessary to actually hit the "well under 60s"
  target the spec required — the spec's assumption that Finnhub calls were "fast" turned out
  to be true only in isolation, not at 57x volume against Finnhub's shared rate limiter.
  Flagging this since it's a deviation from "skip ONLY the SEC Form-4 XML lookup."
- Removed three truly-unused citation constants from `src/data/moatIndustryData.ts`
  (`DORSEY_MOAT`, `LYNCH_TAXONOMY`, `PORTER_FIVE`) to get that file to zero lint warnings, per
  the "zero warnings on all Evaluator-related files" requirement. Pre-existing from the
  Wave-1 data agent, not introduced by this pass.

**Follow-ups (genuinely left for later).**
- Add `FMP_API_KEY` to `.env.local` for richer Step 3/4 fundamentals (FCF, ROIC, PEG, EV/EBITDA)
  and a working Step 5 buyback figure — currently degraded to Finnhub's thinner metric set,
  and buybacks show "FMP_API_KEY not set" for every symbol.
- No scheduled refresh job exists — bulk (fast) and full results each cache in-process for 45
  minutes and reset on every cold serverless instance in production (Vercel). A cold instance
  after a deploy or idle period will pay the full live-fetch cost again on the next request.
- The moat/industry dataset (`src/data/moatIndustryData.ts`) is an LLM-curated October 2026
  snapshot, not filing-verified — spot-check periodically, especially for smaller/speculative
  names where competitive position can shift quickly.
- Under real app load (many other panels — quotes, earnings, news — all sharing the same
  process-wide Finnhub rate limiter), a single-symbol full-detail click can take noticeably
  longer than its isolated best case (observed up to ~15-20s when the whole dashboard's
  initial quote/earnings fetches were simultaneously queued against the same limiter during
  this pass's browser smoke test, vs. ~0.4s measured in isolation). This is pre-existing,
  app-wide behavior (affects `/api/quote` and `/api/earnings` too, not specific to the
  Evaluator), not a new regression, and the request always completes rather than hanging —
  but it's worth knowing about if a single-symbol click feels slow on a freshly loaded page.
