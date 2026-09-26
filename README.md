# Ledgerly

Local-first personal finance app — transactions, budgets, savings goals, and spending analytics. No accounts, no cloud, no telemetry. Data lives in a single SQLite file on your machine.

## Requirements

- Node.js 22.5+ and npm

## Setup

```bash
npm install
npm run seed   # optional demo data
```

## Run

```bash
npm run dev     # API (:8734) + client (:8735)
npm run build   # build server + client
npm run start   # production server on :8734 (serves the built client)
```

## More commands

```bash
npm run dev:server   # API only
npm run dev:client   # Vite client only
npm run smoke        # build client + run headless smoke test
npm run typecheck    # TypeScript check (server + client)
```

## Layout

```
server/   Express API + SQLite (single connection, single file in data/)
src/      React client (pages, components, styles)
scripts/  smoke test
data/     local SQLite database (gitignored)
dist/     build output (gitignored)
```

## License

[MIT](LICENSE) © 2026 Armaan Verma
