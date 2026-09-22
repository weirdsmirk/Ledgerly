import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import api from '../api';
import { useAsync, todayKey } from '../hooks';
import { ACCOUNT_TYPES, RECURRING_PATTERNS, type Transaction } from '../types';
import { Button, FieldError, Modal, Select, TextInput } from './ui';

interface TxModalState { open: boolean; editingId: number | null; }
const TxModalCtx = createContext<{ openNew: () => void; openEdit: (id: number) => void; saved: number }>({
  openNew: () => {}, openEdit: () => {}, saved: 0,
});
export const useTxModal = () => useContext(TxModalCtx);

export function TxModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TxModalState>({ open: false, editingId: null });
  const [saved, setSaved] = useState(0);
  const openNew = useCallback(() => setState({ open: true, editingId: null }), []);
  const openEdit = useCallback((id: number) => setState({ open: true, editingId: id }), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  return (
    <TxModalCtx.Provider value={{ openNew, openEdit, saved }}>
      {children}
      <TxFormModal open={state.open} editingId={state.editingId} onClose={close} onSaved={() => { setSaved((n) => n + 1); close(); }} />
    </TxModalCtx.Provider>
  );
}

function TxFormModal({ open, editingId, onClose, onSaved }: {
  open: boolean; editingId: number | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = editingId !== null;
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayKey());
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [isRecurring, setIsRecurring] = useState(false);
  const [pattern, setPattern] = useState('monthly');
  const [status, setStatus] = useState<'cleared' | 'pending'>('cleared');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [accFormOpen, setAccFormOpen] = useState(false);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('checking');
  const [accError, setAccError] = useState<string | null>(null);

  const accounts = useAsync(() => api.getAccounts(), []);
  const categories = useAsync(() => api.getCategories(), []);
  const goals = useAsync(() => api.getGoals(false), []);
  const accountsLoaded = accounts.data !== null;
  const noAccounts = accountsLoaded && accounts.data!.length === 0;
  const existing = useAsync(
    () => (editingId !== null && open ? api.getTransaction(editingId) : Promise.resolve(null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingId, open]
  );

  // Re-fetch accounts/categories every time the modal opens, so anything
  // created elsewhere (or in this modal) shows up immediately.
  useEffect(() => {
    if (!open) return;
    accounts.reload();
    categories.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingId === null) {
      setGoalId(''); setAmount('');
      setDescription(''); setDate(todayKey()); setType('expense');
      setIsRecurring(false); setPattern('monthly'); setStatus('cleared');
   }
  }, [open, editingId]);

  // Sensible defaults: preselect the first account/category once lists arrive,
  // without ever clobbering a choice the user already made.
  useEffect(() => {
    if (!open || editingId !== null) return;
    setAccountId((v) => v || String(accounts.data?.[0]?.id ?? ''));
    setCategoryId((v) => v || String(categories.data?.filter((c) => c.is_active)[0]?.id ?? ''));
  }, [open, editingId, accounts.data, categories.data]);

  useEffect(() => {
    const t: Transaction | null | undefined = existing.data;
    if (!open || editingId === null || !t) return;
    setAccountId(String(t.account_id));
    setCategoryId(String(t.category_id));
    setGoalId(t.goal_id ? String(t.goal_id) : '');
    setAmount(String(t.amount));
    setDescription(t.description ?? '');
    setDate(t.date);
    setType(t.type);
    setIsRecurring(Boolean(t.is_recurring));
    setPattern(t.recurring_pattern ?? 'monthly');
    setStatus(t.status);
  }, [open, editingId, existing.data]);

  const categoryChoices = categories.data?.filter((c) => c.is_active) ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setError('Amount must be a positive number'); return; }
    if (!accountId) { setError('Pick an account'); return; }
    if (!categoryId) { setError('Pick a category'); return; }
    if (!date) { setError('Pick a date'); return; }
    setSaving(true);
    try {
      const payload = {
        account_id: Number(accountId),
        category_id: Number(categoryId),
        goal_id: goalId ? Number(goalId) : null,
        amount: +amt.toFixed(2),
        description: description.trim() || null,
        date, type, status,
        is_recurring: isRecurring,
        recurring_pattern: isRecurring ? pattern : null,
      };
      if (isEdit && editingId !== null) await api.updateTransaction(editingId, payload);
      else await api.createTransaction(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit transaction' : 'Add transaction'} kicker="New entry">
      <form onSubmit={submit} className="form">
        <label className="field">
          <span className="label">Type</span>
          <span className="type-switch">
            <button type="button" className={type === 'expense' ? 'seg active-exp' : 'seg'} onClick={() => setType('expense')}>Expense</button>
            <button type="button" className={type === 'income' ? 'seg active-inc' : 'seg'} onClick={() => setType('income')}>Income</button>
          </span>
        </label>
        <TextInput label="Amount" type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <div className="form-grid-2">
          <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select</option>
            {categoryChoices.map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
          </Select>
          <Select label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Select</option>
            {accounts.data?.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
          </Select>
        </div>
        <TextInput label="Description" placeholder="What was this for?" maxLength={255} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="form-grid-2">
          <TextInput label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as 'cleared' | 'pending')}>
            <option value="cleared">Cleared</option>
            <option value="pending">Pending</option>
          </Select>
        </div>
        <label className="check">
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
          Repeats
        </label>
        {isRecurring && (
          <Select label="Repeat every" value={pattern} onChange={(e) => setPattern(e.target.value)}>
            {RECURRING_PATTERNS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
          </Select>
        )}
        {goals.data && goals.data.length > 0 && (
          <Select label="Tie to goal (optional)" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">None</option>
            {goals.data.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
          </Select>
        )}
        {accounts.data && accounts.data.length === 0 && <FieldError>No accounts exist — create one on the Accounts page first.</FieldError>}
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" variant="primary" className="btn-block" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save transaction'}
        </Button>
      </form>
    </Modal>
  );
}
