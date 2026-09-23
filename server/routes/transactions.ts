import { Router, Request, Response } from 'express';
import {
  db,
  normalizeDate,
  isValidPattern,
  nextOccurrence,
  getUser,
  toDateKey,
} from '../db';
import { parseCsv, coerceDate, coerceAmount, toCsv } from '../csv';
import { fuzzyMatchCategory } from '../fuzzy';
import type { TransactionType } from '../db';

export const transactionsRouter = Router();

/* ------------------------------------------------------------------ */
/* Goal balance maintenance                                            */
/* ------------------------------------------------------------------ */

function applyGoalDelta(goalId: number | null, type: TransactionType, amount: number): void {
  if (!goalId) return;
  const delta = type === 'income' ? amount : -amount;
  db.prepare('UPDATE goals SET current_amount = MAX(0, current_amount + ?) WHERE id = ?').run(
    delta,
    goalId
  );
}

function assertAssets(userId: number): void {
  // Ensure the necessary entities exist so dashboard samples render.
  const cat = db
    .prepare('SELECT id FROM categories WHERE user_id = ? AND name = ?')
    .get(userId, 'Other');
  if (!cat) {
    db.prepare(
      "INSERT INTO categories (user_id, name, color, icon, is_default) VALUES (?, 'Other', '#64748b', '📁', 1)"
    ).run(userId);
  }
  const acc = db.prepare('SELECT id FROM accounts WHERE user_id = ? LIMIT 1').get(userId);
  if (!acc) {
    db.prepare("INSERT INTO accounts (user_id, name, type) VALUES (?, 'Checking', 'checking')").run(
      userId
    );
  }
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function validateTransactionInput(body: any): { ok: true; data: any } | { ok: false; message: string } {
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: 'Amount must be a positive number' };
  const type = body?.type;
  if (type !== 'income' && type !== 'expense') return { ok: false, message: 'Type must be income or expense' };
  const date = normalizeDate(body?.date);
  if (!date) return { ok: false, message: 'Date must be a valid YYYY-MM-DD date' };
  if (body?.description !== undefined && String(body.description).length > 2000) {
    return { ok: false, message: 'Description is too long (max 2000 characters)' };
  }
  const isRecurring = body?.is_recurring ? 1 : 0;
  const pattern = body?.recurring_pattern as string | undefined;
  if (isRecurring && pattern && !isValidPattern(pattern)) {
    return { ok: false, message: 'Recurring pattern must be daily, weekly, monthly, quarterly or yearly' };
  }
  const status = body?.status === 'pending' ? 'pending' : 'cleared';
  return {
    ok: true,
    data: {
      account_id: Number(body.account_id),
      category_id: Number(body.category_id),
      goal_id: body.goal_id ? Number(body.goal_id) : null,
      amount,
      description: body.description ?? null,
      date,
      type,
      is_recurring: isRecurring,
      recurring_pattern: isRecurring && pattern ? pattern : null,
      status,
    },
  };
}

/* ------------------------------------------------------------------ */
/* GET /api/transactions - list with filters, sorting, pagination      */
/* ------------------------------------------------------------------ */

const SORTABLE: Record<string, string> = {
  date: 't.date',
  amount: 't.amount',
  category: 'c.name',
  description: 't.description',
  type: 't.type',
};

const WHERE_FRAGMENT = `
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
  JOIN accounts a ON a.id = t.account_id
  WHERE t.user_id = ?
`;

transactionsRouter.get('/', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const clauses: string[] = [];
  const params: any[] = [userId];

  const month = req.query.month as string | undefined;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    clauses.push("(t.date >= ? AND t.date < ?)");
    params.push(`${month}-01`, nextMonth(month));
  }
  if (req.query.category_id) {
    clauses.push('t.category_id = ?');
    params.push(Number(req.query.category_id));
  }
  if (req.query.account_id) {
    clauses.push('t.account_id = ?');
    params.push(Number(req.query.account_id));
  }
  if (req.query.type === 'income' || req.query.type === 'expense') {
    clauses.push('t.type = ?');
    params.push(req.query.type);
  }
  if (req.query.from) {
    const d = normalizeDate(String(req.query.from));
    if (d) {
      clauses.push('t.date >= ?');
      params.push(d);
    }
  }
  if (req.query.to) {
    const d = normalizeDate(String(req.query.to));
    if (d) {
      clauses.push('t.date <= ?');
      params.push(d);
    }
  }
  if (req.query.search) {
    clauses.push('(t.description LIKE ? OR c.name LIKE ?)');
    params.push(`%${req.query.search}%`, `%${req.query.search}%`);
  }

  const sortCol = SORTABLE[String(req.query.sort || 'date')] ?? 't.date';
  const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const offset = (page - 1) * limit;

  const where = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';
  const whereSQL = WHERE_FRAGMENT + where;

  const total = (db.prepare(`SELECT COUNT(*) AS count ${whereSQL}`).get(...params) as any).count;
  const rows = db
    .prepare(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
              a.name AS account_name, a.type AS account_type
       ${whereSQL} ORDER BY ${sortCol} ${order}, t.id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  res.json({ transactions: rows, total, page, limit });
});

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return toDateKey(d);
}

/* ------------------------------------------------------------------ */
/* POST /api/transactions - create                                     */
/* ------------------------------------------------------------------ */

transactionsRouter.post('/', (req: Request, res: Response) => {
  const userId = getUser();
  const v = validateTransactionInput(req.body);
  if (!v.ok) return res.status(400).json({ error: v.message });

  const account = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(v.data.account_id, userId);
  if (!account) return res.status(400).json({ error: 'Account not found' });
  const category = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(v.data.category_id, userId);
  if (!category) return res.status(400).json({ error: 'Category not found' });
  if (v.data.goal_id) {
    const goal = db.prepare('SELECT id FROM goals WHERE id = ? AND user_id = ?').get(v.data.goal_id, userId);
    if (!goal) return res.status(400).json({ error: 'Goal not found' });
  }

  const result = db
    .prepare(
      `INSERT INTO transactions
       (user_id, account_id, category_id, goal_id, amount, description, date, type, is_recurring, recurring_pattern, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      v.data.account_id,
      v.data.category_id,
      v.data.goal_id,
      v.data.amount,
      v.data.description,
      v.data.date,
      v.data.type,
      v.data.is_recurring,
      v.data.recurring_pattern,
      v.data.status
    );

  applyGoalDelta(v.data.goal_id, v.data.type, v.data.amount);
  const id = Number(result.lastInsertRowid);
  assertAssets(userId);
  res.status(201).json({ id, message: 'Transaction created' });
});

/* ------------------------------------------------------------------ */
/* GET /api/transactions/recurring - list recurring source txn         */
/* GET /api/transactions/recurring/upcoming - generated occurrences    */
/* POST /api/transactions/recurring/:id/occurrence - mark/skip         */
/* ------------------------------------------------------------------ */

transactionsRouter.get('/recurring', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const rows = db
    .prepare(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
              a.name AS account_name
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       JOIN accounts a ON a.id = t.account_id
       WHERE t.user_id = ? AND t.is_recurring = 1
       ORDER BY t.date`
    )
    .all(userId);
  res.json(rows);
});

transactionsRouter.get('/recurring/upcoming', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const horizonMonths = Math.min(24, Math.max(1, Number(req.query.horizon_months) || 6));
  const todayKey = toDateKey(new Date());
  const upcoming: any[] = [];

  const sources = db
    .prepare(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
              a.name AS account_name
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       JOIN accounts a ON a.id = t.account_id
       WHERE t.user_id = ? AND t.is_recurring = 1`
    )
    .all(userId) as any[];

  for (const src of sources) {
    let d = src.date as string;
    const occurrences: any[] = [];
    let guard = 0;
    while (d <= addMonths(todayKey, horizonMonths) && guard < 12000) {
      if (d > todayKey && occurrences.length < 60) {
        const ovr = db
          .prepare('SELECT action, amount FROM recurring_overrides WHERE transaction_id = ? AND occurrence_date = ?')
          .get(src.id, d) as any;
        occurrences.push({
          source_id: src.id,
          description: src.description,
          amount: ovr?.amount ?? src.amount,
          date: d,
          status: ovr?.action ?? 'scheduled',
          category_name: src.category_name,
          category_icon: src.category_icon,
          category_color: src.category_color,
          account_name: src.account_name,
          is_expense: src.type === 'expense',
        });
      }
      // Skip backfill: only generate from the original pattern forward.
      d = nextOccurrence(src.recurring_pattern, d);
      guard++;
    }
    upcoming.push(...occurrences);
  }

  upcoming.sort((a, b) => (a.date < b.date ? -1 : 1));
  res.json(upcoming);
});

transactionsRouter.post('/recurring/:id/occurrence', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const src = db.prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?').get(id, userId);
  if (!src) return res.status(404).json({ error: 'Recurring transaction not found' });

  const date = normalizeDate(req.body?.date);
  if (!date) return res.status(400).json({ error: 'Occurrence date is required (YYYY-MM-DD)' });
  const action = req.body?.action;
  if (action !== 'completed' && action !== 'skipped') {
    return res.status(400).json({ error: "Action must be 'completed' or 'skipped'" });
  }

  db.prepare(
    `INSERT INTO recurring_overrides (transaction_id, occurrence_date, action, amount)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(transaction_id, occurrence_date) DO UPDATE SET action = excluded.action, amount = excluded.amount`
  ).run(id, date, action, req.body?.amount ? Number(req.body.amount) : null);

  if (action === 'completed') {
    const t = db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(id) as { account_id: number; category_id: number; goal_id: number | null; amount: number; description: string | null; type: TransactionType };
    db.prepare(
      `INSERT INTO transactions (user_id, account_id, category_id, goal_id, amount, description, date, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, t.account_id, t.category_id, t.goal_id, t.amount, t.description, date, t.type);
  }
  res.json({ message: action === 'completed' ? 'Occurrence added as a transaction' : 'Occurrence skipped' });
});

function addMonths(dateKey: string, months: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, 1));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  return toDateKey(new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), Math.min(d, last))));
}

/* ------------------------------------------------------------------ */
/* GET /api/transactions/:id - single transaction (with joins)         */
/* ------------------------------------------------------------------ */

transactionsRouter.get('/:id', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  // Guard: recurring+upcoming routes must be declared before this one.
  const row = db
    .prepare(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
              a.name AS account_name, a.type AS account_type
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       JOIN accounts a ON a.id = t.account_id
       WHERE t.id = ? AND t.user_id = ?`
    )
    .get(id, userId);
  if (!row) return res.status(404).json({ error: 'Transaction not found' });
  res.json(row);
});

/* ------------------------------------------------------------------ */
/* PUT /api/transactions/:id - update (amount, description, date,      */
/* category, type, status). account_id intentionally immutable.        */
/* ------------------------------------------------------------------ */

transactionsRouter.put('/:id', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const existing = db
    .prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
    .get(id, userId) as any;
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });

  const next = {
    amount: req.body?.amount !== undefined ? Number(req.body.amount) : existing.amount,
    description: req.body?.description !== undefined ? req.body.description : existing.description,
    date: req.body?.date !== undefined ? String(req.body.date) : existing.date,
    category_id: req.body?.category_id !== undefined ? Number(req.body.category_id) : existing.category_id,
    type: req.body?.type !== undefined ? req.body.type : existing.type,
    goal_id: req.body?.goal_id !== undefined ? (req.body.goal_id ? Number(req.body.goal_id) : null) : existing.goal_id,
    status: req.body?.status !== undefined ? req.body.status : existing.status,
  };

  if (next.amount <= 0 || !Number.isFinite(next.amount)) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }
  const date = normalizeDate(next.date);
  if (!date) return res.status(400).json({ error: 'Date must be a valid YYYY-MM-DD date' });
  if (next.type !== 'income' && next.type !== 'expense') {
    return res.status(400).json({ error: 'Type must be income or expense' });
  }
  // FK existence + enum integrity (mirrors POST so a hand-rolled update can't
  // poison the tables and turn a client slip into a 500).
  if (next.status !== 'cleared' && next.status !== 'pending') {
    return res.status(400).json({ error: 'Status must be cleared or pending' });
  }
  if (next.description !== null && String(next.description).length > 2000) {
    return res.status(400).json({ error: 'Description is too long (max 2000 characters)' });
  }
  const cat = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(next.category_id, userId);
  if (!cat) return res.status(400).json({ error: 'Category not found' });
  if (next.goal_id) {
    const goal = db.prepare('SELECT id FROM goals WHERE id = ? AND user_id = ?').get(next.goal_id, userId);
    if (!goal) return res.status(400).json({ error: 'Goal not found' });
  }

  db.prepare(
    `UPDATE transactions
     SET amount = ?, description = ?, date = ?, category_id = ?, type = ?, goal_id = ?, status = ?
     WHERE id = ?`
  ).run(next.amount, next.description, date, next.category_id, next.type, next.goal_id, next.status, id);

  // Reconcile goal progress: remove old contribution, apply new one.
  applyGoalDelta(existing.goal_id, existing.type, -existing.amount);
  applyGoalDelta(next.goal_id, next.type, next.amount);

  res.json({ message: 'Transaction updated' });
});

/* ------------------------------------------------------------------ */
/* DELETE /api/transactions/:id                                        */
/* ------------------------------------------------------------------ */

transactionsRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = getUser();
  const id = Number(req.params.id);
  const existing = db
    .prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
    .get(id, userId) as any;
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });

  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  applyGoalDelta(existing.goal_id, existing.type, -existing.amount);
  res.json({ message: 'Transaction deleted' });
});

/* ------------------------------------------------------------------ */
/* POST /api/transactions/import/preview - inspect headers/mapping     */
/* POST /api/transactions/import - CSV import with fuzzy categories    */
/* ------------------------------------------------------------------ */

transactionsRouter.post('/import/preview', (req: Request, res: Response) => {
  const csv = req.body?.csv;
  if (typeof csv !== 'string' || !csv.trim()) {
    return res.status(400).json({ error: 'CSV text is required in the request body' });
  }
  const rows = parseCsv(csv);
  if (!rows) {
    return res.status(400).json({ error: 'Could not parse CSV: expected a header row plus at least one data row' });
  }
  const headers = Object.keys(rows[0]);
  res.json({
    headers,
    rows: rows.slice(0, 6),
    total_rows: rows.length,
    mapping: autoDetectMap(headers),
  });
});

const HEADER_ALIASES: Record<string, string[]> = {
  date: ['date', 'transaction date', 'posted date', 'value date', 'transaction_date', 'booking date', 'day'],
  amount: ['amount', 'value', 'debit', 'credit', 'amount (usd)', 'sum', 'money', 'price'],
  description: ['description', 'memo', 'details', 'payee', 'merchant', 'name', 'narrative', 'note', 'info'],
  category: ['category', 'categories', 'type', 'group', 'bucket'],
  account: ['account', 'account name', 'account_name'],
  type: ['type', 'direction', 'flow', 'kind'],
};

function autoDetectMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const lower = headers.map((h) => h.toLowerCase());
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const idx = lower.indexOf(alias.toLowerCase());
      if (idx !== -1) {
        map[field] = headers[idx];
        break;
      }
    }
  }
  return map;
}

transactionsRouter.post('/import', (req: Request, res: Response) => {
  const userId = getUser();
  const csv = req.body?.csv;
  if (typeof csv !== 'string' || !csv.trim()) {
    return res.status(400).json({ error: 'CSV text is required in the request body' });
  }
  const rows = parseCsv(csv);
  if (!rows || rows.length === 0) {
    return res.status(400).json({ error: 'Could not parse CSV: expected a header row plus at least one data row' });
  }

  const headers = Object.keys(rows[0]);
  const columnMap = { ...autoDetectMap(headers), ...(req.body?.columnMap ?? {}) };

  const categories = db
    .prepare('SELECT id, name FROM categories WHERE user_id = ? AND is_active = 1')
    .all(userId) as Array<{ id: number; name: string }>;
  const accounts = db
    .prepare('SELECT id, name FROM accounts WHERE user_id = ?')
    .all(userId) as Array<{ id: number; name: string }>;

  let accountId: number | null = null;
  if (columnMap.account) {
    const accName = rows[0][columnMap.account];
    const found = accounts.find((a) => a.name.toLowerCase() === String(accName).toLowerCase());
    accountId = found?.id ?? null;
  }
  if (!accountId && accounts.length > 0) accountId = accounts[0].id;

  const dateField = columnMap.date;
  const amountField = columnMap.amount;
  const descField = columnMap.description;
  const catField = columnMap.category;
  const typeField = columnMap.type;
  const dayFirst = req.body?.day_first === true;

  if (!dateField || !amountField) {
    return res.status(400).json({
      error: 'Could not detect date and amount columns. Provide a column map: { date: "...", amount: "...", description: "..." }',
    });
  }

  const insert = db.prepare(
    `INSERT INTO transactions (user_id, account_id, category_id, amount, description, date, type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const dupCheck = db.prepare(
    `SELECT id FROM transactions WHERE user_id = ? AND date = ? AND description IS ? AND ABS(amount - ?) < 0.005`
  );

  const imported: any[] = [];
  const skipped: any[] = [];
  const errors: any[] = [];

  const txItems: any[] = [];
  let rowIndex = 0;

  for (const row of rows) {
    rowIndex++;
    let date = coerceDate(row[dateField] ?? '');
    if (!date && dayFirst) date = coerceDayFirst(row[dateField] ?? '');
    if (!date) {
      errors.push({ row: rowIndex, reason: `Invalid date "${row[dateField]}"` });
      continue;
    }
    const amount = coerceAmount(row[amountField] ?? '');
    if (!amount) {
      errors.push({ row: rowIndex, reason: `Invalid amount "${row[amountField]}"` });
      continue;
    }
    const description = (row[descField] ?? '').slice(0, 255);
    const type = detectImportType(typeField ? row[typeField] : undefined, amountStr(row[amountField] ?? ''));

    // Category: explicit column if present, otherwise fuzzy match, otherwise Other.
    let categoryId: number | null = null;
    if (catField && row[catField]) {
      const found = categories.find((c) => c.name.toLowerCase() === row[catField].toLowerCase());
      categoryId = found?.id ?? null;
    }
    if (!categoryId) categoryId = fuzzyMatchCategory(description, categories);

    // Duplicate detection: same date, amount, description (within tolerance).
    const dup = dupCheck.get(userId, date, description || null, amount);
    if (dup) {
      skipped.push({
        row: rowIndex,
        reason: `Duplicate of transaction #${dup.id} (same date, amount and description)`,
        description,
      });
      continue;
    }

    if (!accountId) {
      errors.push({ row: rowIndex, reason: 'No account available to attach transaction' });
      continue;
    }

    txItems.push([userId, accountId, categoryId, amount, description || null, date, type]);
    imported.push({ row: rowIndex, description, amount, date, type, categoryId });
  }

  if (txItems.length) {
    db.exec('BEGIN');
    try {
      for (const item of txItems) insert.run(...item);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  assertAssets(userId);

  res.json({
    imported_count: imported.length,
    skipped_count: skipped.length,
    errors,
    imported,
    mapping: columnMap,
  });
});

function coerceDayFirst(value: string): string | null {
  // MM/DD/YYYY forced interpretation as DD/MM/YYYY.
  const v = value.trim();
  const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(v);
  if (!m) return null;
  const [, a, b, y] = m;
  return `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
}

function detectImportType(raw: string | undefined, amountStrRaw: string): TransactionType {
  const v = String(raw || '').toLowerCase().trim();
  if (v) {
    if (/expense|debit|outflow|withdrawal|purchase|payment(?! received)/.test(v)) return 'expense';
    if (/income|deposit|salary|refund|interest|inflow|credit|pay(ed|roll|ment received)/.test(v)) return 'income';
  }
  // Fall back on a leading minus sign in the amount column (bank exports).
  if (/^\s*-/.test(amountStrRaw)) return 'expense';
  return 'expense';
}

function amountStr(value: string): string {
  return String(value ?? '');
}

/* ------------------------------------------------------------------ */
/* GET /api/transactions/export - CSV download                         */
/* ------------------------------------------------------------------ */

transactionsRouter.get('/export', (req: Request, res: Response) => {
  const userId = Number(req.query.user_id) || getUser();
  const clauses: string[] = [];
  const params: any[] = [userId];

  if (req.query.month && /^\d{4}-\d{2}$/.test(String(req.query.month))) {
    clauses.push('(t.date >= ? AND t.date < ?)');
    params.push(`${req.query.month}-01`, nextMonth(String(req.query.month)));
  }
  if (req.query.from) {
    const d = normalizeDate(String(req.query.from));
    if (d) {
      clauses.push('t.date >= ?');
      params.push(d);
    }
  }
  if (req.query.to) {
    const d = normalizeDate(String(req.query.to));
    if (d) {
      clauses.push('t.date <= ?');
      params.push(d);
    }
  }
  if (req.query.category_id) {
    clauses.push('t.category_id = ?');
    params.push(Number(req.query.category_id));
  }
  if (req.query.account_id) {
    clauses.push('t.account_id = ?');
    params.push(Number(req.query.account_id));
  }
  if (req.query.type === 'income' || req.query.type === 'expense') {
    clauses.push('t.type = ?');
    params.push(req.query.type);
  }

  const where = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT t.date, t.type, t.amount, t.description, c.name AS category, c.icon AS category_icon,
              a.name AS account
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       JOIN accounts a ON a.id = t.account_id
       WHERE t.user_id = ?${where}
       ORDER BY t.date DESC`
    )
    .all(...params) as any[];

  const output = rows.map((r) => ({
    Date: r.date,
    Type: r.type,
    Amount: r.amount.toFixed(2),
    Description: r.description ?? '',
    Category: `${r.category_icon} ${r.category}`,
    Account: r.account,
  }));

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="transactions_${toDateKey(new Date())}.csv"`
  );
  res.send(toCsv(output));
});