import { useMemo, useState } from 'react';
import api from '../api';
import { useAsync, useToasts, formatDate, currentMonthKey } from '../hooks';
import { Button, Card, ConfirmDialog, EmptyState, Modal, Select, Spinner, TextInput, ToastHost } from '../components/ui';
import { CsvImportModal } from '../components/CsvImportModal';
import { Icon } from '../components/icons';
import { useTxModal } from '../components/TxFormModal';
import { money } from '../types';
import type { Transaction } from '../types';

const smart = (n: number) => money(n, Number.isInteger(n) ? 0 : 2);
type Tab = 'all' | 'income' | 'expense';

export default function Transactions() {
  const toasts = useToasts();
  const { openNew, openEdit, saved } = useTxModal();
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [tab, setTab] = useState<Tab>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [month, setMonth] = useState(currentMonthKey());
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [recurringOpen, setRecurringOpen] = useState(false);

  const data = useAsync(() => api.getTransactions({
    page, limit, sort: 'date', order: 'desc', month,
    category_id: categoryId, account_id: accountId,
    type: tab === 'all' ? '' : tab, status, search: searchQuery,
  }), [page, limit, month, categoryId, accountId, tab, status, searchQuery, saved]);

  const categories = useAsync(() => api.getCategories(), []);
  const accounts = useAsync(() => api.getAccounts(), []);
  const recurring = useAsync(() => api.getRecurring(), [saved, recurringOpen]);
  const upcoming = useAsync(() => api.getUpcoming(6), [saved, recurringOpen]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((data.data?.total ?? 0) / limit)), [data.data, limit]);

  const applySearch = () => { setSearchQuery(search); setPage(1); };
  const resetFilters = () => {
    setMonth(currentMonthKey()); setCategoryId(''); setAccountId(''); setStatus('');
    setSearch(''); setSearchQuery(''); setTab('all'); setPage(1);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteTransaction(deleteTarget.id);
      toasts.push('Transaction deleted');
      data.reload();
      setDeleteTarget(null);
    } catch (e) {
      toasts.push(e instanceof Error ? e.message : 'Delete failed', 'err');
    }
  };

  const handleOccurrence = async (sourceId: number, date: string, action: 'completed' | 'skipped') => {
    try {
      await api.markOccurrence(sourceId, date, action);
      toasts.push(action === 'completed' ? 'Occurrence recorded' : 'Occurrence skipped');
      recurring.reload();
      upcoming.reload();
      data.reload();
    } catch (e) {
      toasts.push(e instanceof Error ? e.message : 'Update failed', 'err');
    }
  };

  const exportCsv = () => {
    const url = api.exportUrl({ month, category_id: categoryId, account_id: accountId, type: tab === 'all' ? '' : tab });
    window.open(url, '_blank');
  };

  return (
    <div>
      <ToastHost toasts={toasts.toasts} />
      <div className="page-head">
        <div>
          <div className="kicker green">Ledger</div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub">Every inflow and outflow, in one clear view.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={exportCsv}><Icon name="download" size={16} /> Export CSV</button>
          <button className="btn btn-primary" onClick={openNew}><Icon name="plus" size={17} /> Add transaction</button>
        </div>
      </div>

      <div className="tx-toolbar">
        <div className="tx-toolbar-left">
          <div className="search-box">
            <span className="s-ico"><Icon name="search" size={17} /></span>
            <input
              className="input" placeholder="Search transactions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
              onBlur={applySearch}
              aria-label="Search transactions"
            />
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
            <Icon name="filter" size={16} /> Filters
          </button>
        </div>
        <div className="seg-tabs" role="tablist" aria-label="Type">
          {(['all', 'income', 'expense'] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`seg-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setPage(1); }}>
              {t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Expense'}
            </button>
          ))}
        </div>
      </div>

      {filtersOpen && (
        <div className="filter-panel">
          <label className="field">
            <span className="label">Month</span>
            <input type="month" className="input" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} />
          </label>
          <Select label="Category" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
            <option value="">All categories</option>
            {categories.data?.filter((c) => c.is_active).map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
          </Select>
          <Select label="Account" value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1); }}>
            <option value="">All accounts</option>
            {accounts.data?.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
          </Select>
          <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Any status</option>
            <option value="cleared">Cleared</option>
            <option value="pending">Pending</option>
          </Select>
          <div className="fp-actions">
            <Button variant="outline" className="btn-sm" onClick={resetFilters}>Reset</Button>
            <Button variant="light" className="btn-sm" onClick={() => setImportOpen(true)}><Icon name="upload" size={15} /> Import CSV</Button>
          </div>
        </div>
      )}
      {!filtersOpen && (
        <div style={{ marginBottom: 16 }}>
          <Button variant="light" className="btn-sm" onClick={() => setImportOpen(true)}><Icon name="upload" size={15} /> Import CSV</Button>
        </div>
      )}

      <Card>
        {data.loading ? <Spinner /> : !data.data || data.data.transactions.length === 0 ? (
          <EmptyState title="No transactions found" hint="Try a different search, or add a new entry.">
            <button className="btn btn-primary btn-sm" onClick={openNew}>Add transaction</button>
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Date</th>
                  <th>Account</th>
                  <th className="num">Amount</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="tx-name">{t.description || 'Untitled'}{t.is_recurring ? ' ⟳' : ''}</div>
                      <div className="tx-cat">
                        <span className="dot-swatch" style={{ background: t.category_color ?? '#c9d4cb' }} />
                        {t.category_name}{t.status === 'pending' ? ' · pending' : ''}
                      </div>
                    </td>
                    <td className="tx-date nowrap">{formatDate(t.date)}</td>
                    <td className="tx-acct">{t.account_name}</td>
                    <td className={`num amt ${t.type === 'income' ? 'pos' : ''}`}>{t.type === 'income' ? '+' : '−'}{smart(t.amount)}</td>
                    <td className="num">
                      <span className="row-actions">
                        <button className="icon-btn" onClick={() => openEdit(t.id)} aria-label={`Edit ${t.description || 'transaction'}`}><Icon name="pencil" size={17} /></button>
                        <button className="icon-btn danger" onClick={() => setDeleteTarget(t)} aria-label={`Delete ${t.description || 'transaction'}`}><Icon name="trash" size={17} /></button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="pager">
        <Button variant="outline" className="btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
        <span className="page-label">Page {page}{totalPages > 1 ? ` of ${totalPages}` : ''}</span>
        <Button variant="light" className="btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>

      <div style={{ marginTop: 26 }}>
        <Card className="card-pad">
          <button className="btn btn-outline btn-sm" onClick={() => setRecurringOpen((v) => !v)} aria-expanded={recurringOpen}>
            <Icon name="repeat" size={15} /> Recurring schedules
          </button>
          {recurringOpen && (
            <div className="grid-2" style={{ marginTop: 18 }}>
              <div>
                <h3 className="subhead">Templates</h3>
                {(recurring.data ?? []).length === 0 ? (
                  <p className="muted small">No recurring templates yet.</p>
                ) : (
                  <ul className="recur-list">
                    {(recurring.data ?? []).map((r) => (
                      <li key={r.id}>
                        <span className="dot-swatch" style={{ background: r.category_color ?? '#c9d4cb' }} />
                        <span><strong>{r.description || 'Untitled'}</strong> <span className="dim">· {r.recurring_pattern} · </span><span className="num">{smart(r.amount)}</span></span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="subhead">Upcoming</h3>
                {(upcoming.data ?? []).length === 0 ? (
                  <p className="muted small">Nothing scheduled.</p>
                ) : (
                  <ul className="recur-list">
                    {(upcoming.data ?? []).map((o, i) => (
                      <li key={`${o.source_id}-${o.date}-${i}`} className={o.status !== 'scheduled' ? 'dim' : ''}>
                        <span className="occ-date">{o.date}</span>
                        <span><strong>{o.description}</strong> <span className="dim">· </span><span className="num">{smart(o.amount)}</span></span>
                        {o.status === 'scheduled' ? (
                          <span className="occ-actions">
                            <button className="btn btn-light btn-xs" onClick={() => handleOccurrence(o.source_id, o.date, 'completed')}>Done</button>
                            <button className="btn btn-outline btn-xs" onClick={() => handleOccurrence(o.source_id, o.date, 'skipped')}>Skip</button>
                          </span>
                        ) : (
                          <span className="occ-status">{o.status}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} accounts={accounts.data ?? []} onImported={(result) => {
        toasts.push(result.imported_count > 0 ? `Imported ${result.imported_count} transactions${result.skipped_count ? `, skipped ${result.skipped_count}` : ''}` : `Nothing imported${result.skipped_count ? ` — ${result.skipped_count} duplicates skipped` : ''}`, result.errors.length > 0 ? 'err' : 'ok');
        data.reload();
      }} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete transaction?"
        message={`This permanently removes “${deleteTarget?.description || 'Untitled transaction'}" (${smart(deleteTarget?.amount ?? 0)}). This cannot be undone.`}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
