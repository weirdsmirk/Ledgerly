import { Router, Request, Response } from 'express';
import { db, getUser, today } from '../db';

export const categoriesRouter = Router();

/* GET /api/categories - list with on-demand statistics */
categoriesRouter.get('/', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const month = (req.query.month as string) || today().slice(0, 7);

  const rows = db
    .prepare(
      `SELECT c.*,
              COALESCE((SELECT SUM(t.amount) FROM transactions t
                        WHERE t.category_id = c.id AND t.type = 'expense'), 0) AS total_spent,
              COALESCE((SELECT SUM(t.amount) FROM transactions t
                        WHERE t.category_id = c.id AND t.type = 'expense'
                          AND t.date >= ? AND t.date < ?), 0) AS month_spent,
              (SELECT COUNT(*) FROM transactions t WHERE t.category_id = c.id) AS transaction_count
       FROM categories c
       WHERE c.user_id = ?
       ORDER BY c.is_default DESC, c.name ASC`
    )
    .all(`${month}-01`, `${month}-99`, userId);

  res.json(rows);
});

/* GET /api/categories/:id/stats - detailed stats for one category */
categoriesRouter.get('/:id/stats', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const cat = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId);
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  const month = today().slice(0, 7);
  const total = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count, COALESCE(AVG(amount), 0) AS avg
       FROM transactions WHERE category_id = ? AND type = 'expense'`
    )
    .get(id) as any;
  const monthRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
       FROM transactions WHERE category_id = ? AND type = 'expense' AND date >= ? AND date < ?`
    )
    .get(id, `${month}-01`, `${month}-99`) as any;

  res.json({
    category: cat,
    stats: {
      total_spent: total.total,
      transaction_count: total.count,
      average_transaction: total.avg,
      month_spent: monthRow.total,
      month_transaction_count: monthRow.count,
    },
  });
});

/* POST /api/categories - create custom category */
categoriesRouter.post('/', (req: Request, res: Response) => {
  const userId = getUser();
  const name = String(req.body?.name ?? '').trim();
  if (!name || name.length > 50) {
    return res.status(400).json({ error: 'Category name is required (max 50 characters)' });
  }
  const color = /^#[0-9a-fA-F]{6}$/.test(String(req.body?.color ?? '')) ? req.body.color : '#3b82f6';
  const icon = String(req.body?.icon ?? '📁').slice(0, 8);

  const existing = db
    .prepare('SELECT id FROM categories WHERE user_id = ? AND name = ?')
    .get(userId, name);
  if (existing) return res.status(400).json({ error: 'A category with this name already exists' });

  const result = db
    .prepare('INSERT INTO categories (user_id, name, color, icon, is_default) VALUES (?, ?, ?, ?, 0)')
    .run(userId, name, color, icon);
  res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Category created' });
});

/* PUT /api/categories/:id - update name/color/icon/is_active */
categoriesRouter.put('/:id', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const cat = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId) as any;
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  const name = req.body?.name !== undefined ? String(req.body.name).trim() : cat.name;
  const color = req.body?.color !== undefined ? String(req.body.color) : cat.color;
  const icon = req.body?.icon !== undefined ? String(req.body.icon) : cat.icon;
  const isActive =
    req.body?.is_active !== undefined ? (req.body.is_active ? 1 : 0) : cat.is_active;

  if (!name || name.length > 50) {
    return res.status(400).json({ error: 'Category name is required (max 50 characters)' });
  }
  const conflict = db
    .prepare('SELECT id FROM categories WHERE user_id = ? AND name = ? AND id != ?')
    .get(userId, name, id);
  if (conflict) return res.status(400).json({ error: 'A category with this name already exists' });

  db.prepare('UPDATE categories SET name = ?, color = ?, icon = ?, is_active = ? WHERE id = ?').run(
    name,
    color,
    icon,
    isActive,
    id
  );
  res.json({ message: 'Category updated' });
});

/* DELETE /api/categories/:id - delete custom category only */
categoriesRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const cat = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId) as any;
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  if (cat.is_default) {
    return res.status(400).json({ error: 'Default categories cannot be deleted' });
  }
  const count = db
    .prepare('SELECT COUNT(*) AS count FROM transactions WHERE category_id = ?')
    .get(id) as { count: number };
  if (count.count > 0) {
    return res.status(409).json({ error: 'Category has transactions, cannot delete. Mark it inactive instead.' });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ message: 'Category deleted' });
});