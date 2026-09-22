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

const app = express();
const PORT = Number(process.env.PORT) || 8734;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

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

// Serve the built frontend when it exists (production mode).
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Centralized error handler — never leak internal details.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err?.message ?? err);
  res.status(500).json({ error: 'Something went wrong' });
});

// 404 for unknown API routes.
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Finance dashboard API listening on http://localhost:${PORT}`);
  console.log(`Database: ${process.env.DB_PATH || 'backend/app.db'}`);
});

export { app };