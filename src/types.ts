// Shared API types (mirrors backend responses)

export interface Transaction {
  id: number;
  user_id: number;
  account_id: number;
  category_id: number;
  goal_id: number | null;
  amount: number;
  description: string | null;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense';
  is_recurring: number;
  recurring_pattern: string | null;
  status: 'pending' | 'cleared';
  created_at: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  account_name?: string;
  account_type?: string;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  color: string;
  icon: string;
  is_default: number;
  is_active: number;
  total_spent?: number;
  month_spent?: number;
  transaction_count?: number;
}

export interface Account {
  id: number;
  user_id: number;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment';
  created_at: string;
  balance: number;
  transaction_count?: number;
}

export type BudgetStatus = 'safe' | 'warning' | 'danger';

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  limit_amount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  alert_threshold: number;
  created_at: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  current_spent: number;
  percentage_used: number;
  remaining: number;
  over_by: number;
  period_start: string;
  period_end: string;
  status: BudgetStatus;
}

export interface Goal {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  achieved: number;
  created_at: string;
  percentage_complete?: number;
  remaining?: number;
  days_remaining?: number | null;
  projected_completion_date?: string | null;
  at_risk?: boolean;
  required_monthly?: number | null;
}

export interface Summary {
  month: string;
  total_expenses: number;
  total_income: number;
  net_savings: number;
  transaction_count: number;
  previous_month: { month: string; total_expenses: number; total_income: number };
  expense_change_pct: number | null;
  monthly_average_expenses: number;
}

export interface BreakdownCategory {
  id: number;
  name: string;
  icon: string;
  color: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyBreakdown {
  month: string;
  total_spent: number;
  categories: BreakdownCategory[];
}

export interface TrendPoint {
  month: string;
  label: string;
  expenses: number;
  income: number;
  net: number;
}

export interface Insight {
  type: 'positive' | 'warning' | 'info';
  text: string;
}

export interface UpcomingOccurrence {
  source_id: number;
  description: string;
  amount: number;
  date: string;
  status: 'scheduled' | 'completed' | 'skipped';
  category_name: string;
  category_icon: string;
  category_color: string;
  account_name: string;
  is_expense: boolean;
}

export interface CategoryComparison {
  category: { id: number; name: string; icon: string; color: string };
  year: number;
  months: Array<{ month: string; label: string; total: number; count: number }>;
}

export interface ImportResult {
  imported_count: number;
  skipped_count: number;
  errors: Array<{ row: number; reason: string }>;
  skipped: Array<{ row: number; reason: string; description?: string }>;
  imported: Array<{ row: number; description: string; amount: number; date: string; type: string; categoryId: number | null }>;
  mapping: Record<string, string>;
}

export interface BudgetHistoryPoint {
  label: string;
  start: string;
  spent: number;
  limit: number;
  percentage: number;
}

export const ACCOUNT_TYPES: Array<{ value: Account['type']; label: string }> = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
];

export const RECURRING_PATTERNS: Array<{ value: string; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export interface AppSettings {
  user_id: number;
  currency: string;
  display_name: string;
  workspace_name: string;
}

export const CURRENCIES: Array<{ code: string; symbol: string; label: string }> = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', label: 'Chinese Yuan' },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$', label: 'New Zealand Dollar' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc' },
  { code: 'SEK', symbol: 'kr', label: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', label: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', label: 'Danish Krone' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'MXN', symbol: 'MX$', label: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian Real' },
  { code: 'ZAR', symbol: 'R', label: 'South African Rand' },
  { code: 'KRW', symbol: '₩', label: 'South Korean Won' },
];

export const currencySymbolFor = (code: string | null | undefined): string =>
  CURRENCIES.find((c) => c.code === code)?.symbol ?? '$';

/* Active currency symbol, set by the settings provider on load/save. */
let activeCurrencySymbol = '$';
export const setCurrencySymbol = (symbol: string) => { activeCurrencySymbol = symbol; };

export const money = (n: number | null | undefined, cents = 2): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n < 0 ? '-' : '';
  return `${sign}${activeCurrencySymbol}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: cents, maximumFractionDigits: cents })}`;
};