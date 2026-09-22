import { useState } from 'react';
import api from '../api';
import { useAsync, useToasts } from '../hooks';
import { Button, Card, ConfirmDialog, EmptyState, FieldError, Modal, Select, Spinner, TextInput, ToastHost } from '../components/ui';
import { Icon } from '../components/icons';
import { Menu } from '../components/ui';
import { ACCOUNT_TYPES, money } from '../types';
import type { Account } from '../types';

const smart = (n: number) => money(n, Number.isInteger(n) ? 0 : 2);

const TYPE_ICON: Record<string, string> = {
  checking: '◍', savings: '◎', credit_card: '▭', cash: '◌', investment: '⬔',
};

export default function Accounts() {
  const toasts = useToasts();
  const accounts = useAsync(() => api.getAccounts(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

  const openCreate = () => { setEditing(null); setName(''); setType('checking'); setError(null); setFormOpen(true); };
  const openEdit = (a: Account) => { setEditing(a); setName(a.name); setType(a.type); setError(null); setFormOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      if (editing) { await api.updateAccount(editing.id, { name: name.trim(), type }); toasts.push('Account updated'); }
      else { await api.createAccount({ name: name.trim(), type }); toasts.push(`Account "${name.trim()}" created`); }
      setFormOpen(false);
      accounts.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteAccount(deleteTarget.id);
      toasts.push('Account deleted');
      setDeleteTarget(null);
      accounts.reload();
    } catch (err) {
      toasts.push(err instanceof Error ? err.message : 'Delete failed', 'err');
    }
  };

  return (
    <div>
      <ToastHost toasts={toasts.toasts} />
      <div className="page-head">
        <div>
          <div className="kicker green">The big picture</div>
          <h1 className="page-title">Accounts</h1>
          <p className="page-sub">Balances calculated from your transaction history.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreate}><Icon name="plus" size={17} /> Add account</button>
        </div>
      </div>

      {accounts.loading ? (
        <Card className="card-pad"><Spinner /></Card>
      ) : !accounts.data || accounts.data.length === 0 ? (
        <Card><EmptyState title="No accounts yet" hint="Create one to start tracking balances.">
          <Button variant="primary" onClick={openCreate}>Add account</Button>
        </EmptyState></Card>
      ) : (
        <div className="acc-grid">
          {accounts.data.map((a) => (
            <Card key={a.id} className="plate">
              <div className="plate-top">
                <span className="chip-ico">{TYPE_ICON[a.type] ?? '◍'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="plate-type">{ACCOUNT_TYPES.find((t) => t.value === a.type)?.label}</span>
                  <Menu
                    trigger={<button className="icon-btn" aria-label={`Actions for ${a.name}`}><Icon name="dots" size={18} /></button>}
                    items={[
                      { label: 'Edit', onClick: () => openEdit(a) },
                      { label: 'Delete', danger: true, onClick: () => setDeleteTarget(a) },
                    ]}
                  />
                </span>
              </div>
              <div className="plate-name">{a.name}</div>
              <div className="plate-big num">{smart(a.balance)}</div>
              <div className="plate-foot">
                <span>{a.transaction_count ?? 0} transactions</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit account' : 'Add account'} kicker="Accounts">
        <form onSubmit={submit} className="form">
          <TextInput label="Name" placeholder="e.g. Main checking" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value as Account['type'])}>
            {ACCOUNT_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </Select>
          {error && <FieldError>{error}</FieldError>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add account'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete account?"
        message={`"${deleteTarget?.name}" will be removed. Accounts with transactions cannot be deleted — they keep your history intact.`}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
