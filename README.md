# AI Industry Map

A live, real-time version of the "AI Industry Map" investigative dashboard: a dark-themed
dependency graph of the AI industry's frontier labs, clouds, silicon, foundries, systems
vendors and power suppliers, plus a Markets tab with live stock quotes, an intraday/historical
chart, and earnings context for every public ticker in the map.

Built with Next.js (App Router, TypeScript). The node/edge/relationship data is ported from a
static reference page (`reference/AI_Industry_Map.source.html`); pricing is fetched live from
[Finnhub](https://finnhub.io) instead of a hardcoded snapshot.

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and set FINNHUB_API_KEY (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without a key configured, the app still builds and runs — quotes, charts and earnings show a
"Set FINNHUB_API_KEY to enable live data" / "unavailable" state instead of crashing or showing
fake numbers.

### Getting a Finnhub API key

1. Register for a free account at [finnhub.io/register](https://finnhub.io/register).
2. Copy your API key from the dashboard.
3. Put it in `.env.local` as `FINNHUB_API_KEY=...` (never commit this file — it's already
   gitignored).

## What's live vs. static

- **Live** (via `/api/quote`, `/api/profile`, `/api/candles`, `/api/earnings`, all server-only
  routes that keep the Finnhub key off the client): price, day change, day range, market cap,
  industry, intraday/historical charts, and recent/upcoming earnings — for **US-listed stocks
  and ADRs only** (Finnhub's free tier doesn't cover real-time quotes on foreign exchanges).
- **Static** (ported from the reference page, in `src/data/`): the node/edge relationship graph,
  company descriptions, sourcing citations, money-loop and fragility narratives, and ticker
  *metadata* (symbol/exchange) — not prices.
- Foreign-listed tickers (Samsung `005930.KS`, SK Hynix, SMIC, Cambricon, the Taiwan ODMs,
  Tokyo-listed SoftBank, Shenzhen-listed optics names, etc.) are flagged `isUS: false` in
  `src/data/tickers.ts` and show "Live pricing unavailable on this exchange — check a local
  source" rather than a fabricated number.

## Finnhub free-tier limitations

- **US-listed real-time quotes only.** Foreign exchanges (Hong Kong, Korea, Shanghai, Shenzhen,
  Tokyo, Taiwan) aren't covered — the UI shows an unavailable notice for those instead.
- **Intraday history depth is limited.** `/api/candles` maps each UI range (1D/5D/1M/6M/YTD/1Y/5Y)
  to an appropriate resolution and lookback window, but very short intraday resolutions may have
  shallow history on the free tier; if Finnhub returns no data, the client shows a clear
  "unavailable on free tier" message rather than an empty or broken chart.
- **60 requests/minute.** The client only polls quotes for symbols currently on screen (the
  Markets tab's visible rows, or the selected network node's ticker) every ~20 seconds — it never
  background-polls all ~70 tickers at once. The server also layers a ~10s in-memory cache per
  warm instance and sets `Cache-Control: s-maxage=15, stale-while-revalidate=30`-style headers to
  absorb repeated polling.

## Project structure

- `src/data/industry-map.ts` — nodes, edges, layer columns and source citations (typed, ported
  from the reference HTML's embedded JS data).
- `src/data/tickers.ts` — ticker symbol/exchange metadata per node (no prices).
- `src/lib/finnhub.ts` — server-only Finnhub client: key handling, TTL cache, concurrency limiter.
- `src/app/api/{quote,profile,candles,earnings}/route.ts` — Route Handlers proxying Finnhub.
- `src/hooks/useQuotes.ts` — client polling hook.
- `src/components/` — `NetworkGraph` (SVG value-chain map), `MobileMap` (accordion), `Dossier`
  (side panel), `MoneyLoops`, `Fragility`, `MarketsTable`, `StockDetail` (chart + stats drawer,
  built on [`lightweight-charts`](https://github.com/tradingview/lightweight-charts)).

## Deploying to Vercel

Option A — CLI:

```bash
npm i -g vercel
vercel
vercel env add FINNHUB_API_KEY   # paste your key when prompted
vercel --prod
```

Option B — dashboard:

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. In the project's Settings → Environment Variables, add `FINNHUB_API_KEY` with your key.
4. Deploy.

## Scripts

```bash
npm run dev     # start dev server
npm run build   # production build (must pass before shipping changes)
npm run start   # run the production build locally
npm run lint    # eslint
```
