# Ledgerly

Ledgerly is a personal local-first finance app. It helps track transactions, budgets, savings goals, and spending analytics — all without accounts or cloud sync.

The app runs locally and keeps data in a single SQLite file on the machine. No accounts, no cloud, no telemetry.

## Tech stack

* Node.js + Express + TypeScript + SQLite (built-in `node:sqlite`)
* React + TypeScript + Vite
* Hand-rolled SVG charts (no chart library)
* Headless smoke tests (jsdom)

## Requirements

* Node.js 22.13 or newer
* npm

## Setup

Install the dependencies (single root install):

```bash
npm install
```

Load the demo dataset (optional — 458 transactions, budgets, and goals):

```bash
npm run seed
```

## Run locally

Start both the API server and the Vite dev client together:

```bash
npm run dev
```

…or run them separately in two terminals:

```bash
npm run dev:server   # API on http://localhost:8734
npm run dev:client   # client on http://localhost:8735 (proxies /api to the server)
```

## Production

Build everything (server + client):

```bash
npm run build
```

Start the production server (it serves the built client on the same origin):

```bash
npm run start        # http://localhost:8734
```

## Useful commands

```bash
npm run dev          # run API + client dev servers together
npm run dev:server   # run only the API server
npm run dev:client   # run only the Vite dev client
npm run seed         # rebuild the demo dataset (wipes data first)
npm run build        # build server and client
npm run build:server # compile server/ to dist/server (tsc)
npm run build:client # build the client to dist/client (vite)
npm run start        # run the production server
npm run preview      # preview the built client (vite preview)
npm run smoke        # build client and run headless smoke test
npm run typecheck    # check TypeScript for server and client
```

## Project layout

```
ledgerly/
├── server/            Express API, SQLite, and seeder (Node/TypeScript)
│   ├── index.ts       API entry — also serves the built client
│   ├── db.ts          single SQLite connection + schema
│   ├── seed.ts        demo dataset
│   └── routes/        transactions, accounts, budgets, goals, analytics…
├── src/               React client (pages, components, styles)
├── scripts/           smoke test
├── data/              local SQLite data (gitignored, portable)
│   └── database.sqlite
├── index.html         client entry
├── vite.config.ts     Vite + dev proxy (/api → :8734)
├── tsconfig.json      client TypeScript config
└── tsconfig.server.json  server TypeScript config (compiles to dist/server)
```

Build output goes to `dist/` (`dist/client` from Vite, `dist/server` from tsc).

Ledgerly is made for personal, local use. Your data stays on your machine.