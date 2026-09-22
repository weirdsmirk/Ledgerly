# Personal Finance Dashboard

A full-stack, **local-first** personal finance app. Track transactions, budgets, savings goals, and spending analytics — all data lives in a single SQLite file on your machine. No accounts, no cloud, no telemetry.

- **Backend:** Node.js + Express + TypeScript + SQLite (via the built-in `node:sqlite` module)
- **Frontend:** React + TypeScript + Vite, hand-rolled SVG charts (no chart library)
- **Data:** one portable file — `backend/app.db`

---

## Quick start

Requires **Node.js ≥ 22.13** (uses the built-in `node:sqlite` module — no native compilation, no `better-sqlite3`).

```bash
# 1. Install dependencies
npm install --prefix backend
npm install --prefix frontend

# 2. Load the demo dataset (458 transactions, budgets, goals)
npm --prefix backend run seed

# 3. Start the API
npm --prefix backend run dev          # → http://localhost:8734

# 4. In a second terminal, start the frontend dev server
npm --prefix frontend run dev         # → http://localhost:8735
```

Open **http://localhost:8735**.

> **Port already in use?** The app uses deliberately unique ports — **8734** (API)
> and **8735** (web) — so it won't collide with common dev ports (3000, 3001,
> 5173, 8000…). If even those are taken, override with `PORT` (backend) and
> `VITE_API_URL` (frontend). See [Configuration](#configuration).
> The dev frontend only knows where the API is through `VITE_API_URL`, which
> defaults to `http://localhost:8734/api`.

### Build & run in production mode

The backend serves the built frontend on the same origin:

```bash
npm run build          # tsc + vite build in both packages
npm --prefix backend run start
```

Then open **http://localhost:8734** — API at `/api/*`, app at `/`.

---

## What's inside

### Pages
| Page | What it does |
| --- | --- |
| **Dashboard** | Account balance card, this month's totals, category donut, latest transactions |
| **Transactions** | Search, filter by type/category/account/status, date range, sort, pagination; add / edit / delete; mark pending ↔ cleared |
| **Budgets** | Monthly/quarterly/yearly budgets per category with live status bars, alert thresholds, period history |
| **Goals** | Savings goals with projected completion date; deposits/withdrawals flow through as transactions and adjust the projected date |
| **Analytics** | Monthly income/expense trend, spending by category, year-over-year comparison, auto-generated insights |
| **Settings** | Manage accounts and categories; CSV import (column mapping + fuzzy category match + duplicate detection with preview) and CSV export |

### API (all under `/api`)
| Prefix | Highlights |
| --- | --- |
| `/transactions` | CRUD, `?search&type&category_id&account_id&status&from&to&sort&page&per_page`, recurring occurrences, CSV import (preview + commit) & export |
| `/categories` | CRUD, protected defaults (`DELETE` blocked when category is default or has transactions) |
| `/accounts` | CRUD, balances computed from transactions, `DELETE` blocked when the account has transactions |
| `/budgets` | CRUD, `/status` (live spend), `/history` (per-period totals) |
| `/goals` | CRUD, `/projection`, deposits (`POST /:id/deposits`) |
| `/analytics` | `/summary`, `/breakdown`, `/trends`, `/comparison`, `/insights` |
| `/health` | Liveness check |

### Recurring transactions
Create a transaction with `is_recurring: true` and a pattern (`daily` / `weekly` / `monthly` / `quarterly` / `yearly`). The API can
return `GET /next-occurrence`, and `POST /:id/occurrences` materializes the next occurrence as a real transaction and advances the schedule. Marking an occurrence as completed creates the transaction automatically.

---

## Configuration

Both processes read `.env` files from their own directories; copy the examples to start:

```bash
cp backend/.env.example  backend/.env       # optional
cp frontend/.env.example frontend/.env      # optional
```

| Variable | Where | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | backend | `8734` | API port. In production the same port serves the built UI. |
| `DB_PATH` | backend | `backend/app.db` | SQLite file location *(use an absolute path — relative paths resolve from the working directory)* |
| `VITE_API_URL` | frontend | dev: `http://localhost:8734/api`, prod: `/api` | Where the browser calls the API. Must be set **before** `npm --prefix frontend run build` for a production build on a non-default port. |

---

## Scripts

From the repo root (convenience wrappers around the package scripts):

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs API + Vite dev server together |
| `npm run seed` | Rebuilds the demo dataset (wipes all data first) |
| `npm run build` | Type-checks and builds both packages |
| `npm run start` | Starts the compiled backend (serves built UI too) |
| `npm run smoke` | Builds the frontend and runs the headless jsdom smoke test against a live API |
| `npm run typecheck` | `tsc --noEmit` for both packages |

Package-level equivalents live in `backend/package.json` and `frontend/package.json` (`dev`, `build`, `start`, `seed`, `typecheck`, `smoke`).

---

## Data & backup

- Everything is in one file: **`backend/app.db`** (+ `-wal` / `-shm` alongside while a server is running).
- **Back up** by copying `app.db` while no server is running (or run `PRAGMA wal_checkpoint(TRUNCATE)` first).
- The demo seeder (`npm run seed`) wipes and recreates data, so you can always
  return to a pristine state. Don't run it on data you care about.
- CSV import is transactional: the preview endpoint validates every row, mapping
  and duplicate detection run before anything is written, and the commit wraps
  all inserts in a single SQL transaction.

---

## Testing

- **Backend integration tests** (`python3` against the real API) cover budget
  period math, recurring-mark-completed, goal-linked transactions, protected
  deletes, pending status, and account immutability on edit.
- **Frontend smoke test** (`frontend/scripts/smoke-test.mjs`, `npm run smoke`)
  renders the production bundle in jsdom, drives every nav page against a live
  API, and fails on any runtime error.

## Project layout

```
backend/
  src/
    index.ts          Express app: routers, static serving, error handling
    db.ts             Schema, connections, date/period/recurring helpers
    seed.ts           Demo data seeder
    routes/           transactions, categories, accounts, budgets, goals, analytics
  dist/               Compiled output
  app.db              Your data (gitignored, portable)
frontend/
  src/
    api.ts            Typed API client
    pages/            Dashboard, Transactions, Budgets, Goals, Analytics, Settings, TransactionForm
    components/       charts, CsvImportModal, Layout, ui
    styles.css        Design system (forest sidebar, mint ground, white plates)
  scripts/smoke-test.mjs
```