import type {
  Account,
  AppSettings,
  Budget,
  BudgetHistoryPoint,
  Category,
  CategoryComparison,
  Goal,
  ImportResult,
  Insight,
  MonthlyBreakdown,
  Summary,
  Transaction,
  TrendPoint,
  UpcomingOccurrence,
} from './types';

// Relative by default: in dev, Vite proxies /api to the backend (see
// vite.config.ts); in production the backend itself serves the frontend.
// Override with VITE_API_URL if the API lives elsewhere.
const BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    // Network-level failure (backend down, port closed, CORS, ...).
    throw new Error('Cannot reach the server — make sure the backend is running');
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const api = {
  // Transactions
  getTransactions: (params: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return request<{ transactions: Transaction[]; total: number; page: number; limit: number }>(
      `/transactions?${qs.toString()}`
    );
  },

  createTransaction: (data: Record<string, unknown>) =>
    request<{ id: number; message: string }>('/transactions', { method: 'POST', body: JSON.stringify(data) }),

  getTransaction: (id: number) => request<Transaction>(`/transactions/${id}`),

  updateTransaction: (id: number, data: Record<string, unknown>) =>
    request<{ message: string }>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteTransaction: (id: number) =>
    request<{ message: string }>(`/transactions/${id}`, { method: 'DELETE' }),

  getRecurring: () => request<Transaction[]>('/transactions/recurring'),
  getUpcoming: (months = 6) =>
    request<UpcomingOccurrence[]>(`/transactions/recurring/upcoming?horizon_months=${months}`),
  markOccurrence: (sourceId: number, date: string, action: 'completed' | 'skipped', amount?: number) =>
    request<{ message: string }>(`/transactions/recurring/${sourceId}/occurrence`, {
      method: 'POST',
      body: JSON.stringify({ date, action, amount }),
    }),
  importCsv: (csv: string, columnMap: Record<string, string>, dayFirst = false) =>
    request<ImportResult>('/transactions/import', {
      method: 'POST',
      body: JSON.stringify({ csv, columnMap, day_first: dayFirst }),
    }),
  importPreview: (csv: string) =>
    request<{ headers: string[]; rows: Array<Record<string, string>>; total_rows: number; mapping: Record<string, string> }>(
      '/transactions/import/preview',
      { method: 'POST', body: JSON.stringify({ csv }) }
    ),
  exportUrl: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));
    return `${BASE}/transactions/export?${qs.toString()}`;
  },

  // Categories
  getCategories: () => request<Category[]>('/categories'),
  createCategory: (data: { name: string; color: string; icon: string }) =>
    request<{ id: number; message: string }>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: Record<string, unknown>) =>
    request<{ message: string }>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) =>
    request<{ message: string }>(`/categories/${id}`, { method: 'DELETE' }),

  // Accounts
  getAccounts: () => request<Account[]>('/accounts'),
  createAccount: (data: { name: string; type: string }) =>
    request<{ id: number; message: string }>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: number, data: Record<string, unknown>) =>
    request<{ message: string }>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: number) =>
    request<{ message: string }>(`/accounts/${id}`, { method: 'DELETE' }),

  // Budgets
  getBudgets: () => request<Budget[]>('/budgets'),
  createBudget: (data: Record<string, unknown>) =>
    request<{ id: number; message: string }>('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  updateBudget: (id: number, data: Record<string, unknown>) =>
    request<{ message: string }>(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBudget: (id: number) =>
    request<{ message: string }>(`/budgets/${id}`, { method: 'DELETE' }),
  getBudgetHistory: (id: number, periods = 6) =>
    request<BudgetHistoryPoint[]>(`/budgets/${id}/history?periods=${periods}`),

  // Goals
  getGoals: (includeAchieved = true) =>
    request<Goal[]>(`/goals?include_achieved=${includeAchieved}`),
  createGoal: (data: Record<string, unknown>) =>
    request<{ id: number; message: string }>('/goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id: number, data: Record<string, unknown>) =>
    request<{ message: string }>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGoal: (id: number) =>
    request<{ message: string }>(`/goals/${id}`, { method: 'DELETE' }),
  depositToGoal: (id: number, amount: number) =>
    request<{ new_current_amount: number; message: string }>(`/goals/${id}/deposit`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  // Analytics
  getSummary: () => request<Summary>('/analytics/summary'),
  getMonthlyBreakdown: (year?: number, month?: number) =>
    request<MonthlyBreakdown>('/analytics/monthly-breakdown' + (year ? `?year=${year}&month=${month}` : '')),
  getTrends: (months = 12) => request<TrendPoint[]>(`/analytics/trends?months=${months}`),
  getCategoryComparison: (categoryId: number, year?: number) =>
    request<CategoryComparison>(
      `/analytics/category-comparison?category_id=${categoryId}${year ? `&year=${year}` : ''}`
    ),
  getInsights: () => request<Insight[]>('/analytics/insights'),

  // Settings
  getSettings: () => request<AppSettings>('/settings'),
  updateSettings: (data: Partial<AppSettings>) =>
    request<AppSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  eraseAllData: () =>
    request<{ message: string; wiped: Record<string, number> }>('/settings/data', { method: 'DELETE' }),
};

export default api;