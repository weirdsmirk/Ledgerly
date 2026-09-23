import { Link } from 'react-router-dom';
import api from '../api';
import { useAsync } from '../hooks';
import { Card, Spinner, EmptyState } from '../components/ui';
import { DonutChart, type DonutSlice } from '../components/charts';
import { Icon } from '../components/icons';
import { useTxModal } from '../components/TxFormModal';
import { useSettingsModal } from '../components/SettingsModal';
import { money } from '../types';

const smart = (n: number) => money(n, Number.isInteger(n) ? 0 : 2);

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function dayKicker(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
}

export default function Dashboard() {
  const { openNew, saved } = useTxModal();
  const { settings } = useSettingsModal();
  const summary = useAsync(() => api.getSummary(), [saved]);
  const breakdown = useAsync(() => api.getMonthlyBreakdown(), [saved]);
  const insights = useAsync(() => api.getInsights(), [saved]);
  const accounts = useAsync(() => api.getAccounts(), [saved]);
  const recent = useAsync(() => api.getTransactions({ limit: 6, sort: 'date', order: 'desc' }), [saved]);

  if (!summary.data || !breakdown.data || !insights.data || !accounts.data || !recent.data) {
    return <Card className="card-pad"><Spinner /></Card>;
  }

  const s = summary.data;
  const totalBalance = accounts.data.reduce((sum, a) => sum + a.balance, 0);
  const incomeDelta = s.previous_month.total_income > 0
    ? ((s.total_income - s.previous_month.total_income) / s.previous_month.total_income) * 100
    : null;
  const spentDelta = s.previous_month.total_expenses > 0
    ? ((s.total_expenses - s.previous_month.total_expenses) / s.previous_month.total_expenses) * 100
    : null;

  const slices: DonutSlice[] = (breakdown.data.categories ?? []).map((c) => ({
    key: String(c.id), label: c.name, icon: c.icon, color: c.color, value: c.total,
  }));

  const fresh = insights.data[0];

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">{dayKicker()}</div>
          <h1 className="page-title">{greeting()}, {settings?.display_name?.split(' ')[0] ?? 'there'}</h1>
          <p className="page-sub">Here's the shape of your money this month.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><Icon name="plus" size={17} /> Add transaction</button>
        </div>
      </div>

      <div className="stat-grid">
        <Card className="stat">
          <div className="stat-top">
            <span className="stat-label">Income this month</span>
            <span className="stat-ico"><Icon name="trend-up" size={18} /></span>
          </div>
          <div className="stat-value">{smart(s.total_income)}</div>
          <div className="stat-delta">
            <Icon name="trend-up" size={14} />
            {incomeDelta === null ? 'First month of data' : `${Math.abs(incomeDelta).toFixed(1)}% vs last month`}
          </div>
        </Card>
        <Card className="stat">
          <div className="stat-top">
            <span className="stat-label">Spent this month</span>
            <span className="stat-ico"><Icon name="trend-down" size={18} /></span>
          </div>
          <div className="stat-value">{smart(s.total_expenses)}</div>
          <div className="stat-delta">
            <Icon name="trend-up" size={14} />
            {spentDelta === null ? 'First month of data' : `${Math.abs(spentDelta).toFixed(1)}% vs last month`}
          </div>
        </Card>
        <Card className="stat">
          <div className="stat-top">
            <span className="stat-label">Net savings</span>
            <span className="stat-ico"><Icon name="sparkle" size={18} /></span>
          </div>
          <div className="stat-value">{smart(s.net_savings)}</div>
          <div className={`stat-delta ${s.net_savings < 0 ? 'down' : ''}`}>
            <Icon name={s.net_savings < 0 ? 'trend-down' : 'trend-up'} size={14} />
            {s.net_savings < 0 ? 'Spending above income' : 'On track this month'}
          </div>
        </Card>
        <Card className="stat">
          <div className="stat-top">
            <span className="stat-label">Total balance</span>
            <span className="stat-ico"><Icon name="wallet" size={18} /></span>
          </div>
          <div className="stat-value">{smart(totalBalance)}</div>
          <div className="stat-delta flat">
            <Icon name="trend-up" size={14} />
            {accounts.data.length} account{accounts.data.length === 1 ? '' : 's'} connected
          </div>
        </Card>
      </div>

      <div className="grid-cash" style={{ marginBottom: 20 }}>
        <Card className="card-pad">
          <div className="card-head">
            <div>
              <h2 className="card-title">Recent activity</h2>
              <p className="card-sub">Your latest transactions</p>
            </div>
            <Link className="link" to="/transactions">View all</Link>
          </div>
          {recent.data.transactions.length === 0 ? (
            <EmptyState title="No transactions yet" hint="Add your first one to see it here.">
              <button className="btn btn-primary btn-sm" onClick={openNew}>Add transaction</button>
            </EmptyState>
          ) : (
            <div className="feed">
              {recent.data.transactions.map((t) => (
                <div key={t.id} className="feed-row">
                  <span className="feed-ico" style={t.category_color ? { background: `${t.category_color}1a`, color: t.category_color } : undefined}>
                    {(t.category_icon || t.description || '?').slice(0, 1)}
                  </span>
                  <div className="feed-main">
                    <div className="feed-title">{t.description || 'Untitled'}</div>
                    <div className="feed-meta">{t.category_name} · {t.account_name} · {t.date}</div>
                  </div>
                  <span className={`feed-amount ${t.type === 'income' ? 'pos' : ''}`}>
                    {t.type === 'income' ? '+' : '−'}{smart(t.amount).replace('$', '$')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="card-pad">
          <div className="card-head">
            <div>
              <h2 className="card-title">Where it goes</h2>
              <p className="card-sub">This month by category</p>
            </div>
            <Link className="link" to="/analytics">View all</Link>
          </div>
          <DonutChart slices={slices.slice(0, 8)} centerLabel="total spent" centerValue={money(breakdown.data.total_spent, 0)} />
        </Card>
      </div>

      <div>
        <div className="insight-card">
          <span className="insight-kicker"><Icon name="sparkle" size={15} /> Fresh insight</span>
          {fresh ? (
            <p className="insight-text">{fresh.text}</p>
          ) : (
            <p className="insight-text">Add a few months of transactions and this space will surface patterns worth noticing.</p>
          )}
          <div className="insight-all"><Link className="link" to="/analytics">Open analytics</Link></div>
        </div>
      </div>
    </div>
  );
}
