import { useState } from 'react';
import api from '../api';
import { useAsync, useToasts, todayKey } from '../hooks';
import { Badge, Button, Card, ConfirmDialog, EmptyState, FieldError, Menu, Modal, ProgressBar, Select, Spinner, TextInput, ToastHost } from '../components/ui';
import { BarChart } from '../components/charts';
import { Icon } from '../components/icons';
import { money } from '../types';
import type { Budget } from '../types';

const smart = (n: number) => money(n, Number.isInteger(n) ? 0 : 2);

const EMPTY_FORM = {
  category_id: '',
  limit_amount: '',
  period: 'monthly',
  start_date: todayKey().slice(0, 7) + '-01',
  alert_threshold: '80',
};

export default function Budgets() {
  const toasts = useToasts();
  const budgets = useAsync(() => api.getBudgets(), []);
  const categories = useAsync(() => api.getCategories(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [historyFor, setHistoryFor] = useState<number | null>(null);

  const history = useAsync(
    () => (historyFor !== null ? api.getBudgetHistory(historyFor, 6) : Promise.resolve([])),
    [historyFor]
  );

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setError(null); setFormOpen(true); };
  const openEdit = (b: Budget) => {
    setEditing(b);
    setForm({
      category_id: String(b.category_id),
      limit_amount: String(b.limit_amount),
      period: b.period,
      start_date: b.start_date,
      alert_threshold: String(b.alert_threshold),
    });
    setError(null);
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      category_id: Number(form.category_id),
      limit_amount: Number(form.limit_amount),
      period: form.period,
      start_date: form.start_date,
      alert_threshold: Number(form.alert_threshold),
    };
    if (!payload.category_id || !(payload.limit_amount > 0)) { setError('Pick a category and a positive limit'); return; }
    setSaving(true);
    try {
      if (editing) { await api.updateBudget(editing.id, payload); toasts.push('Budget updated'); }
      else { await api.createBudget(payload); toasts.push('Budget created'); }
      setFormOpen(false);
      budgets.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteBudget(deleteTarget.id);
      toasts.push('Budget deleted');
      setDeleteTarget(null);
      budgets.reload();
    } catch (err) {
      toasts.push(err instanceof Error ? err.message : 'Delete failed', 'err');
    }
  };

  const historyBudget = budgets.data?.find((b) => b.id === historyFor);
  const totalSpent = (budgets.data ?? []).reduce((s, b) => s + b.current_spent, 0);
  const totalLimit = (budgets.data ?? []).reduce((s, b) => s + b.limit_amount, 0);

  return (
    <div>
      <ToastHost toasts={toasts.toasts} />
      <div className="page-head">
        <div>
          <div className="kicker green">Stay intentional</div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-sub">A gentle guardrail for the things you value.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreate}><Icon name="plus" size={17} /> New budget</button>
        </div>
      </div>

      {budgets.loading ? (
        <Card className="card-pad"><Spinner /></Card>
      ) : !budgets.data || budgets.data.length === 0 ? (
        <Card><EmptyState title="No budgets yet" hint="Set a monthly limit per category to catch overspending early.">
          <Button variant="primary" onClick={openCreate}>Create your first budget</Button>
        </EmptyState></Card>
      ) : (
        <div className="budget-grid">
          {budgets.data.map((b) => {
            const tone = b.status === 'danger' ? 'danger' : b.status === 'warning' ? 'warning' : 'positive';
            return (
              <Card key={b.id} className="plate">
                <div className="plate-top">
                  <span className="budget-cat" style={{ color: b.category_color ?? 'var(--ink)' }}>{b.category_name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge tone={tone}>{b.status === 'danger' ? (b.current_spent >= b.limit_amount ? 'Over' : 'Near limit') : b.status === 'warning' ? 'Watch' : 'On track'}</Badge>
                    <Menu
                      trigger={<button className="icon-btn" aria-label={`Actions for ${b.category_name} budget`}><Icon name="dots" size={18} /></button>}
                      items={[
                        { label: 'History', onClick: () => { setHistoryFor(b.id); history.reload(); } },
                        { label: 'Edit', onClick: () => openEdit(b) },
                        { label: 'Delete', danger: true, onClick: () => setDeleteTarget(b) },
                      ]}
                    />
                  </span>
                </div>
                <div className="budget-pct">{smart(b.current_spent)} <span className="of">of {smart(b.limit_amount)}</span></div>
                <ProgressBar value={b.current_spent} max={b.limit_amount} tone={tone} />
                <div className="use-row">
                  <span className="left">{b.percentage_used.toFixed(1)}% used</span>
                  <span className="right">{b.over_by > 0 ? `${smart(b.over_by)} over` : `${smart(b.remaining)} remaining`}</span>
                </div>
              </Card>
            );
          })}
          <Card className="plate">
            <div className="plate-top">
              <span className="budget-cat dim">All spending</span>
              <Badge tone={totalSpent > totalLimit ? 'danger' : 'positive'}>{totalSpent > totalLimit ? 'Over' : 'On track'}</Badge>
            </div>
            <div className="budget-pct">{smart(totalSpent)} <span className="of">of {smart(totalLimit)}</span></div>
            <ProgressBar value={totalSpent} max={Math.max(totalLimit, 1)} tone={totalSpent > totalLimit ? 'danger' : 'accent'} />
            <div className="use-row">
              <span className="left">{totalLimit > 0 ? ((totalSpent / totalLimit) * 100).toFixed(1) : '0.0'}% used</span>
              <span className="right">{smart(Math.max(totalLimit - totalSpent, 0))} remaining</span>
            </div>
          </Card>
        </div>
      )}

      <Modal open={historyFor !== null} onClose={() => setHistoryFor(null)} title={historyBudget ? `${historyBudget.category_name} history` : 'History'} kicker="Budgets" wide>
        {history.loading ? <Spinner /> : (
          <>
            <BarChart
              data={(history.data ?? []).map((h) => ({ label: h.label, value: h.spent }))}
              color={historyBudget?.category_color ?? '#3f8f63'}
              height={220}
            />
            <div className="table-wrap">
              <table className="table table-sm">
                <thead><tr><th>Period</th><th className="num">Spent</th><th className="num">Limit</th><th className="num">Used</th></tr></thead>
                <tbody>
                  {(history.data ?? []).map((h, i) => (
                    <tr key={i}>
                      <td>{h.label}</td>
                      <td className="num">{smart(h.spent)}</td>
                      <td className="num">{smart(h.limit)}</td>
                      <td className="num">{h.percentage.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit budget' : 'New budget'} kicker="Budgets">
        <form onSubmit={submit} className="form">
          <Select label="Category" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
            <option value="">Select category</option>
            {categories.data?.filter((c) => c.is_active).map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
          </Select>
          <TextInput label="Limit" type="number" min="0" step="0.01" placeholder="500.00" value={form.limit_amount} onChange={(e) => setForm((f) => ({ ...f, limit_amount: e.target.value }))} />
          <div className="form-grid-2">
            <Select label="Period" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </Select>
            <TextInput label="Alert at (%)" type="number" min="1" max="100" value={form.alert_threshold} onChange={(e) => setForm((f) => ({ ...f, alert_threshold: e.target.value }))} />
          </div>
          <TextInput label="Start date" type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
          {error && <FieldError>{error}</FieldError>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create budget'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete budget?"
        message={`The ${smart(deleteTarget?.limit_amount ?? 0)} ${deleteTarget?.period} budget for ${deleteTarget?.category_name} will be removed. Transactions are unaffected.`}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
