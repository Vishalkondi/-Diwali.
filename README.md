# utsavly · Ghar ghar jagmag.

**Utsavly** is a Diwali quick-commerce concept: a PERN monorepo (PostgreSQL, Express, React, Node) with a procedural canvas film, a live order tracker and a festive layer of small tools.

> Utsavly is a **fictional brand**. Orders are simulated: nothing is charged, packed or shipped, and the UI says so.

## Features

**Store and orders**
- Diwali Store with debounced search, category tabs (an animated `layoutId` pill, synced to `?cat=`), skeletons, empty and error states.
- Cream product cards with icons drawn by the canvas engine. Icons animate on hover or focus, and cards tilt toward the pointer. Adding an item flies a glowing diya into the bag and bumps the badge.
- Bag drawer: spring slide-in, blurred backdrop, Escape to close, focus trap, a free-delivery progress bar, and animated line items.
- Sign in and register share one form, with inline field errors from the API and a same-origin `?next=` redirect.
- Checkout: address form, coupons with live validation, one-tap offer chips and your unused Lakshmi rewards, and a gift message. The server prices everything.
- Live tracker at `/orders/:id`. A canvas scene follows the order status (card fan → packing phone → city with the rider driven by real progress → doorstep). Also an ETA countdown and a spring stepper. Updates arrive over Server-Sent Events, with polling as a fallback.
- After delivery: fireworks and **Lakshmi's wheel**. The server picks one of 8 weighted prizes with `crypto.randomInt`, and the SVG wheel eases onto it. Rewards are single-use and valid for 30 days.

**The film**
- A 21.8 s, 11-beat film drawn procedurally on a 1280×720 canvas: diya → app → product cards → packing → city route → doorstep → delivered → rangoli of plates → halo → brand → greeting. Every frame is a pure function of time, so scrubbing is exact.
- It plays as a skippable intro on your first visit, and opens from the "Watch the film" button with play/pause, a scrubber and scene buttons.

**Festival layer**
- `/diwali`: a flip-digit countdown to Lakshmi Puja (8 Nov 2026, 00:00 IST) and the five days, with a note that dates vary by panchang. A ten-item puja checklist with a progress ring and "Add N missing to bag".
- `/wall`: the Diya Wall. A night ghat where every visitor's diya floats with its reflection. Hover or tap a flame to read its wish.
- `/rangoli`: a mirrored drawing studio (6/8/12/16 folds, 12 glow colours, undo, "Surprise me", PNG download). Save and share to get a link that replays your drawing.
- `/wish`: Diwali cards in English, हिन्दी and मराठी with a live preview. Share them with a link, or on WhatsApp (the phone's share sheet first).
- Ambience: falling petals, cursor sparkles, full-screen fireworks, CSS string lights, and a switchboard. Sound is synthesised with WebAudio and **off by default**.

**Accessibility**
- `prefers-reduced-motion` freezes canvases on a still frame, skips the intro and turns off the ambience.
- Visible focus rings, labelled controls, and layouts that work at 360px.

## Run it

Requirements: Node 22+, Docker (for Postgres).

```bash
cp .env.example .env
npm install
npm run db:up        # Postgres 17 on localhost:5434 (plus a diyadash_test database)
npm run db:migrate
npm run db:seed
npm run dev          # API on :4000, web on http://localhost:5173
```

Vite proxies `/api` to the API, so cookies and SSE are same-origin in development. Want the tracker to finish faster? Lower `FULFIL_*_SECONDS` in `.env`.

Other database scripts: `npm run db:generate` (new migration from `schema.ts`), `npm run db:reset` (drop, migrate, seed; refuses in production), `npm run db:down`.

## Test and build

```bash
npm run typecheck    # tsc --noEmit in both apps
npm test             # Vitest + Supertest against the real diyadash_test database (fast clock)
npm run build        # web (Vite) then API (tsc)
npm start            # production: the API also serves apps/web/dist with an SPA fallback
```

End-to-end, in a headless browser, with `npm run dev` running:

```bash
npx playwright install chromium   # once
npm run e2e                       # full flow, screenshots in e2e/screenshots, fails on console errors
npm run e2e:frames                # exports one frame per film beat to e2e/screenshots/frames
```

`npm run e2e` walks the whole journey: intro, filter, bag, register, checkout, all four tracker stages, the wheel, a wish, the orders list, the festival pages and 360px layouts. The tracker step waits for the clock, so start the API with short `FULFIL_*_SECONDS` values to keep it quick.

## Folder layout

```
apps/
  api/
    drizzle/            generated SQL migrations
    src/
      db/               schema.ts, client, migrate, seed (+ seed-data), reset
      lib/              auth (JWT cookie), pricing & coupons, prizes, fulfilment clock, http errors
      routes/           auth, catalog, orders (+ SSE, spin), rewards & coupons, community (wishes, diyas, rangolis)
      app.ts            Express app (Helmet, CORS, rate limits, error handler, SPA in production)
      server.ts         listen + graceful shutdown
    test/               Vitest + Supertest suites
  web/
    src/
      engine/           math, gfx (shared ctx, withCtx), pieces, scenes (film + tracker), wall, rangoli
      components/       StageCanvas, ProductCard, BagDrawer, FilmOverlay, Ambience, SpinWheel, WishCard…
      pages/            Home, Auth, Checkout, Order, Orders, Wish*, Festival, DiyaWall, Rangoli*, NotFound
      stores/           cart (persisted), ui, festive (Zustand)
      lib/              api client, queries (TanStack Query), formatting, sound, storage, wish copy
e2e/                    Playwright flow and film-frame export
docker-compose.yml      Postgres for development and tests
```

## API

All routes are under `/api`, take and return JSON, and validate input with Zod. Errors look like `{ "error": "message", "details": { "field": "message" } }`.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health` | – | Pings the database |
| POST | `/auth/register` | – | `name` 2–60, `email`, `password` 8+. Sets the session cookie. Rate-limited |
| POST | `/auth/login` | – | Case-insensitive email. Generic failure message. Rate-limited |
| POST | `/auth/logout` | – | Clears the cookie |
| GET | `/auth/me` | optional | `{ user }`, or `{ user: null }` when signed out |
| GET | `/categories` | – | Eight categories in order |
| GET | `/products?category=&q=` | – | Filter by category slug. `q` is an escaped ILIKE over name, subtitle and category |
| GET | `/products/:slug` | – | 404 when missing |
| POST | `/orders` | required | `{ items, address, couponCode?, giftMessage? }`. Merges lines, prices on the server, ₹29 delivery under ₹499. Transactional conditional stock decrement (409 when short). Redeems rewards atomically |
| GET | `/orders` | required | Your latest 50 orders |
| GET | `/orders/:id` | owner | Includes `tracking` and `reward`. 404 for other users' orders and malformed ids |
| GET | `/orders/:id/stream` | owner | SSE: one tick per second `{ status, stageProgress, elapsedSeconds, etaSeconds, totalSeconds, progress }`. Closes when delivered |
| POST | `/orders/:id/spin` | owner | Delivered orders only, once per order. Returns `{ prizeIndex, reward }` |
| GET | `/prizes` | – | The 8 wheel segments |
| GET | `/coupons` | – | Public offers |
| POST | `/coupons/validate` | optional | `{ code, items }` → discount and totals, priced on the server |
| GET | `/rewards` | required | Your rewards and the unused count |
| POST | `/wishes` | optional | `{ toName, fromName, message ≤240, theme, lang }`. Random 8-character slug |
| GET | `/wishes/:slug` | – | Atomically increments `views`. 404 when missing |
| GET / POST | `/diyas` | – | Latest 300 and the total / light one (`name` ≤30, `message` ≤80). POST is rate-limited |
| GET / POST | `/rangolis` | – | Gallery of the latest 24 / save `{ name, folds 6\|8\|12\|16, mirror, strokes }` (≤300 strokes, ≤12,000 points, coordinates in ±1000) |
| GET | `/rangolis/:slug` | – | Increments `views` |

Fulfilment is a **stateless clock**. An order's status is derived from the time since it was created (placed 6 s, packing 10 s, on the way 18 s by default; configurable). It is written back to the database lazily whenever the order is read. Nothing runs in the background.

Money is stored in integer paise everywhere. Percentage discounts round down to whole rupees.

## Production notes

- **`JWT_SECRET`** must be at least 32 characters; the API refuses to start otherwise. Use a long random value, e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Rotating it signs everyone out.
- **`CORS_ORIGIN`** lists the allowed browser origins (comma-separated). When the API serves the built web app itself, set it to that same origin.
- Set `NODE_ENV=production`. That makes the session cookie `Secure`, so serve over HTTPS and run behind a proxy that sets `X-Forwarded-*` (`trust proxy` is enabled in production).
- Run `npm run db:migrate` on deploy. Don't run `db:reset` or `db:seed` against real data (seed resets stock to 100).
- Rate limits use in-memory stores. If you run more than one instance, put them on a shared store such as Redis.
- **To make this real**, you would replace:
  - the simulated checkout with a payment provider (create a payment intent server-side and confirm the order on its webhook);
  - the fulfilment clock (`apps/api/src/lib/fulfilment.ts`) with real dispatch, picking and rider events that update order status. The SSE stream and tracker can stay as they are;
  - the public wish, diya and rangoli endpoints with moderation, and add abuse controls before opening them to the world.
- The film, icons and scenes are all drawn in code; there are no image assets to license.

## Deploying to Vercel

One Vercel project serves both apps: [vercel.json](vercel.json) builds the web app into `apps/web/dist` (served as a SPA) and runs the Express API as a serverless function ([api/index.js](api/index.js)) behind `/api/*`. The order tracker's SSE stream ends at delivery (about 34 s by default), well inside the function's 60 s limit, and the page falls back to polling if a stream drops.

**Project settings:** Root Directory `./`, Framework Preset **Other**. Leave Build Command, Output Directory and Install Command unset so `vercel.json` controls them.

**Environment variables** (Settings → Environment Variables, all environments):

| Name | Value |
|---|---|
| `DATABASE_URL` | From a hosted Postgres, e.g. Storage → Neon → Connect (added for you) |
| `JWT_SECRET` | Optional on Vercel (derived from `DATABASE_URL` when unset); set 32+ random characters to choose your own |
| `CORS_ORIGIN` | The site's own URL, e.g. `https://your-app.vercel.app` |

Don't set `NODE_ENV`: Vercel sets it to `production` at runtime, and setting it at build time makes `npm ci` skip the build tools. Never put secrets in `VITE_` variables; the web app needs none (it calls the API on the same origin). Until `DATABASE_URL` exists, the API answers 503 with a clear message.

**The build never touches the database** (`vercel-build` is just `npm run build`). Migrate as a separate, deliberate step from your machine:

```bash
vercel env pull .env.production.local --environment=production   # gitignored
npm run db:migrate:prod    # checks the connection, then applies pending Drizzle migrations
npm run db:seed:prod       # first deploy only: loads the catalog, coupons and demo reviews
rm .env.production.local
```

Re-running the seed upserts the catalog and resets stock to 100, so run it once on a fresh database, not on every deploy. Never run `db:reset` in production.
