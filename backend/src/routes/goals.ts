import { Router, Request, Response } from 'express';
import { db, getUser, normalizeDate, toDateKey, averageMonthlyCashflow } from '../db';

export const goalsRouter = Router();

interface GoalRow {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  achieved: number;
}

function decorate(goal: GoalRow) {
  const userId = getUser();
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);
  const percentage = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;

  let daysRemaining: number | null = null;
  let projectedCompletion: string | null = null;
  let atRisk = false;
  let requiredMonthly: number | null = null;

  if (goal.target_date) {
    daysRemaining = Math.max(
      0,
      Math.ceil((new Date(goal.target_date + 'T00:00:00').getTime() - Date.now()) / 86400000)
    );
  }

  // Project completion from recent net savings (income - expense) / months.
  const { savings } = averageMonthlyCashflow(userId, 3);
  if (savings > 0 && remaining > 0) {
    const months = remaining / savings;
    const projected = new Date();
    projected.setMonth(projected.getMonth() + Math.ceil(months));
    projectedCompletion = toDateKey(projected);
    if (goal.target_date && projected > new Date(goal.target_date + 'T00:00:00')) {
      atRisk = true;
      const monthsLeft = Math.max(
        1,
        (new Date(goal.target_date + 'T00:00:00').getTime() - Date.now()) / (30.44 * 86400000)
      );
      requiredMonthly = remaining / monthsLeft;
    }
  } else if (remaining > 0 && goal.target_date) {
    // No positive savings trend: everything is "at risk" unless there's tons of time.
    const monthsLeft = Math.max(
      1,
      (new Date(goal.target_date + 'T00:00:00').getTime() - Date.now()) / (30.44 * 86400000)
    );
    requiredMonthly = remaining / monthsLeft;
    if (requiredMonthly > Math.max(savings, 0)) atRisk = true;
  }

  return {
    ...goal,
    percentage_complete: Math.round(percentage * 100) / 100,
    remaining,
    days_remaining: daysRemaining,
    projected_completion_date: projectedCompletion,
    at_risk: atRisk,
    required_monthly: requiredMonthly !== null ? Math.round(requiredMonthly * 100) / 100 : null,
  };
}

/* GET /api/goals */
goalsRouter.get('/', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const includeAchieved = req.query.include_achieved === 'true';
  const rows = db
    .prepare(
      `SELECT * FROM goals WHERE user_id = ? ${includeAchieved ? '' : 'AND achieved = 0'}
       ORDER BY achieved ASC, target_date IS NULL, target_date ASC, created_at DESC`
    )
    .all(userId) as any[];
  res.json(rows.map(decorate));
});

/* POST /api/goals */
goalsRouter.post('/', (req: Request, res: Response) => {
  const userId = getUser();
  const name = String(req.body?.name ?? '').trim();
  const targetAmount = Number(req.body?.target_amount);
  const currentAmount = Math.max(0, Number(req.body?.current_amount) || 0);
  const targetDate = req.body?.target_date ? normalizeDate(String(req.body.target_date)) : null;

  if (!name || name.length > 80) {
    return res.status(400).json({ error: 'Goal name is required (max 80 characters)' });
  }
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return res.status(400).json({ error: 'Target amount must be a positive number' });
  }
  if (req.body?.target_date && !targetDate) {
    return res.status(400).json({ error: 'Target date must be a valid YYYY-MM-DD date' });
  }

  const result = db
    .prepare(
      `INSERT INTO goals (user_id, name, target_amount, current_amount, target_date) VALUES (?, ?, ?, ?, ?)`
    )
    .run(userId, name, targetAmount, currentAmount, targetDate);
  res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Goal created' });
});

/* PUT /api/goals/:id */
goalsRouter.put('/:id', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, userId) as any;
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const name = req.body?.name !== undefined ? String(req.body.name).trim() : goal.name;
  const targetAmount = req.body?.target_amount !== undefined ? Number(req.body.target_amount) : goal.target_amount;
  const currentAmount = req.body?.current_amount !== undefined ? Number(req.body.current_amount) : goal.current_amount;
  const achieved = req.body?.achieved !== undefined ? (req.body.achieved ? 1 : 0) : goal.achieved;

  let targetDate = goal.target_date;
  if (req.body?.target_date !== undefined) {
    if (req.body.target_date === null || req.body.target_date === '') targetDate = null;
    else targetDate = normalizeDate(String(req.body.target_date));
    if (!targetDate) return res.status(400).json({ error: 'Target date must be a valid YYYY-MM-DD date' });
  }

  if (!name || name.length > 80) return res.status(400).json({ error: 'Goal name is required' });
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return res.status(400).json({ error: 'Target amount must be a positive number' });
  }
  if (!Number.isFinite(currentAmount) || currentAmount < 0) {
    return res.status(400).json({ error: 'Current amount cannot be negative' });
  }

  db.prepare(
    'UPDATE goals SET name = ?, target_amount = ?, current_amount = ?, target_date = ?, achieved = ? WHERE id = ?'
  ).run(name, targetAmount, currentAmount, targetDate, achieved, id);
  res.json({ message: 'Goal updated' });
});

/* DELETE /api/goals/:id */
goalsRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const goal = db.prepare('SELECT id FROM goals WHERE id = ? AND user_id = ?').get(id, userId);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  db.prepare('DELETE FROM goals WHERE id = ?').run(id);
  res.json({ message: 'Goal deleted' });
});

/* POST /api/goals/:id/deposit - record a deposit toward the goal */
goalsRouter.post('/:id/deposit', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, userId) as GoalRow | undefined;
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Deposit amount must be a positive number' });
  }
  const newAmount = Math.round((goal.current_amount + amount) * 100) / 100;
  db.prepare('UPDATE goals SET current_amount = ? WHERE id = ?').run(newAmount, id);
  res.json({
    new_current_amount: newAmount,
    message: `Deposit of $${amount.toFixed(2)} recorded`,
  });
});