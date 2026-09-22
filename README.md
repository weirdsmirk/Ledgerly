# Ledgerly

Ledgerly is my personal local-first finance app. It helps me track transactions, budgets, savings goals, and spending analytics — all without accounts or cloud sync.

The app runs locally and keeps my data in a single SQLite file on my machine. No accounts, no cloud, no telemetry.

## Tech stack

* Node.js + Express + TypeScript + SQLite (built-in `node:sqlite`)
* React + TypeScript + Vite
* Hand-rolled SVG charts (no chart library)
* Vitest (frontend smoke tests)

## Requirements

* Node.js 22.13 or newer
* npm

## Setup

Install the dependencies:

```bash
npm install --prefix backend
npm install --prefix frontend
```

Load the demo dataset (optional — 458 transactions, budgets, and goals):

```bash
npm --prefix backend run seed
```

## Run locally

Start the API:

```bash
npm --prefix backend run dev
```

In a second terminal, start the frontend:

```bash
npm --prefix frontend run dev
```

The app will run at the address shown in the terminal (default: `http://localhost:8735`, API at `http://localhost:8734`).

## Production

Build the app:

```bash
npm run build
```

Start the local production server (backend serves the built frontend):

```bash
npm --prefix backend run start
```

## Useful commands

```bash
npm run dev          # run API + frontend dev servers together
npm run seed         # rebuild the demo dataset (wipes data first)
npm run build        # type-check and build both packages
npm run start        # run production server
npm run smoke        # build frontend and run headless smoke test
npm run typecheck    # check TypeScript in both packages
```

## Project layout

* `backend/` contains the Express API, SQLite database, and seeder.
* `frontend/` contains the React app, pages, components, and styles.
* `backend/app.db` is your data file (gitignored, portable).

Ledgerly is made for personal, local use. Your data stays on your machine.
