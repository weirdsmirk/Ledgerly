import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { transactionsRouter } from './routes/transactions';
import { categoriesRouter } from './routes/categories';
import { accountsRouter } from './routes/accounts';
import { budgetsRouter } from './routes/budgets';
import { goalsRouter } from './routes/goals';
import { analyticsRouter } from './routes/analytics';
import { settingsRouter } from './routes/settings';
import { db, DB_PATH, PROJECT_ROOT } from './db';

const app = express();
const PORT = Number(process.env.PORT) || 8734;

/* ------------------------------------------------------------------ */
/* Security hardening                                                  */
/* ------------------------------------------------------------------ */

// Don't advertise the framework.
app.disable('x-powered-by');

// This is a strictly local, single-user dashboard. Reject any Host header
// that isn't a local address so a malicious page can't point a remote host
// (or DNS-rebinding trick) at this origin and read/write the user's data.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
app.use((req: Request, res: Response, next: NextFunction) => {
  const host = String(req.headers.host ?? '').split(':')[0].toLowerCase();
  if (host && !LOCAL_HOSTS.has(host)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

// CORS: only allow the local dev/preview origins (same localhost machine).
// Anything else is a mistake; do not open this up to arbitrary sites.
app.use(
  cors({
    origin: ['http://localhost:8734', 'http://127.0.0.1:8734', 'http://localhost:8735', 'http://127.0.0.1:8735'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

// Minimal security headers (applied to every response).
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
  next();
});

// API responses carry financial data — never cache them.
app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Keep the global JSON limit small (2 MB — big enough for normal requests);
// the CSV import endpoints mount their own larger limit below.
app.use(express.json({ limit: '2mb' }));

app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/settings', settingsRouter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve the built client when it exists (production).
const clientDist = path.join(PROJECT_ROOT, 'dist', 'client');
if (fs.existsSync(clientDist)) {
  // CSP for the production bundle. 'unsafe-inline' styles are required by the
  // React app's injected styles; fonts come from Google Fonts.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'"
    );
    next();
  });

  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 for unknown API routes.
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler — never leak internal details, and honor the
// status code that body-parser / validation sets (400 malformed JSON, 413 too large).
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err?.message ?? err);
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(status).json({ error: status >= 500 ? 'Something went wrong' : (err?.message ?? 'Bad request') });
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Finance dashboard API listening on http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});

/* Graceful shutdown: close the server and the SQLite connection on Ctrl-C. */
function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down…`);
  server.close(() => {
    try {
      db.close();
    } catch {
      /* already closed */
    }
    process.exit(0);
  });
  // Force-exit if close hangs (e.g. an in-flight long request).
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app };
