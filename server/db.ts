import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

export type TransactionType = 'income' | 'expense';
export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment';
export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly';
export type RecurringPattern = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// Project root is the nearest ancestor directory that holds package.json.
// Works whether this module runs from server/ (dev / ts-node) or
// dist/server (compiled), so paths never depend on the build layout.
export function findProjectRoot(from: string = __dirname): string {
  let dir = from;
  for (;;) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('Could not locate the project root (package.json)');
    dir = parent;
  }
}

export const PROJECT_ROOT = findProjectRoot();

// Single SQLite database at the project root's data/ folder.
export const DB_PATH =
  process.env.DB_PATH || path.join(PROJECT_ROOT, 'data', 'database.sqlite');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
// Rollback journal (the default) rather than WAL: keeps the database to a
// single data/database.sqlite file — no -wal/-shm sidecars. Fine for this
// single-connection, local, single-user app.
db.exec('PRAGMA journal_mode = DELETE');
db.exec('PRAGMA foreign_keys = ON');

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  currency TEXT NOT NULL DEFAULT 'USD',
  display_name TEXT NOT NULL DEFAULT 'Jordan Davis',
  workspace_name TEXT NOT NULL DEFAULT 'Personal finances'
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT '📁',
  is_default BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('checking','savings','credit_card','cash','investment')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  goal_id INTEGER REFERENCES goals(id),
  amount REAL NOT NULL CHECK(amount > 0),
  description TEXT,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  is_recurring BOOLEAN DEFAULT 0,
  recurring_pattern TEXT CHECK(recurring_pattern IN ('daily','weekly','monthly','quarterly','yearly')),
  status TEXT DEFAULT 'cleared' CHECK(status IN ('pending','cleared')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  limit_amount REAL NOT NULL CHECK(limit_amount > 0),
  period TEXT NOT NULL CHECK(period IN ('monthly','quarterly','yearly')),
  start_date TEXT NOT NULL,
  alert_threshold INTEGER DEFAULT 80,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  target_amount REAL NOT NULL CHECK(target_amount > 0),
  current_amount REAL DEFAULT 0,
  target_date TEXT,
  achieved BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recurring_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  occurrence_date TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('completed','skipped')),
  amount REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transaction_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_goal ON transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
`);

/* ------------------------------------------------------------------ */
/* Default seed data                                                   */
/* ------------------------------------------------------------------ */

export const DEFAULT_CATEGORIES: Array<{ name: string; color: string; icon: string }> = [
  { name: 'Food', color: '#ef4444', icon: '🍔' },
  { name: 'Transport', color: '#f59e0b', icon: '🚗' },
  { name: 'Utilities', color: '#10b981', icon: '💡' },
  { name: 'Entertainment', color: '#8b5cf6', icon: '🎬' },
  { name: 'Health', color: '#06b6d4', icon: '🏥' },
  { name: 'Shopping', color: '#ec4899', icon: '🛍️' },
  { name: 'Savings', color: '#3b82f6', icon: '💰' },
  { name: 'Income', color: '#22c55e', icon: '💵' },
  { name: 'Other', color: '#64748b', icon: '📁' },
];

function seed() {
  const user = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: number } | undefined;
  let userId: number;
  if (!user) {
    userId = Number(
      db.prepare("INSERT INTO users (username) VALUES ('default')").run().lastInsertRowid
    );
  } else {
    userId = user.id;
  }

  const insertCat = db.prepare(
    'INSERT OR IGNORE INTO categories (user_id, name, color, icon, is_default) VALUES (?, ?, ?, ?, 1)'
  );
  for (const c of DEFAULT_CATEGORIES) {
    insertCat.run(userId, c.name, c.color, c.icon);
  }

  // Make sure we have a default account to anchor transactions.
  const accountCount = db
    .prepare('SELECT COUNT(*) as count FROM accounts WHERE user_id = ?')
    .get(userId) as { count: number };
  if (accountCount.count === 0) {
    db.prepare("INSERT INTO accounts (user_id, name, type) VALUES (?, 'Checking', 'checking')").run(
      userId
    );
  }
}

seed();

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

export const DEFAULT_USER_ID = 1;

export function getUser(): number {
  const row = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get() as { id: number };
  return row.id;
}

/** Validate a YYYY-MM-DD date string and return it normalized, or null. */
export function normalizeDate(value: string | undefined | null): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  if (y < 1900 || y > 9999 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** An ISO-ish sortable date up to the minute (YYYY-MM-DD HH:MM) or date only for transaction dates. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function isValidPeriod(p: string): p is BudgetPeriod {
  return p === 'monthly' || p === 'quarterly' || p === 'yearly';
}

export function isValidPattern(p: string): p is RecurringPattern {
  return p === 'daily' || p === 'weekly' || p === 'monthly' || p === 'quarterly' || p === 'yearly';
}

export function isValidAccountType(t: string): t is AccountType {
  return ['checking', 'savings', 'credit_card', 'cash', 'investment'].includes(t);
}

/** Current period bounds for the given budget, relative to the reference date (default today). */
export function getBudgetPeriodBounds(
  period: BudgetPeriod,
  startDate: string,
  refDate: Date = new Date()
): { start: string; end: string } {
  const ref = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const [sy, sm] = startDate.split('-').map(Number);
  let cursor: Date;
  switch (period) {
    case 'monthly':
      cursor = new Date(sy, sm - 1, 1);
      break;
    case 'quarterly':
      cursor = new Date(sy, Math.floor((sm - 1) / 3) * 3, 1);
      break;
    case 'yearly':
      cursor = new Date(sy, 0, 1);
      break;
  }
  if (ref < cursor) {
    return { start: toDateKey(cursor), end: toDateKey(nextPeriodStart(period, cursor)) };
  }
  // Advance the window by whole periods until it covers the reference date.
  let nxt = nextPeriodStart(period, cursor);
  while (nxt <= ref) {
    cursor = nxt;
    nxt = nextPeriodStart(period, cursor);
  }
  return { start: toDateKey(cursor), end: toDateKey(nxt) };
}

function nextPeriodStart(period: BudgetPeriod, from: Date): Date {
  switch (period) {
    case 'monthly':
      return new Date(from.getFullYear(), from.getMonth() + 1, 1);
    case 'quarterly':
      return new Date(from.getFullYear(), from.getMonth() + 3, 1);
    case 'yearly':
      return new Date(from.getFullYear() + 1, 0, 1);
  }
}

/** Compute the next occurrence date for a recurring transaction. Handles month-end clamping. */
export function nextOccurrence(pattern: RecurringPattern, fromISO: string): string {
  const [y, m, d] = fromISO.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const targetDay = d;
  const next = new Date(base);
  switch (pattern) {
    case 'daily':
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case 'weekly':
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case 'monthly':
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case 'quarterly':
      next.setUTCMonth(next.getUTCMonth() + 3);
      break;
    case 'yearly':
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      break;
  }
  // Clamp to last day of month when the target day doesn't exist (e.g. Jan 31 -> Feb 28/29).
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  if (targetDay > lastDay) {
    next.setUTCDate(lastDay);
  } else {
    // Preserve the original day-of-month where possible.
    next.setUTCDate(Math.min(targetDay, lastDay));
  }
  return toDateKey(next);
}

/** Amount of income transactions in a month, used for goal projections. */
export function averageMonthlyCashflow(
  userId: number,
  months: number = 3
): { income: number; savings: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const startISO = toDateKey(start);
  const rows = db
    .prepare(
      `SELECT type, COALESCE(SUM(amount),0) AS total
       FROM transactions
       WHERE user_id = ? AND date >= ? AND type IN ('income','expense')
       GROUP BY type`
    )
    .all(userId, startISO) as Array<{ type: TransactionType; total: number }>;
  const income = rows.find((r) => r.type === 'income')?.total ?? 0;
  const expense = rows.find((r) => r.type === 'expense')?.total ?? 0;
  return { income, savings: income - expense };
}