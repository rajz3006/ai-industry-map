# Evaluation data providers

Implemented so far: `src/lib/fmp.ts` (Step 3/4 fundamentals from Financial Modeling Prep), the Step 6
additions to `src/lib/indicators.ts` (`extensionFromSma`, `obv`, `chaikinMoneyFlow`, `upDownVolume`,
`goldenCrossState`), and `src/lib/evaluation/managementSignals.ts` (Step 5 insider cluster-buy and
buyback signals). No scoring, UI, or API route lives here yet — this is the data layer other code
will consume.

Two things are heuristics/proxies, not real data feeds: `upDownVolume` in `indicators.ts` is a
price-direction volume split, not true bid/ask order flow (this app has no Level 2 feed); and
`getInsiderClusterSignal`'s insider dedup parses the reporting-owner CIK out of each Form 4's own
XML document, because `fetchRecentFilingsForSymbol` doesn't expose filer identity itself.

The one thing a future maintainer most needs to know: there is **no `FMP_API_KEY` configured** in
this repo yet, so `fmp.ts`'s `getFundamentals()` and `getAnnualCashFlow()` both return `null` today,
and `getBuybackSignal()` returns `{repurchasedTtm: null, note: "FMP_API_KEY not set"}`. This is the
expected, exercised-in-testing path — every caller must degrade on it, not treat it as an error.
