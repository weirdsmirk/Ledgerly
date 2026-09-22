/**
 * Seeds realistic demo data for a nice out-of-the-box dashboard.
 * Run with: npm run seed   (deletes and recreates all data)
 */
import { db, DEFAULT_CATEGORIES, getUser, today, nextOccurrence } from './db';

function run() {
  db.exec('DELETE FROM recurring_overrides');
  db.exec('DELETE FROM transactions');
  db.exec('DELETE FROM budgets');
  db.exec('DELETE FROM goals');
  db.exec('DELETE FROM accounts WHERE id NOT IN (SELECT account_id FROM transactions)');
  db.exec('DELETE FROM accounts');
  db.exec('DELETE FROM categories WHERE is_default = 0');
  // Reset autoincrement so ids are stable/small.
  db.exec("DELETE FROM sqlite_sequence WHERE name IN (SELECT name FROM sqlite_master WHERE type='table')");

  const userId = getUser();

  // Categories (defaults already present).
  const cat = (name: string) =>
    (db.prepare('SELECT id FROM categories WHERE user_id = ? AND name = ?').get(userId, name) as any).id;

  const catIds = {
    food: cat('Food'),
    transport: cat('Transport'),
    utilities: cat('Utilities'),
    entertainment: cat('Entertainment'),
    health: cat('Health'),
    shopping: cat('Shopping'),
    savings: cat('Savings'),
    income: cat('Income'),
    other: cat('Other'),
  };

  // Accounts.
  const insertAccount = db.prepare('INSERT INTO accounts (user_id, name, type) VALUES (?, ?, ?)');
  const checking = Number(insertAccount.run(userId, 'Main Checking', 'checking').lastInsertRowid);
  const credit = Number(insertAccount.run(userId, 'Visa Rewards', 'credit_card').lastInsertRowid);
  const savingsAcc = Number(insertAccount.run(userId, 'High-Yield Savings', 'savings').lastInsertRowid);
  const cash = Number(insertAccount.run(userId, 'Cash Wallet', 'cash').lastInsertRowid);

  const insert = db.prepare(
    `INSERT INTO transactions (user_id, account_id, category_id, amount, description, date, type, is_recurring, recurring_pattern)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const dayOfMonth = (mOffset: number, day: number): string => {
    const d = new Date(Y, M + mOffset, Math.min(day, 28));
    const targetMonth = ((M + mOffset) % 12 + 12) % 12;
    // Clamp to last day of month when the target day doesn't exist.
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    if (d.getMonth() !== targetMonth) d.setDate(0);
    // Don't let "current month" items land in the future.
    const key = fmt(d);
    const todayKey = today();
    return mOffset === 0 && key > todayKey ? todayKey : key;
  };
  const monthKey = (mOffset: number) => {
    const d = new Date(Y, M + mOffset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Income: salary on the 1st and 15th of each month over the last 13 months.
  for (let mo = -12; mo <= 0; mo++) {
    const d1 = dayOfMonth(mo, 1);
    const d15 = dayOfMonth(mo, 15);
    const isNew = mo === 0;
    insert.run(userId, checking, catIds.income, 2650, 'Salary — Acme Corp', d1, 'income', isNew ? 1 : 0, isNew ? 'monthly' : null);
    insert.run(userId, checking, catIds.income, 2650, 'Salary — Acme Corp', d15, 'income', 0, null);
  }

  // A few side-gig deposits.
  const sideGigs: Array<[number, number, string]> = [
    [-11, 320, 'Freelance website fix'],
    [-8, 540, 'Freelance landing page'],
    [-5, 210, 'Sold old camera'],
    [-2, 780, 'Freelance project'],
  ];
  for (const [mo, amt, desc] of sideGigs) {
    insert.run(userId, checking, catIds.income, amt, desc, dayOfMonth(mo, 18), 'income', 0, null);
  }

  // Monthly recurring expenses: rent is not in categories, use Other as "Rent"? Actually use Utilities? Let's use Other.
  // Utilities + subscriptions as recurring monthly.
  const recurring: Array<{ cat: number; amt: number; desc: string; day: number; pattern: string; monthsBack: number }> = [
    { cat: catIds.utilities, amt: 118, desc: 'Electricity — City Power', day: 8, pattern: 'monthly', monthsBack: -12 },
    { cat: catIds.utilities, amt: 64, desc: 'Internet — FiberNet', day: 12, pattern: 'monthly', monthsBack: -12 },
    { cat: catIds.utilities, amt: 45, desc: 'Phone — MobileOne', day: 20, pattern: 'monthly', monthsBack: -12 },
    { cat: catIds.entertainment, amt: 15.99, desc: 'Netflix', day: 5, pattern: 'monthly', monthsBack: -12 },
    { cat: catIds.entertainment, amt: 11.99, desc: 'Spotify', day: 7, pattern: 'monthly', monthsBack: -12 },
    { cat: catIds.health, amt: 40, desc: 'Gym membership', day: 3, pattern: 'monthly', monthsBack: -12 },
  ];

  for (const r of recurring) {
    for (let mo = r.monthsBack; mo <= 0; mo++) {
      const isNew = mo === 0;
      // For "new" (this month), make the pattern recurring only if the day already passed (mark for future).
      const d = dayOfMonth(mo, r.day);
      insert.run(
        userId,
        credit,
        r.cat,
        r.amt,
        r.desc,
        d,
        'expense',
        isNew ? 1 : 0,
        isNew ? r.pattern : null
      );
    }
  }

  // Groceries + dining + random spending with seasonal variation.
  let seed = 42;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  const foods = ['Starbucks', 'Whole Foods', 'Trader Joe‘s', 'Chipotle', 'Local Pizza Co.', 'Sushi Place', 'Panera', 'Taco Stand', 'Farmers Market', 'Costco'];
  const transports = ['Shell Gas', 'Uber', 'Lyft', 'City Transit', 'Parking Garage', 'Chevron'];
  const shops = ['Amazon', 'Target', 'Nike Store', 'Best Buy', 'IKEA', 'Etsy', 'Home Depot', 'Zara'];
  const entertain = ['AMC Theaters', 'Steam', 'Ticketmaster'];
  const health = ['CVS Pharmacy', 'Walgreens', 'Dentist Office', 'City Clinic'];

  for (let mo = -12; mo <= 0; mo++) {
    const monthStr = monthKey(mo);
    const isDec = monthStr.endsWith('-12');
    const isNov = monthStr.endsWith('-11');
    const holidayFactor = isDec ? 1.55 : isNov ? 1.2 : 1;

    // Groceries twice a week-ish (5-6 per month).
    const groceryCount = 5 + Math.floor(rnd() * 2);
    for (let i = 0; i < groceryCount; i++) {
      insert.run(
        userId,
        credit,
        catIds.food,
        Math.round((38 + rnd() * 65) * holidayFactor * 100) / 100,
        foods[1 + Math.floor(rnd() * 8)],
        dayOfMonth(mo, 2 + Math.floor(rnd() * 26)),
        'expense',
        0,
        null
      );
    }
    // Coffee / snacks ~6 per month.
    const coffeeCount = 5 + Math.floor(rnd() * 3);
    for (let i = 0; i < coffeeCount; i++) {
      insert.run(
        userId,
        cash,
        catIds.food,
        Math.round((4.5 + rnd() * 8) * 100) / 100,
        'Starbucks',
        dayOfMonth(mo, 2 + Math.floor(rnd() * 26)),
        'expense',
        0,
        null
      );
    }
    // Dining out 3-5 per month.
    const diningCount = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < diningCount; i++) {
      insert.run(
        userId,
        credit,
        catIds.food,
        Math.round((22 + rnd() * 42) * holidayFactor * 100) / 100,
        foods[3 + Math.floor(rnd() * 5)],
        dayOfMonth(mo, 2 + Math.floor(rnd() * 26)),
        'expense',
        0,
        null
      );
    }

    // Transport 4-6 per month.
    const tCount = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < tCount; i++) {
      insert.run(
        userId,
        credit,
        catIds.transport,
        Math.round((18 + rnd() * 45) * 100) / 100,
        transports[Math.floor(rnd() * transports.length)],
        dayOfMonth(mo, 2 + Math.floor(rnd() * 26)),
        'expense',
        0,
        null
      );
    }

    // Shopping 2-4 per month (boosted in Nov/Dec).
    const sCount = 2 + Math.floor(rnd() * 2) + (isDec ? 2 : 0);
    for (let i = 0; i < sCount; i++) {
      insert.run(
        userId,
        credit,
        catIds.shopping,
        Math.round((30 + rnd() * 120) * holidayFactor * 100) / 100,
        shops[Math.floor(rnd() * shops.length)],
        dayOfMonth(mo, 2 + Math.floor(rnd() * 26)),
        'expense',
        0,
        null
      );
    }

    // Entertainment 1-2 per month.
    const eCount = 1 + Math.floor(rnd() * 2);
    for (let i = 0; i < eCount; i++) {
      insert.run(
        userId,
        credit,
        catIds.entertainment,
        Math.round((12 + rnd() * 40) * 100) / 100,
        entertain[Math.floor(rnd() * entertain.length)],
        dayOfMonth(mo, 2 + Math.floor(rnd() * 26)),
        'expense',
        0,
        null
      );
    }

    // Health occasionally (every 2-3 months).
    if (rnd() < 0.4) {
      insert.run(
        userId,
        credit,
        catIds.health,
        Math.round((25 + rnd() * 90) * 100) / 100,
        health[Math.floor(rnd() * health.length)],
        dayOfMonth(mo, 2 + Math.floor(rnd() * 26)),
        'expense',
        0,
        null
      );
    }

    // Savings transfer each month.
    insert.run(
      userId,
      savingsAcc,
      catIds.savings,
      400,
      'Auto-transfer to savings',
      dayOfMonth(mo, 1),
      'expense',
      mo === 0 ? 1 : 0,
      mo === 0 ? 'monthly' : null
    );
  }

  // Budgets.
  const insertBudget = db.prepare(
    `INSERT INTO budgets (user_id, category_id, limit_amount, period, start_date, alert_threshold)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  insertBudget.run(userId, catIds.food, 600, 'monthly', `${Y}-01-01`, 80);
  insertBudget.run(userId, catIds.transport, 220, 'monthly', `${Y}-01-01`, 80);
  insertBudget.run(userId, catIds.utilities, 260, 'monthly', `${Y}-01-01`, 85);
  insertBudget.run(userId, catIds.entertainment, 120, 'monthly', `${Y}-01-01`, 80);
  insertBudget.run(userId, catIds.shopping, 300, 'monthly', `${Y}-01-01`, 75);
  insertBudget.run(userId, catIds.health, 150, 'monthly', `${Y}-01-01`, 85);

  // Goals.
  const insertGoal = db.prepare(
    `INSERT INTO goals (user_id, name, target_amount, current_amount, target_date) VALUES (?, ?, ?, ?, ?)`
  );
  insertGoal.run(userId, 'Emergency Fund', 10000, 6200, null);
  const vac = new Date(Y, M + 5, 15);
  insertGoal.run(userId, 'Japan Trip', 3500, 1650, fmt(vac));
  const dp = new Date(Y + 2, M, 1);
  insertGoal.run(userId, 'Down Payment', 40000, 8400, fmt(dp));

  const t = db.prepare('SELECT COUNT(*) AS c FROM transactions').get() as any;
  const b = db.prepare('SELECT COUNT(*) AS c FROM budgets').get() as any;
  const g = db.prepare('SELECT COUNT(*) AS c FROM goals').get() as any;
  console.log('✅ Demo data seeded.');
  console.log(`   User #${userId} · ${t.c} transactions · ${b.c} budgets · ${g.c} goals`);
}

run();