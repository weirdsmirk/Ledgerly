import { useState } from 'react';
import api from '../api';
import { useAsync } from '../hooks';
import { Card, EmptyState, Select, Spinner } from '../components/ui';
import { AreaChart, BarChart, DonutChart, type DonutSlice } from '../components/charts';
import { money } from '../types';

const smart = (n: number) => money(n, Number.isInteger(n) ? 0 : 2);

export default function Analytics() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [categoryId, setCategoryId] = useState('');
  const [compareYear, setCompareYear] = useState(now.getFullYear());

  const breakdown = useAsync(() => api.getMonthlyBreakdown(year, month), [year, month]);
  const trends = useAsync(() => api.getTrends(12), []);
  const categories = useAsync(() => api.getCategories(), []);
  const comparison = useAsync(
    () => (categoryId ? api.getCategoryComparison(Number(categoryId), compareYear) : Promise.resolve(null)),
    [categoryId, compareYear]
  );
  const insights = useAsync(() => api.getInsights(), []);

  const months = [...(trends.data ?? [])].reverse();

  const slices: DonutSlice[] = (breakdown.data?.categories ?? []).map((c) => ({
    key: String(c.id), label: c.name, icon: c.icon, color: c.color, value: c.total,
  }));

  const topCats = [...(breakdown.data?.categories ?? [])].sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 6 }}>
        <div>
          <div className="kicker green">Find the signal</div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Patterns and perspective, not just numbers.</p>
        </div>
      </div>

      <div className="grid-cash">
        <Card className="card-pad">
          <div className="card-head">
            <div>
              <h2 className="card-title">Income vs expenses</h2>
              <p className="card-sub">Monthly comparison</p>
            </div>
          </div>
          <AreaChart
            labels={months.map((t) => t.label)}
            series={[
              { label: 'Income', color: '#3f8f63', fill: '#3f8f63', values: months.map((t) => t.income) },
              { label: 'Expenses', color: '#dd9f2e', fill: '#dd9f2e', values: months.map((t) => t.expenses) },
            ]}
          />
        </Card>
        <Card className="card-pad">
          <div className="card-head">
            <div>
              <h2 className="card-title">Top categories</h2>
              <p className="card-sub">All-time spending</p>
            </div>
          </div>
          {topCats.length === 0 ? (
            <EmptyState title="No spending yet" hint="Add expenses to see your top categories." />
          ) : (
            <ol className="rank-list">
              {topCats.map((c, i) => (
                <li key={c.id}>
                  <span className="rank-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="rank-name"><span className="dot-swatch" style={{ background: c.color }} /> {c.name}</span>
                  <span className="rank-amt">{smart(c.total)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="card-pad">
        <div className="card-head">
          <div>
            <h2 className="card-title">Monthly breakdown</h2>
            <p className="card-sub">Where the money went, category by category</p>
          </div>
          <input
            type="month"
            className="input"
            style={{ width: 'auto' }}
            value={`${year}-${String(month).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              if (y && m) { setYear(y); setMonth(m); }
            }}
          />
        </div>
        {breakdown.loading ? <Spinner /> : breakdown.data && breakdown.data.categories.length === 0 ? (
          <EmptyState title="No expenses for this month" hint="Pick another month or add expenses." />
        ) : (
          <div className="breakdown-layout">
            <DonutChart slices={slices} centerLabel="total spent" centerValue={money(breakdown.data?.total_spent ?? 0, 0)} showLegend={false} />
            <div className="breakdown-rows">
              {breakdown.data?.categories.map((c) => (
                <div key={c.id} className="breakdown-row">
                  <span className="dot-swatch" style={{ background: c.color }} />
                  <span className="cat-name">{c.name}</span>
                  <span className="tx-count">{c.count} transactions</span>
                  <span className="r-amt">{smart(c.total)}</span>
                  <span className="r-pct">{c.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid-2">
        <Card className="card-pad">
          <div className="card-head">
            <div>
              <h2 className="card-title">Category comparison</h2>
              <p className="card-sub">How one category moves through the year</p>
            </div>
          </div>
          <div className="inline-controls" style={{ marginBottom: 12 }}>
            <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ minWidth: 180 }}>
              <option value="">Pick a category</option>
              {categories.data?.filter((c) => c.is_active).map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
            </Select>
            <Select label="Year" value={String(compareYear)} onChange={(e) => setCompareYear(Number(e.target.value))} style={{ minWidth: 120 }}>
              {[now.getFullYear(), now.getFullYear() - 1].map((y) => (<option key={y} value={y}>{y}</option>))}
            </Select>
          </div>
          {comparison.loading ? <Spinner /> : comparison.data ? (
            <BarChart
              data={comparison.data.months.map((m) => ({ label: m.label, value: m.total, count: m.count }))}
              color={comparison.data.category.color}
              height={220}
            />
          ) : (
            <EmptyState title="Pick a category" hint="See how a category's spending varies month to month." />
          )}
        </Card>

        <Card className="card-pad">
          <div className="card-head">
            <div>
              <h2 className="card-title">Insights</h2>
              <p className="card-sub">Quiet observations from your data</p>
            </div>
          </div>
          {insights.loading ? <Spinner /> : insights.data && insights.data.length === 0 ? (
            <p className="muted">Add a few months of transactions to unlock observations.</p>
          ) : (
            <ul className="insight-list">
              {insights.data?.map((i, idx) => (
                <li key={idx} className={`insight ${i.type}`}>
                  <span className="insight-rail" />
                  <span className="insight-text">{i.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
