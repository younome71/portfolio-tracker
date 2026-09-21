# Portfolio Tracker

Track personal and family investment portfolios in INR — equities (NSE/BSE), fixed deposits, bonds, and gold/silver — with live-ish market prices, day change, allocation charts, and a combined multi-portfolio view.

This README reflects the **post-hardening** app (API envelope, session persistence, Yahoo Finance price job, Helmet/CORS/rate limits). Deploy **client and server together**; an old client against a new API (or the reverse) will break.

---

## Features

- **Auth** — Register / login with JWT; optional `parent` or `child` role; session rehydrates from `localStorage` on refresh
- **Portfolios** — Personal and family portfolios; parents link family members; children see portfolios they belong to
- **Holdings** — Add, repeat-buy, sell/redeem, or remove assets (`EQUITY`, `FD`, `BOND`, `COMMODITY`)
- **Fixed income** — FD/bond maturity and interest; simple-interest expected value
- **Dashboard** — Portfolio cards, totals / P&L, and market movers from recent price history
- **Combined view** — Aggregated holdings and allocation across portfolios
- **Price updates** — Hourly cron + boot run via `yahoo-finance2` (NSE `.NS` / BSE `.BO`); skips weekends and outside 09:15–15:30 IST unless forced by admin

---

## Stack

| Layer | Tech |
|--------|------|
| **Client** | Next.js 15 (Pages Router), React 19, Redux Toolkit, Mantine 6, Tailwind 4, Recharts / Chart.js |
| **Server** | Express 5, MongoDB (Mongoose), JWT, Helmet, express-rate-limit, Winston, `yahoo-finance2`, node-cron |

---

## Repo layout

```
portfolio-tracker/
├── client/          # Next.js UI
├── server/          # Express API
├── CHANGES.md       # Hardening pass notes
└── .gitignore
```

---

## Prerequisites

- Node.js 18+
- MongoDB (Atlas or local)

---

## Local setup

### 1. Server

```bash
cd server
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET, CLIENT_URL, ADMIN_KEY
npm install
npm start
```

API listens on `PORT` (default `5000`). Process exits if `MONGODB_URI` or `JWT_SECRET` is missing.

### 2. Client

```bash
cd client
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | Where | Purpose |
|--------|--------|---------|
| `npm start` | `server/` | Run API |
| `npm run dev` | `client/` | Next.js development |
| `npm run build` / `npm start` | `client/` | Production Next.js build |

---

## Environment variables

### Server (`server/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `CLIENT_URL` | Yes | CORS allowlist origin (e.g. `http://localhost:3000`) |
| `PORT` | No | API port (default `5000`) |
| `ADMIN_KEY` | Yes* | Header value for manual price job |
| `NODE_ENV` | No | `development` / `production` |

\*Required to call the admin price endpoint. In production, set env on the host (`dotenv` is not loaded when `NODE_ENV=production`).

### Client (`client/.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | API base URL, e.g. `http://localhost:5000/api` |

Never commit real `.env` / `.env.local` files. Use the `.env.example` templates only.

---

## API overview

Successful responses use a common envelope:

```json
{
  "success": true,
  "data": {},
  "requestId": "..."
}
```

Errors:

```json
{
  "success": false,
  "error": {
    "code": "PORTFOLIO_NOT_FOUND",
    "message": "Portfolio not found",
    "details": {}
  },
  "requestId": "..."
}
```

### Ops

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/health` | Liveness |
| `GET` | `/ready` | Mongo connected |
| `GET` | `/` | API info |
| `POST` | `/api/admin/manual-update` | Price job; header `X-Admin-Key: <ADMIN_KEY>`; returns `202` |

### Auth (`/api/auth`)

| Method | Path |
|--------|------|
| `POST` | `/register` |
| `POST` | `/login` |

Rate limit: 20 requests / 15 minutes.

### Portfolio (`/api/portfolio`, JWT)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/` | List own + family portfolios |
| `POST` | `/` | Create |
| `PATCH` | `/:portfolioId` | Update |
| `POST` | `/:portfolioId/assets` | Add asset |
| `POST` | `/:portfolioId/sell` | Sell / redeem |
| `DELETE` | `/:portfolioId/assets/:assetId` | Remove asset |
| `GET` | `/:portfolioId/performance` | Performance history |

### User (`/api/user`, JWT)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/profile` | Current user (preferred) |
| `GET` | `/profile/:id` | Backward-compatible alias |
| `GET` / `POST` | `/family` | Family members (parent) |
| `DELETE` | `/family/:id` | Remove member (parent) |

General API rate limit: 300 requests / 15 minutes.

---

## Production notes

- Set `MONGODB_URI`, `JWT_SECRET`, `ADMIN_KEY`, `CLIENT_URL`, and `NODE_ENV=production` on the API host.
- Set `NEXT_PUBLIC_API_URL` to the live API base (including `/api`) for the client build.
- CORS allows `CLIENT_URL` (and localhost in development).
- Winston logs JSON to **stdout** (no log files in the repo).
- Manual price force (ignore market calendar):

  ```http
  POST /api/admin/manual-update
  X-Admin-Key: <ADMIN_KEY>
  ```

- If secrets were ever committed historically, rotate MongoDB credentials, `JWT_SECRET`, and `ADMIN_KEY` before treating the deploy as safe.

More detail on the hardening pass: see [CHANGES.md](./CHANGES.md).

---

## Not in this version

Password-reset email, full transaction ledger, digests/alerts, billing, and a full automated test suite are deferred.
