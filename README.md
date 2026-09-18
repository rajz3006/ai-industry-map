# AI Industry Map

A live, real-time version of the "AI Industry Map" investigative dashboard: a dark-themed
dependency graph of the AI industry's frontier labs, clouds, silicon, foundries, systems
vendors and power suppliers, plus a Markets tab with live stock quotes, an intraday/historical
chart, and earnings context for every public ticker in the map.

Built with Next.js (App Router, TypeScript). The node/edge/relationship data is ported from a
static reference page (`reference/AI_Industry_Map.source.html`); live quotes, company profiles and
earnings come from [Finnhub](https://finnhub.io), and the stock-detail chart's price history comes
from [Alpaca's Market Data API](https://docs.alpaca.markets/docs/about-market-data-api) — Finnhub's
free tier no longer serves historical/intraday candles (`403` on `/stock/candle`), so charting was
split off to Alpaca, which gives free historical + IEX-feed bars even on a paper-trading account.

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and set FINNHUB_API_KEY + ALPACA_API_KEY/ALPACA_SECRET_KEY (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without keys configured, the app still builds and runs — quotes/profile/earnings show a "Set
FINNHUB_API_KEY to enable live data" state and the chart shows an "Set ALPACA_API_KEY/
ALPACA_SECRET_KEY to enable chart history" state, instead of crashing or showing fake numbers.

### Getting API keys

**Finnhub** (quotes, company profile, earnings):
1. Register for a free account at [finnhub.io/register](https://finnhub.io/register).
2. Copy your API key from the dashboard.
3. Put it in `.env.local` as `FINNHUB_API_KEY=...`.

**Alpaca** (chart price history):
1. Sign up / log in at [app.alpaca.markets](https://app.alpaca.markets) — a free paper-trading
   account is enough; the Market Data API isn't gated by paper vs. live.
2. Generate an API key pair under Paper Trading → API Keys.
3. Put them in `.env.local` as `ALPACA_API_KEY=...` and `ALPACA_SECRET_KEY=...`.

`.env.local` is already gitignored — never commit it.

## What's live vs. static

- **Live** (via `/api/quote`, `/api/profile`, `/api/candles`, `/api/earnings`, all server-only
  routes that keep both API keys off the client): price, day change, day range, market cap,
  industry, intraday/historical charts (Alpaca), and recent/upcoming earnings (Finnhub) — for
  **US-listed stocks and ADRs only** (neither provider's free tier covers real-time data on
  foreign exchanges).
- **Static** (ported from the reference page, in `src/data/`): the node/edge relationship graph,
  company descriptions, sourcing citations, money-loop and fragility narratives, and ticker
  *metadata* (symbol/exchange) — not prices.
- Foreign-listed tickers (Samsung `005930.KS`, SK Hynix, SMIC, Cambricon, the Taiwan ODMs,
  Tokyo-listed SoftBank, Shenzhen-listed optics names, etc.) are flagged `isUS: false` in
  `src/data/tickers.ts` and show "Live pricing unavailable on this exchange — check a local
  source" rather than a fabricated number.

## Free-tier limitations

- **US-listed real-time quotes only.** Foreign exchanges (Hong Kong, Korea, Shanghai, Shenzhen,
  Tokyo, Taiwan) aren't covered by either provider — the UI shows an unavailable notice for those
  instead.
- **Candles come from Alpaca's IEX feed, not Finnhub.** `/api/candles` maps each UI range
  (1D/5D/1M/6M/YTD/1Y/5Y) to an Alpaca bar timeframe (5Min/15Min/1Hour/1Day/1Week) and lookback
  window; if Alpaca returns no bars for a symbol/range, the client shows a clear "unavailable"
  message rather than an empty or broken chart.
- **Finnhub: 60 requests/minute.** The client only polls quotes for symbols currently on screen
  (the Markets tab's visible rows, or the selected network node's ticker) every ~20 seconds — it
  never background-polls all ~70 tickers at once. The server also layers a ~10s in-memory cache
  per warm instance and sets `Cache-Control: s-maxage=15, stale-while-revalidate=30`-style headers
  to absorb repeated polling.
- **Alpaca IEX feed** reflects IEX-only volume/prices (a subset of consolidated tape), which is
  standard for free-tier market data and fine for a dashboard chart, but can differ slightly from
  SIP-consolidated prices shown elsewhere.

## Project structure

- `src/data/industry-map.ts` — nodes, edges, layer columns and source citations (typed, ported
  from the reference HTML's embedded JS data).
- `src/data/tickers.ts` — ticker symbol/exchange metadata per node (no prices).
- `src/lib/finnhub.ts` — server-only Finnhub client: key handling, TTL cache, concurrency limiter.
- `src/lib/alpaca.ts` — server-only Alpaca Market Data client: key handling, paginated bars fetch.
- `src/app/api/{quote,profile,earnings}/route.ts` — Route Handlers proxying Finnhub.
- `src/app/api/candles/route.ts` — Route Handler proxying Alpaca bars, mapped to UI ranges.
- `src/hooks/useQuotes.ts` — client polling hook.
- `src/components/` — `NetworkGraph` (SVG value-chain map), `MobileMap` (accordion), `Dossier`
  (side panel), `MoneyLoops`, `Fragility`, `MarketsTable`, `StockDetail` (chart + stats drawer,
  built on [`lightweight-charts`](https://github.com/tradingview/lightweight-charts)).

## Deploying to Vercel

Option A — CLI:

```bash
npm i -g vercel
vercel
vercel env add FINNHUB_API_KEY       # paste your key when prompted
vercel env add ALPACA_API_KEY
vercel env add ALPACA_SECRET_KEY
vercel --prod
```

Option B — dashboard:

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. In the project's Settings → Environment Variables, add `FINNHUB_API_KEY`, `ALPACA_API_KEY` and
   `ALPACA_SECRET_KEY`.
4. Deploy.

## Scripts

```bash
npm run dev     # start dev server
npm run build   # production build (must pass before shipping changes)
npm run start   # run the production build locally
npm run lint    # eslint
```
