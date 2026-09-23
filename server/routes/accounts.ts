import { Router, Request, Response } from 'express';
import { db, getUser, isValidAccountType } from '../db';

export const accountsRouter = Router();

/* GET /api/accounts - list with calculated balances */
accountsRouter.get('/', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const rows = db
    .prepare(
      `SELECT a.*,
              COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) AS balance,
              (SELECT COUNT(*) FROM transactions t2 WHERE t2.account_id = a.id) AS transaction_count
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id
       WHERE a.user_id = ?
       GROUP BY a.id
       ORDER BY a.created_at ASC`
    )
    .all(userId);
  res.json(rows);
});

/* POST /api/accounts - create account */
accountsRouter.post('/', (req: Request, res: Response) => {
  const userId = getUser();
  const name = String(req.body?.name ?? '').trim();
  const type = req.body?.type;
  if (!name || name.length > 50) {
    return res.status(400).json({ error: 'Account name is required (max 50 characters)' });
  }
  if (!isValidAccountType(type)) {
    return res.status(400).json({ error: 'Account type must be checking, savings, credit_card, cash or investment' });
  }
  const result = db
    .prepare('INSERT INTO accounts (user_id, name, type) VALUES (?, ?, ?)')
    .run(userId, name, type);
  res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Account created' });
});

/* PUT /api/accounts/:id - update name/type */
accountsRouter.put('/:id', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const acc = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, userId) as any;
  if (!acc) return res.status(404).json({ error: 'Account not found' });

  const name = req.body?.name !== undefined ? String(req.body.name).trim() : acc.name;
  const type = req.body?.type !== undefined ? req.body.type : acc.type;
  if (!name || name.length > 50) {
    return res.status(400).json({ error: 'Account name is required (max 50 characters)' });
  }
  if (!isValidAccountType(type)) {
    return res.status(400).json({ error: 'Invalid account type' });
  }
  db.prepare('UPDATE accounts SET name = ?, type = ? WHERE id = ?').run(name, type, id);
  res.json({ message: 'Account updated' });
});

/* DELETE /api/accounts/:id */
accountsRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const acc = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, userId) as any;
  if (!acc) return res.status(404).json({ error: 'Account not found' });

  const count = db
    .prepare('SELECT COUNT(*) AS count FROM transactions WHERE account_id = ?')
    .get(id) as { count: number };
  if (count.count > 0) {
    return res.status(409).json({ error: 'Account has transactions, cannot delete' });
  }
  db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  res.json({ message: 'Account deleted' });
});