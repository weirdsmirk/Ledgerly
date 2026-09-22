import { Router, Request, Response } from 'express';
import { db, getUser, isValidPeriod, getBudgetPeriodBounds, toDateKey } from '../db';
import type { BudgetPeriod } from '../db';

export const budgetsRouter = Router();

interface BudgetRow {
  id: number;
  category_id: number;
  limit_amount: number;
  period: BudgetPeriod;
  start_date: string;
  alert_threshold: number;
}

function spendInRange(categoryId: number, start: string, end: string): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE category_id = ? AND type = 'expense' AND date >= ? AND date < ?`
    )
    .get(categoryId, start, end) as { total: number };
  return row.total;
}

function decorate(budget: BudgetRow & { category_name?: string; category_icon?: string; category_color?: string }) {
  const bounds = getBudgetPeriodBounds(budget.period, budget.start_date);
  const currentSpent = spendInRange(budget.category_id, bounds.start, bounds.end);
  const percentageUsed = budget.limit_amount > 0 ? (currentSpent / budget.limit_amount) * 100 : 0;
  const remaining = Math.max(0, budget.limit_amount - currentSpent);

  let status: 'safe' | 'warning' | 'danger';
  const threshold = budget.alert_threshold ?? 80;
  if (percentageUsed >= threshold) status = 'danger';
  else if (percentageUsed >= 50) status = 'warning';
  else status = 'safe';

  return {
    ...budget,
    current_spent: Math.round(currentSpent * 100) / 100,
    percentage_used: Math.round(percentageUsed * 100) / 100,
    remaining: Math.round(remaining * 100) / 100,
    over_by: Math.max(0, Math.round((currentSpent - budget.limit_amount) * 100) / 100),
    period_start: bounds.start,
    period_end: bounds.end,
    status,
    alert_threshold: budget.alert_threshold ?? 80,
  };
}

/* GET /api/budgets - list budgets with live status */
budgetsRouter.get('/', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const rows = db
    .prepare(
      `SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = ?
       ORDER BY c.name ASC`
    )
    .all(userId) as any[];
  res.json(rows.map(decorate));
});

/* POST /api/budgets - create */
budgetsRouter.post('/', (req: Request, res: Response) => {
  const userId = getUser();
  const categoryId = Number(req.body?.category_id);
  const limitAmount = Number(req.body?.limit_amount);
  const period = req.body?.period;
  const startDate = req.body?.start_date;
  const alertThreshold = req.body?.alert_threshold !== undefined ? Number(req.body.alert_threshold) : 80;

  const category = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(categoryId, userId);
  if (!category) return res.status(400).json({ error: 'Category not found' });
  if (!Number.isFinite(limitAmount) || limitAmount <= 0) {
    return res.status(400).json({ error: 'Limit amount must be a positive number' });
  }
  if (!isValidPeriod(period)) {
    return res.status(400).json({ error: 'Period must be monthly, quarterly or yearly' });
  }
  const start = /^\d{4}-\d{2}-\d{2}$/.test(String(startDate)) ? startDate : toDateKey(new Date());
  if (!Number.isFinite(alertThreshold) || alertThreshold < 1 || alertThreshold > 100) {
    return res.status(400).json({ error: 'Alert threshold must be between 1 and 100' });
  }

  const result = db
    .prepare(
      `INSERT INTO budgets (user_id, category_id, limit_amount, period, start_date, alert_threshold)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(userId, categoryId, limitAmount, period, start, alertThreshold);
  res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Budget created' });
});

/* PUT /api/budgets/:id */
budgetsRouter.put('/:id', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(id, userId) as any;
  if (!budget) return res.status(404).json({ error: 'Budget not found' });

  const limitAmount = req.body?.limit_amount !== undefined ? Number(req.body.limit_amount) : budget.limit_amount;
  const alertThreshold = req.body?.alert_threshold !== undefined ? Number(req.body.alert_threshold) : budget.alert_threshold;
  const period = req.body?.period !== undefined ? req.body.period : budget.period;
  const categoryId = req.body?.category_id !== undefined ? Number(req.body.category_id) : budget.category_id;
  const startDate = req.body?.start_date !== undefined ? req.body.start_date : budget.start_date;

  if (!Number.isFinite(limitAmount) || limitAmount <= 0) {
    return res.status(400).json({ error: 'Limit amount must be a positive number' });
  }
  if (!isValidPeriod(period)) return res.status(400).json({ error: 'Invalid period' });
  if (!Number.isFinite(alertThreshold) || alertThreshold < 1 || alertThreshold > 100) {
    return res.status(400).json({ error: 'Alert threshold must be between 1 and 100' });
  }
  const category = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(categoryId, userId);
  if (!category) return res.status(400).json({ error: 'Category not found' });

  db.prepare(
    `UPDATE budgets SET limit_amount = ?, alert_threshold = ?, period = ?, category_id = ?, start_date = ? WHERE id = ?`
  ).run(limitAmount, alertThreshold, period, categoryId, startDate, id);
  res.json({ message: 'Budget updated' });
});

/* DELETE /api/budgets/:id */
budgetsRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const budget = db.prepare('SELECT id FROM budgets WHERE id = ? AND user_id = ?').get(id, userId);
  if (!budget) return res.status(404).json({ error: 'Budget not found' });
  db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
  res.json({ message: 'Budget deleted' });
});

/* GET /api/budgets/:id/history - spending per period across recent periods */
budgetsRouter.get('/:id/history', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(id, userId) as BudgetRow | undefined;
  if (!budget) return res.status(404).json({ error: 'Budget not found' });

  const periods = Math.min(12, Math.max(3, Number(req.query.periods) || 6));
  const results: Array<{ label: string; start: string; spent: number; limit: number; percentage: number }> = [];

  for (let i = periods - 1; i >= 0; i--) {
    const label = periodLabel(budget.period, budget.start_date, i);
    // Bounds of the period that began (i) periods before the current one.
    const current = getBudgetPeriodBounds(budget.period, budget.start_date);
    const anchored = anchorDate(budget.period, current.start, i);
    const bounds = getBudgetPeriodBounds(budget.period, anchored);
    const spent = spendInRange(budget.category_id, bounds.start, bounds.end);
    results.push({
      label,
      start: bounds.start,
      spent: Math.round(spent * 100) / 100,
      limit: budget.limit_amount,
      percentage: Math.round((spent / budget.limit_amount) * 10000) / 100,
    });
  }
  res.json(results);
});

function anchorDate(period: BudgetPeriod, currentStart: string, periodsBack: number): string {
  const d = new Date(currentStart + 'T00:00:00');
  switch (period) {
    case 'monthly':
      d.setMonth(d.getMonth() - periodsBack);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() - periodsBack * 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() - periodsBack);
      break;
  }
  return toDateKey(d);
}

function periodLabel(period: BudgetPeriod, startDate: string, periodsBack: number): string {
  const d = new Date(startDate + 'T00:00:00');
  switch (period) {
    case 'monthly': {
      const now = new Date();
      const cur = new Date(now.getFullYear(), now.getMonth(), 1);
      const months = (cur.getFullYear() - d.getFullYear()) * 12 + (cur.getMonth() - d.getMonth());
      const t = new Date(cur.getFullYear(), cur.getMonth() - periodsBack, 1);
      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
    }
    case 'quarterly': {
      const now = new Date();
      const curIndex = Math.floor(now.getMonth() / 3) * 3;
      const t = new Date(now.getFullYear(), curIndex - periodsBack * 3, 1);
      return `Q${Math.floor(t.getMonth() / 3) + 1} ${t.getFullYear()}`;
    }
    case 'yearly':
      return String(new Date().getFullYear() - periodsBack);
  }
}