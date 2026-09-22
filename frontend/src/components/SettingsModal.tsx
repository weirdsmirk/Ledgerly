import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import api from '../api';
import { useAsync, useToasts } from '../hooks';
import { ACCOUNT_TYPES, CURRENCIES, currencySymbolFor, money, setCurrencySymbol } from '../types';
import type { AppSettings, Category } from '../types';
import { Button, FieldError, Modal, Select, TextInput, ToastHost } from './ui';

const SettingsCtx = createContext<{
  openSettings: () => void;
  settings: AppSettings | null;
  saveSettings: (data: Partial<AppSettings>) => Promise<AppSettings>;
}>({ openSettings: () => {}, settings: null, saveSettings: async () => ({}) as AppSettings });
export const useSettingsModal = () => useContext(SettingsCtx);

const ICON_CHOICES = ['🏠', '🍔', '🚗', '💡', '🎬', '🏥', '🛍️', '💰', '💵', '📁', '✈️', '🎓', '🐶', '🎮', '📚', '💼', '🎁', '🧾'];
const COLOR_CHOICES = ['#3f8f63', '#dd9f2e', '#6d9dc5', '#7d6bc4', '#c05b52', '#d4699e', '#4fb3a9', '#8a8f98'];

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSettings = useCallback(() => setOpen(true), []);
  const settings = useAsync<AppSettings>(() => api.getSettings(), []);

  // Apply the saved currency symbol as soon as settings are available.
  useEffect(() => {
    if (settings.data) setCurrencySymbol(currencySymbolFor(settings.data.currency));
  }, [settings.data]);

  const saveSettings = useCallback(
    async (data: Partial<AppSettings>) => {
      const updated = await api.updateSettings(data);
      setCurrencySymbol(currencySymbolFor(updated.currency));
      await settings.reload();
      return updated;
    },
    [settings]
  );

  return (
    <SettingsCtx.Provider value={{ openSettings, settings: settings.data, saveSettings }}>
      {children}
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </SettingsCtx.Provider>
  );
}

function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toasts = useToasts();
  const { settings, saveSettings } = useSettingsModal();
  const categories = useAsync(() => api.getCategories(), []);
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', icon: '📁', color: '#3f8f63' });
  const [catError, setCatError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [prefs, setPrefs] = useState<AppSettings | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Load the current values into the form whenever the modal is opened.
  useEffect(() => {
    if (open) {
      setPrefsError(null);
      setPrefs(settings ? { ...settings } : null);
    }
  }, [open, settings]);

  const reload = () => categories.reload();

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);
    if (!catForm.name.trim()) { setCatError('Name is required'); return; }
    try {
      await api.createCategory(catForm);
      toasts.push(`Category "${catForm.name}" created`);
      setCatOpen(false);
      setCatForm({ name: '', icon: '📁', color: '#3f8f63' });
      reload();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Create failed');
    }
  };

  const toggleActive = async (c: Category) => {
    try {
      await api.updateCategory(c.id, { is_active: !c.is_active });
      reload();
    } catch (err) {
      toasts.push(err instanceof Error ? err.message : 'Update failed', 'err');
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteCategory(confirmDelete.id);
      toasts.push('Category deleted');
      setConfirmDelete(null);
      reload();
    } catch (err) {
      toasts.push(err instanceof Error ? err.message : 'Delete failed', 'err');
    }
  };

  const savePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefs) return;
    setPrefsError(null);
    setSavingPrefs(true);
    try {
      await saveSettings({
        currency: prefs.currency,
        display_name: prefs.display_name,
        workspace_name: prefs.workspace_name,
      });
      toasts.push('Settings saved');
      onClose();
    } catch (err) {
      setPrefsError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <>
      <ToastHost toasts={toasts.toasts} />
      <Modal open={open && !catOpen} onClose={onClose} title="Settings" kicker="Workspace">
        <div className="set-row">
          <div className="set-main">
            <div className="set-title">Local storage</div>
            <div className="set-sub">Your financial data stays in Ledgerly's SQLite file.</div>
          </div>
          <span className="set-flag"><span className="pulse" /> Active</span>
        </div>
        <div className="set-row">
          <div className="set-main">
            <div className="set-title">Workspace</div>
            <div className="set-sub">{settings?.display_name ?? '—'} · {settings?.workspace_name ?? '—'}</div>
          </div>
          <span className="set-flag plain">Private</span>
        </div>
        <div className="set-row">
          <div className="set-main">
            <div className="set-title">Preferences</div>
            <div className="set-sub">Currency and workspace details, used across the app</div>
          </div>
        </div>
        <form className="form" onSubmit={savePrefs} style={{ marginBottom: 18 }}>
          <Select
            label="Currency"
            value={prefs?.currency ?? 'USD'}
            onChange={(e) => setPrefs((f) => (f ? { ...f, currency: e.target.value } : f))}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.label}</option>
            ))}
          </Select>
          <div className="form-grid-2">
            <TextInput
              label="Your name"
              placeholder="e.g. Jordan Davis"
              maxLength={80}
              value={prefs?.display_name ?? ''}
              onChange={(e) => setPrefs((f) => (f ? { ...f, display_name: e.target.value } : f))}
            />
            <TextInput
              label="Workspace name"
              placeholder="e.g. Personal finances"
              maxLength={80}
              value={prefs?.workspace_name ?? ''}
              onChange={(e) => setPrefs((f) => (f ? { ...f, workspace_name: e.target.value } : f))}
            />
          </div>
          {prefsError && <FieldError>{prefsError}</FieldError>}
          <div style={{ paddingTop: 2 }}>
            <Button type="submit" variant="primary" disabled={savingPrefs || !prefs}>
              {savingPrefs ? 'Saving…' : 'Save preferences'}
            </Button>
          </div>
        </form>
        <div className="set-row">
          <div className="set-main">
            <div className="set-title">Categories</div>
            <div className="set-sub">{categories.data?.length ?? 0} categories · hide the ones you no longer use</div>
          </div>
        </div>
        <div className="settings-list" style={{ marginTop: 4 }}>
          {categories.data?.map((c) => (
            <div key={c.id} className="settings-row" style={{ opacity: c.is_active ? 1 : 0.55 }}>
              <span className="feed-ico" style={{ width: 34, height: 34, background: `${c.color}1a`, color: c.color }}>{c.icon}</span>
              <div className="row-main">
                <div className="row-title">{c.name}{!c.is_active && <span className="dim"> (hidden)</span>}</div>
                <div className="row-sub">{c.is_default ? 'Default' : 'Custom'}{c.transaction_count !== undefined && ` · ${c.transaction_count} transactions`}</div>
              </div>
              <button className="btn btn-outline btn-xs" onClick={() => toggleActive(c)}>{c.is_active ? 'Hide' : 'Show'}</button>
              {!c.is_default && (
                <button className="btn btn-danger-ghost btn-xs" onClick={() => setConfirmDelete(c)}>Delete</button>
              )}
            </div>
          ))}
        </div>
        <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
          <Button variant="outline" onClick={() => { setCatError(null); setCatOpen(true); }}>New category</Button>
          <span style={{ flex: 1 }} />
          <Button variant="light" onClick={onClose}>Done</Button>
        </div>
      </Modal>

      <Modal open={catOpen} onClose={() => setCatOpen(false)} title="New category">
        <form onSubmit={createCategory} className="form">
          <TextInput label="Name" placeholder="e.g. Pets" maxLength={50} value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          <span className="label">Icon</span>
          <div className="icon-grid">
            {ICON_CHOICES.map((ic) => (
              <button key={ic} type="button" className={`icon-choice ${catForm.icon === ic ? 'selected' : ''}`} onClick={() => setCatForm((f) => ({ ...f, icon: ic }))}>{ic}</button>
            ))}
          </div>
          <span className="label">Color</span>
          <div className="color-grid">
            {COLOR_CHOICES.map((col) => (
              <button key={col} type="button" className={`color-choice ${catForm.color === col ? 'selected' : ''}`} style={{ background: col }} onClick={() => setCatForm((f) => ({ ...f, color: col }))} aria-label={col} />
            ))}
          </div>
          {catError && <FieldError>{catError}</FieldError>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={() => setCatOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create category</Button>
          </div>
        </form>
      </Modal>

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Delete category?">
        <p className="confirm-text">"{confirmDelete?.name}" will be removed. Categories with transactions cannot be deleted.</p>
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={doDelete}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}
