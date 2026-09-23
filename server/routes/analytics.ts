import { Router, Request, Response } from 'express';
import { db, getUser, toDateKey } from '../db';

export const analyticsRouter = Router();

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/* GET /api/analytics/monthly-breakdown?year&month - spend by category */
analyticsRouter.get('/monthly-breakdown', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const now = new Date();
  const year = Number(req.query.year) || now.getFullYear();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${toDateKey(new Date(year, month, 1))}`;

  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.icon, c.color,
              SUM(t.amount) AS total, COUNT(*) AS count
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? AND t.type = 'expense' AND t.date >= ? AND t.date < ?
       GROUP BY c.id
       ORDER BY total DESC`
    )
    .all(userId, start, end) as any[];

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  res.json({
    month: `${year}-${String(month).padStart(2, '0')}`,
    total_spent: Math.round(grandTotal * 100) / 100,
    categories: rows.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      color: r.color,
      total: Math.round(r.total * 100) / 100,
      count: r.count,
      percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 1000) / 10 : 0,
    })),
  });
});

/* GET /api/analytics/trends?months=12 - expenses + income per month */
analyticsRouter.get('/trends', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const months = Math.min(24, Math.max(3, Number(req.query.months) || 12));

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const startISO = toDateKey(start);
  const endISO = toDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));

  const rows = db
    .prepare(
      `SELECT substr(date, 1, 7) AS ym, type, SUM(amount) AS total
       FROM transactions
       WHERE user_id = ? AND date >= ? AND date < ?
       GROUP BY ym, type`
    )
    .all(userId, startISO, endISO) as Array<{ ym: string; type: string; total: number }>;

  const byMonth: Record<string, { expenses: number; income: number }> = {};
  for (const r of rows) {
    byMonth[r.ym] = byMonth[r.ym] || { expenses: 0, income: 0 };
    if (r.type === 'expense') byMonth[r.ym].expenses = r.total;
    else byMonth[r.ym].income = r.total;
  }

  const out: Array<{ month: string; label: string; expenses: number; income: number; net: number }> = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  for (let i = 0; i < months; i++) {
    const key = monthKey(cursor);
    const data = byMonth[key] || { expenses: 0, income: 0 };
    out.push({
      month: key,
      label: `${MONTH_NAMES[cursor.getMonth()]} '${String(cursor.getFullYear()).slice(2)}`,
      expenses: Math.round((data.expenses ?? 0) * 100) / 100,
      income: Math.round((data.income ?? 0) * 100) / 100,
      net: Math.round(((data.income ?? 0) - (data.expenses ?? 0)) * 100) / 100,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  res.json(out);
});

/* GET /api/analytics/category-comparison?category_id&year - monthly spend */
analyticsRouter.get('/category-comparison', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const categoryId = Number(req.query.category_id);
  const year = Number(req.query.year) || new Date().getFullYear();

  const cat = db
    .prepare('SELECT id, name, icon, color FROM categories WHERE id = ? AND user_id = ?')
    .get(categoryId, userId) as any;
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  const rows = db
    .prepare(
      `SELECT substr(date, 1, 7) AS ym, SUM(amount) AS total, COUNT(*) AS count
       FROM transactions
       WHERE user_id = ? AND category_id = ? AND type = 'expense' AND date >= ? AND date < ?
       GROUP BY ym`
    )
    .all(userId, categoryId, start, end) as Array<{ ym: string; total: number; count: number }>;

  const byMonth: Record<string, { total: number; count: number }> = {};
  for (const r of rows) byMonth[r.ym] = { total: r.total, count: r.count };

  const out = [];
  for (let m = 0; m < 12; m++) {
    const key = `${year}-${String(m + 1).padStart(2, '0')}`;
    const d = byMonth[key];
    out.push({
      month: key,
      label: MONTH_NAMES[m],
      total: Math.round((d?.total ?? 0) * 100) / 100,
      count: d?.count ?? 0,
    });
  }
  res.json({ category: cat, year, months: out });
});

/* GET /api/analytics/summary?month - current month totals vs previous */
analyticsRouter.get('/summary', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const now = new Date();
  const thisStart = `${monthKey(now)}-01`;
  const thisEnd = toDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevStart = `${monthKey(prev)}-01`;
  const prevEnd = toDateKey(new Date(now.getFullYear(), now.getMonth(), 1));

  const row = (start: string, end: string) =>
    db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
           COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
           COUNT(*) AS count
         FROM transactions WHERE user_id = ? AND date >= ? AND date < ?`
      )
      .get(userId, start, end) as any;

  const cur = row(thisStart, thisEnd);
  const last = row(prevStart, prevEnd);
  const months = Number(req.query.months) || 12;

  const avgRow = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
       FROM transactions
       WHERE user_id = ? AND date >= ? AND date < ?`
    )
    .get(
      userId,
      toDateKey(new Date(now.getFullYear(), now.getMonth() - months, 1)),
      thisEnd
    ) as any;

  res.json({
    month: monthKey(now),
    total_expenses: Math.round(cur.expenses * 100) / 100,
    total_income: Math.round(cur.income * 100) / 100,
    net_savings: Math.round((cur.income - cur.expenses) * 100) / 100,
    transaction_count: cur.count,
    previous_month: {
      month: monthKey(prev),
      total_expenses: Math.round(last.expenses * 100) / 100,
      total_income: Math.round(last.income * 100) / 100,
    },
    expense_change_pct:
      last.expenses > 0 ? Math.round(((cur.expenses - last.expenses) / last.expenses) * 1000) / 10 : null,
    monthly_average_expenses: Math.round((avgRow.expenses / months) * 100) / 100,
  });
});

/* GET /api/analytics/insights - auto-generated observations */
analyticsRouter.get('/insights', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const now = new Date();
  const insights: Array<{ type: 'positive' | 'warning' | 'info'; text: string }> = [];

  const curStart = `${monthKey(now)}-01`;
  const curEnd = toDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const prevStart = toDateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const prevEnd = curStart;

  const spend = (s: string, e: string) =>
    db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE user_id = ? AND type = 'expense' AND date >= ? AND date < ?`
      )
      .get(userId, s, e) as { total: number };

  const curTotal = spend(curStart, curEnd).total;
  const prevTotal = spend(prevStart, prevEnd).total;

  if (prevTotal > 0) {
    const pct = Math.round(((curTotal - prevTotal) / prevTotal) * 100);
    if (pct > 10) {
      insights.push({
        type: 'warning',
        text: `You spent ${pct}% more this month than last month ($${curTotal.toFixed(0)} vs $${prevTotal.toFixed(0)}).`,
      });
    } else if (pct < -10) {
      insights.push({
        type: 'positive',
        text: `Nice — you spent ${Math.abs(pct)}% less this month than last month.`,
      });
    } else {
      insights.push({
        type: 'info',
        text: `This month's spending is roughly in line with last month (${pct >= 0 ? '+' : ''}${pct}%).`,
      });
    }
  }

  const top = db
    .prepare(
      `SELECT c.name, c.icon, SUM(t.amount) AS total
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? AND t.type = 'expense' AND t.date >= ? AND t.date < ?
       GROUP BY c.id ORDER BY total DESC LIMIT 1`
    )
    .get(userId, curStart, curEnd) as { name: string; icon: string; total: number } | undefined;

  if (top && curTotal > 0) {
    const pct = Math.round((top.total / curTotal) * 100);
    insights.push({
      type: 'info',
      text: `${top.icon} ${top.name} is your largest spending category this month at $${top.total.toFixed(0)} (${pct}% of total).`,
    });
  }

  // Biggest category change month-over-month.
  const catDiffs = db
    .prepare(
      `SELECT c.name, c.icon,
              COALESCE(SUM(CASE WHEN t.date >= ? AND t.date < ? THEN t.amount ELSE 0 END), 0) AS cur,
              COALESCE(SUM(CASE WHEN t.date >= ? AND t.date < ? THEN t.amount ELSE 0 END), 0) AS prev
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? AND t.type = 'expense' AND (t.date >= ? OR t.date >= ?)
       GROUP BY c.id`
    )
    .all(curStart, curEnd, prevStart, prevEnd, userId, prevStart, prevStart) as Array<{
    name: string;
    icon: string;
    cur: number;
    prev: number;
  }>;

  let biggest: { name: string; icon: string; delta: number; pct: number } | null = null;
  for (const d of catDiffs) {
    if (d.prev > 0 && d.cur > d.prev) {
      const delta = d.cur - d.prev;
      const pct = Math.round((delta / d.prev) * 100);
      if (!biggest || pct > biggest.pct) {
        biggest = { name: d.name, icon: d.icon, delta, pct };
      }
    }
  }
  if (biggest && biggest.pct >= 20) {
    insights.push({
      type: 'warning',
      text: `${biggest.icon} ${biggest.name} spending jumped ${biggest.pct}% versus last month ($${biggest.delta.toFixed(0)} more).`,
    });
  }

  // Budget pressure.
  const budgets = db
    .prepare(
      `SELECT c.name, c.icon, b.limit_amount, b.period, b.start_date, b.alert_threshold
       FROM budgets b JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = ?`
    )
    .all(userId) as any[];

  if (budgets.length === 0) {
    insights.push({
      type: 'info',
      text: 'No budgets set yet. Add budgets on the Budgets page to get overspend alerts.',
    });
  }

  res.json(insights);
});

/* GET /api/analytics/largest-categories - largest categories all-time/month */
analyticsRouter.get('/largest-categories', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const month = (req.query.month as string) || monthKey(new Date());
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.icon, c.color,
              SUM(t.amount) AS total, COUNT(*) AS count
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? AND t.type = 'expense' AND t.date >= ? AND t.date < ?
       GROUP BY c.id ORDER BY total DESC LIMIT 5`
    )
    .all(userId, `${month}-01`, `${month}-99`);
  res.json(rows);
});