import { Router, Request, Response } from 'express';
import { db, getUser } from '../db';

export const settingsRouter = Router();

/* Keep in sync with CURRENCIES in frontend/src/types.ts. */
const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'INR', 'CHF',
  'SEK', 'NOK', 'DKK', 'NZD', 'SGD', 'MXN', 'BRL', 'ZAR', 'KRW',
];

interface SettingsRow {
  user_id: number;
  currency: string;
  display_name: string;
  workspace_name: string;
}

/** Return the user's settings row, creating it with defaults on first access. */
function ensureSettings(): SettingsRow {
  const userId = getUser();
  db.prepare('INSERT OR IGNORE INTO settings (user_id) VALUES (?)').run(userId);
  return db
    .prepare('SELECT user_id, currency, display_name, workspace_name FROM settings WHERE user_id = ?')
    .get(userId) as unknown as SettingsRow;
}

/* GET /api/settings */
settingsRouter.get('/', (_req: Request, res: Response) => {
  res.json(ensureSettings());
});

/* PUT /api/settings - partial update of currency / display name / workspace name */
settingsRouter.put('/', (req: Request, res: Response) => {
  const current = ensureSettings();
  const next = { ...current };

  if (req.body?.currency !== undefined) {
    const code = String(req.body.currency).trim().toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(code)) {
      return res.status(400).json({ error: 'Unsupported currency' });
    }
    next.currency = code;
  }

  if (req.body?.display_name !== undefined) {
    const value = String(req.body.display_name).trim();
    if (value.length > 80) return res.status(400).json({ error: 'Display name is too long (max 80 characters)' });
    next.display_name = value || 'Jordan Davis';
  }

  if (req.body?.workspace_name !== undefined) {
    const value = String(req.body.workspace_name).trim();
    if (value.length > 80) return res.status(400).json({ error: 'Workspace name is too long (max 80 characters)' });
    next.workspace_name = value || 'Personal finances';
  }

  db.prepare('UPDATE settings SET currency = ?, display_name = ?, workspace_name = ? WHERE user_id = ?')
    .run(next.currency, next.display_name, next.workspace_name, next.user_id);

  res.json(next);
});

/* DELETE /api/settings/data - permanently erase all financial data.
   Removes transactions, recurring rules/overrides, budgets and goals.
   Accounts, categories and preferences are preserved so the app stays usable. */
settingsRouter.delete('/data', (_req: Request, res: Response) => {
  const userId = getUser();
  const wiped: Record<string, number> = {};
  const del = (label: string, sql: string, ...params: (string | number)[]) => {
    wiped[label] = Number(db.prepare(sql).run(...params).changes);
  };

  db.exec('BEGIN');
  try {
    // Children first to satisfy foreign keys.
    del('recurring_overrides', 'DELETE FROM recurring_overrides WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id = ?)', userId);
    del('transactions', 'DELETE FROM transactions WHERE user_id = ?', userId);
    del('budgets', 'DELETE FROM budgets WHERE user_id = ?', userId);
    del('goals', 'DELETE FROM goals WHERE user_id = ?', userId);
    del('accounts', 'DELETE FROM accounts WHERE user_id = ?', userId);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.json({ message: 'All data erased', wiped });
});