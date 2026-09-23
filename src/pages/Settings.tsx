import { useState } from 'react';
import api from '../api';
import { useAsync, useToasts } from '../hooks';
import { Button, Card, ConfirmDialog, FieldError, Modal, Select, Spinner, TextInput, ToastHost } from '../components/ui';
import { ACCOUNT_TYPES, money } from '../types';
import type { Account, Category } from '../types';

const ICON_CHOICES = ['🏠', '🍔', '🚗', '💡', '🎬', '🏥', '🛍️', '💰', '💵', '📁', '✈️', '🎓', '🐶', '🎮', '📚', '💼', '🎁', '🧾'];
const COLOR_CHOICES = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#22c55e', '#a855f7', '#0d9488', '#e11d48'];

export default function Settings() {
  const toasts = useToasts();
  const categories = useAsync(() => api.getCategories(), []);
  const accounts = useAsync(() => api.getAccounts(), []);

  const [catForm, setCatForm] = useState<{ name: string; icon: string; color: string }>({
    name: '',
    icon: '📁',
    color: '#3b82f6',
  });
  const [catOpen, setCatOpen] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deletingCategoryError, setDeletingCategoryError] = useState<string | null>(null);

  const [accForm, setAccForm] = useState<{ name: string; type: string }>({ name: '', type: 'checking' });
  const [accOpen, setAccOpen] = useState(false);
  const [accError, setAccError] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);
    if (!catForm.name.trim()) {
      setCatError('Name is required');
      return;
    }
    try {
      await api.createCategory(catForm);
      toasts.push(`Category "${catForm.name}" created`);
      setCatOpen(false);
      setCatForm({ name: '', icon: '📁', color: '#3b82f6' });
      categories.reload();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Create failed');
    }
  };

  const toggleCategoryActive = async (c: Category) => {
    try {
      await api.updateCategory(c.id, { is_active: !c.is_active });
      categories.reload();
    } catch (err) {
      toasts.push(err instanceof Error ? err.message : 'Update failed', 'err');
    }
  };

  const doDeleteCategory = async () => {
    if (!deletingCategory) return;
    setDeletingCategoryError(null);
    try {
      await api.deleteCategory(deletingCategory.id);
      toasts.push('Category deleted');
      setDeletingCategory(null);
      categories.reload();
    } catch (err) {
      setDeletingCategoryError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccError(null);
    if (!accForm.name.trim()) {
      setAccError('Name is required');
      return;
    }
    try {
      await api.createAccount(accForm);
      toasts.push(`Account "${accForm.name}" created`);
      setAccOpen(false);
      setAccForm({ name: '', type: 'checking' });
      accounts.reload();
    } catch (err) {
      setAccError(err instanceof Error ? err.message : 'Create failed');
    }
  };

  const doDeleteAccount = async () => {
    if (!deletingAccount) return;
    try {
      await api.deleteAccount(deletingAccount.id);
      toasts.push('Account deleted');
      setDeletingAccount(null);
      accounts.reload();
    } catch (err) {
      toasts.push(err instanceof Error ? err.message : 'Delete failed', 'err');
    }
  };

  return (
    <div className="stack">
      <ToastHost toasts={toasts.toasts} />

      <div className="grid-2">
        {/* Categories */}
        <Card className="padded">
          <div className="card-head">
            <h2>Categories</h2>
            <Button variant="primary" className="btn-sm" onClick={() => { setCatOpen(true); setCatError(null); }}>+ New</Button>
          </div>
          {categories.loading ? (
            <Spinner />
          ) : (
            <div className="settings-list">
              {categories.data?.map((c) => (
                <div key={c.id} className={`settings-row ${!c.is_active ? 'dim' : ''}`}>
                  <span className="row-icon" style={{ background: `${c.color}1a` }}>{c.icon}</span>
                  <div className="row-main">
                    <div className="row-title">{c.name}{!c.is_active && <span className="muted"> (inactive)</span>}</div>
                    <div className="row-sub">
                      {c.is_default ? 'Default' : 'Custom'}{c.transaction_count !== undefined && ` · ${c.transaction_count} tx · ${money(c.total_spent ?? 0, 0)} spent`}
                    </div>
                  </div>
                  <span className={`color-dot ${c.is_active ? '' : 'dim'}`} style={{ background: c.color }} />
                  <button
                    className="btn ghost btn-xs"
                    onClick={() => toggleCategoryActive(c)}
                    title={c.is_active ? 'Hide from new transactions' : 'Show again'}
                  >
                    {c.is_active ? 'Hide' : 'Show'}
                  </button>
                  {!c.is_default && (
                    <Button variant="danger-ghost" className="btn-xs" onClick={() => { setDeletingCategory(c); setDeletingCategoryError(null); }}>
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Accounts */}
        <Card className="padded">
          <div className="card-head">
            <h2>Accounts</h2>
            <Button variant="primary" className="btn-sm" onClick={() => { setAccOpen(true); setAccError(null); }}>+ New</Button>
          </div>
          {accounts.loading ? (
            <Spinner />
          ) : (
            <div className="settings-list">
              {accounts.data?.map((a) => (
                <div key={a.id} className="settings-row">
                  <span className="row-icon">{ACCOUNT_TYPES.find((t) => t.value === a.type)?.label.slice(0, 1) ?? '•'}</span>
                  <div className="row-main">
                    <div className="row-title">{a.name}</div>
                    <div className="row-sub">
                      {ACCOUNT_TYPES.find((t) => t.value === a.type)?.label}
                      {a.transaction_count !== undefined && ` · ${a.transaction_count} tx`}
                    </div>
                  </div>
                  <span className={`num ${a.balance < 0 ? 'expense' : ''}`}>{money(a.balance)}</span>
                  <Button
                    variant="danger-ghost"
                    className="btn-xs"
                    disabled={(a.transaction_count ?? 0) > 0}
                    title={(a.transaction_count ?? 0) > 0 ? 'Accounts with transactions cannot be deleted' : ''}
                    onClick={() => setDeletingAccount(a)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="settings-foot muted small">
            Balances are calculated from your transactions — they always match your history.
          </div>
        </Card>
      </div>

      {/* New category modal */}
      <Modal open={catOpen} onClose={() => setCatOpen(false)} title="New category">
        <form onSubmit={createCategory} className="form">
          <TextInput label="Name" placeholder="e.g. Pets" maxLength={50} value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          <span className="field-label">Icon</span>
          <div className="icon-grid">
            {ICON_CHOICES.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`icon-choice ${catForm.icon === ic ? 'selected' : ''}`}
                onClick={() => setCatForm((f) => ({ ...f, icon: ic }))}
              >
                {ic}
              </button>
            ))}
          </div>
          <span className="field-label">Color</span>
          <div className="color-grid">
            {COLOR_CHOICES.map((col) => (
              <button
                key={col}
                type="button"
                className={`color-choice ${catForm.color === col ? 'selected' : ''}`}
                style={{ background: col }}
                onClick={() => setCatForm((f) => ({ ...f, color: col }))}
                aria-label={col}
              />
            ))}
          </div>
          {catError && <FieldError>{catError}</FieldError>}
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={() => setCatOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create category</Button>
          </div>
        </form>
      </Modal>

      {/* New account modal */}
      <Modal open={accOpen} onClose={() => setAccOpen(false)} title="New account">
        <form onSubmit={createAccount} className="form">
          <TextInput label="Name" placeholder="e.g. Checking, Visa, Emergency savings" maxLength={50} value={accForm.name} onChange={(e) => setAccForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          <Select label="Type" value={accForm.type} onChange={(e) => setAccForm((f) => ({ ...f, type: e.target.value }))}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
          {accError && <FieldError>{accError}</FieldError>}
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={() => setAccOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create account</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deletingCategory !== null}
        title="Delete category?"
        message={`"${deletingCategory?.name}" will be removed.`}
        onConfirm={doDeleteCategory}
        onCancel={() => setDeletingCategory(null)}
      />
      {deletingCategoryError && (
        <div className="toasts"><div className="toast err">⚠ {deletingCategoryError}</div></div>
      )}

      <ConfirmDialog
        open={deletingAccount !== null}
        title="Delete account?"
        message={`"${deletingAccount?.name}" will be removed. Accounts with transactions cannot be deleted — they keep your history intact.`}
        onConfirm={doDeleteAccount}
        onCancel={() => setDeletingAccount(null)}
      />
    </div>
  );
}