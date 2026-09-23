import { useState } from 'react';
import api from '../api';
import { useAsync, useToasts } from '../hooks';
import { Button, Card, ConfirmDialog, EmptyState, FieldError, Menu, Modal, ProgressBar, Select, Spinner, TextInput, ToastHost } from '../components/ui';
import { Icon } from '../components/icons';
import { money } from '../types';
import type { Goal } from '../types';

const smart = (n: number) => money(n, Number.isInteger(n) ? 0 : 2);
const EMPTY = { name: '', target_amount: '', target_date: '' };
const TONES = ['#3f8f63', '#dd9f2e', '#6d9dc5', '#7d6bc4', '#d4699e', '#4fb3a9'];

const prettyDate = (iso: string) => (iso ? iso.split('-').reverse().join('-') : '');

export default function Goals() {
  const toasts = useToasts();
  const goals = useAsync(() => api.getGoals(true), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [depositFor, setDepositFor] = useState<Goal | null>(null);
  const [deposit, setDeposit] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(null); setFormOpen(true); };
  const openEdit = (g: Goal) => {
    setEditing(g);
    setForm({ name: g.name, target_amount: String(g.target_amount), target_date: g.target_date ?? '' });
    setError(null);
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !(Number(form.target_amount) > 0)) { setError('A name and a positive target amount are required'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), target_amount: Number(form.target_amount), target_date: form.target_date || null };
      if (editing) { await api.updateGoal(editing.id, payload); toasts.push('Goal updated'); }
      else { await api.createGoal(payload); toasts.push('Goal created'); }
      setFormOpen(false);
      goals.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const doDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositFor) return;
    const amt = Number(deposit);
    if (!(amt > 0)) { setError('Enter a positive amount'); return; }
    try {
      const res = await api.depositToGoal(depositFor.id, amt);
      toasts.push(`Deposited ${smart(amt)} — now at ${smart(res.new_current_amount)}`);
      setDepositFor(null);
      setDeposit('');
      setError(null);
      goals.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed');
    }
  };

  const toggleAchieved = async (g: Goal, achieved: boolean) => {
    try {
      await api.updateGoal(g.id, { achieved });
      toasts.push(achieved ? `"${g.name}" marked as achieved` : 'Goal reopened');
      goals.reload();
    } catch (err) {
      toasts.push(err instanceof Error ? err.message : 'Update failed', 'err');
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteGoal(deleteTarget.id);
      toasts.push('Goal deleted');
      setDeleteTarget(null);
      goals.reload();
    } catch (err) {
      toasts.push(err instanceof Error ? err.message : 'Delete failed', 'err');
    }
  };

  const all = goals.data ?? [];
  const active = all.filter((g) => !g.achieved);
  const archived = all.filter((g) => g.achieved);
  const visible = showArchived ? active.concat(archived) : active;

  return (
    <div>
      <ToastHost toasts={toasts.toasts} />
      <div className="page-head">
        <div>
          <div className="kicker green">Future you</div>
          <h1 className="page-title">Savings goals</h1>
          <p className="page-sub">Small, consistent steps toward what matters.</p>
        </div>
        <div className="page-actions">
          {archived.length > 0 && (
            <button className="btn btn-outline" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? 'Hide achieved' : `Achieved (${archived.length})`}
            </button>
          )}
          <button className="btn btn-primary" onClick={openCreate}><Icon name="plus" size={17} /> New goal</button>
        </div>
      </div>

      {goals.loading ? (
        <Card className="card-pad"><Spinner /></Card>
      ) : visible.length === 0 ? (
        <Card><EmptyState title="No goals yet" hint="Save toward something specific — a trip, an emergency fund, a big purchase.">
          <Button variant="primary" onClick={openCreate}>Create your first goal</Button>
        </EmptyState></Card>
      ) : (
        <div className="goal-grid">
          {visible.map((g, i) => {
            const pct = g.percentage_complete ?? 0;
            const tone = TONES[i % TONES.length];
            return (
              <Card key={g.id} className="plate" style={{ opacity: g.achieved ? 0.75 : 1 }}>
                <div className="plate-top">
                  <span className="chip-ico" style={{ background: `${tone}1c`, color: tone }}><Icon name="target" size={21} /></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {g.at_risk && !g.achieved && <span className="pill warning">At risk</span>}
                    {g.achieved && <span className="pill positive">Achieved</span>}
                    <Menu
                      trigger={<button className="icon-btn" aria-label={`Actions for ${g.name}`}><Icon name="dots" size={18} /></button>}
                      items={[
                        ...(!g.achieved ? [{ label: 'Deposit', onClick: () => { setDepositFor(g); setDeposit(''); setError(null); } }] : []),
                        { label: g.achieved ? 'Reopen' : 'Mark achieved', onClick: () => toggleAchieved(g, !g.achieved) },
                        { label: 'Edit', onClick: () => openEdit(g) },
                        { label: 'Delete', danger: true, onClick: () => setDeleteTarget(g) },
                      ]}
                    />
                  </span>
                </div>
                <div className="plate-name">{g.name}</div>
                <div className="budget-pct">{smart(g.current_amount)} <span className="of">of {smart(g.target_amount)}</span></div>
                <ProgressBar value={g.current_amount} max={Math.max(g.target_amount, 1)} tone={g.achieved ? 'positive' : g.at_risk ? 'warning' : 'accent'} />
                <div className="use-row">
                  <span className="left">{pct.toFixed(0)}% complete</span>
                  {g.target_date && <span className="right">Target {prettyDate(g.target_date)}</span>}
                </div>
                {g.projected_completion_date && !g.achieved && (
                  <div className="goal-meta">
                    <div className="goal-detail">
                      <span>{g.at_risk ? 'Projected' : 'On pace for'} {prettyDate(g.projected_completion_date)}</span>
                      {g.at_risk && g.required_monthly !== null && (
                        <span className="goal-warn">need {money(g.required_monthly, 0)}/mo</span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit goal' : 'New savings goal'} kicker="Goals">
        <form onSubmit={submit} className="form">
          <TextInput label="Goal name" placeholder="e.g. Vacation fund" maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <TextInput label="Target amount" type="number" min="0" step="0.01" value={form.target_amount} onChange={(e) => setForm((f) => ({ ...f, target_amount: e.target.value }))} />
          <TextInput label="Target date (optional)" type="date" value={form.target_date} onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))} />
          <p className="muted small">Progress is tracked from deposits and from income transactions linked to the goal.</p>
          {error && <FieldError>{error}</FieldError>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create goal'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={depositFor !== null} onClose={() => setDepositFor(null)} title={depositFor ? `Deposit to "${depositFor.name}"` : 'Deposit'} kicker="Goals">
        <form onSubmit={doDeposit} className="form">
          <p className="muted">
            Current progress: <strong>{money(depositFor?.current_amount ?? 0)}</strong> of {money(depositFor?.target_amount ?? 0, 0)}. A deposit updates the goal without creating a transaction.
          </p>
          <TextInput label="Amount" type="number" min="0.01" step="0.01" autoFocus value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          {error && <FieldError>{error}</FieldError>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={() => setDepositFor(null)}>Cancel</Button>
            <Button type="submit" variant="primary">Deposit</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete goal?"
        message={`"${deleteTarget?.name}" and its progress will be permanently removed.`}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
