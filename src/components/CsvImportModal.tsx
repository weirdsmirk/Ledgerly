import { useRef, useState } from 'react';
import api from '../api';
import { Button, FieldError, Modal, Spinner } from './ui';
import type { Account, ImportResult } from '../types';

interface Preview {
  headers: string[];
  rows: Array<Record<string, string>>;
  total_rows: number;
  mapping: Record<string, string>;
}

const FIELDS: Array<{ key: string; label: string; required?: boolean }> = [
  { key: 'date', label: 'Date column', required: true },
  { key: 'amount', label: 'Amount column', required: true },
  { key: 'description', label: 'Description column' },
  { key: 'category', label: 'Category column' },
  { key: 'account', label: 'Account column' },
  { key: 'type', label: 'Type column' },
];

export function CsvImportModal({
  open,
  onClose,
  accounts,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  onImported: (result: ImportResult) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dayFirst, setDayFirst] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'preview' | 'import' | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setFileName('');
    setPreview(null);
    setMapping({});
    setError(null);
    setResult(null);
    setDayFirst(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setFileName(file.name);
    setBusy('preview');
    try {
      const text = await file.text();
      const p = await api.importPreview(text);
      setPreview(p);
      setMapping(p.mapping);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the file');
      setPreview(null);
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    if (!fileRef.current?.files?.[0] || !preview) return;
    setError(null);
    setBusy('import');
    try {
      const text = await fileRef.current.files[0].text();
      const res = await api.importCsv(text, mapping, dayFirst);
      setResult(res);
      onImported(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Import transactions from CSV" wide>
      {result && (
        <div className="import-result">
          <div className={`import-big ${result.imported_count > 0 ? 'ok' : 'neutral'}`}>
            <span className="import-num">{result.imported_count}</span> imported
            {result.skipped_count > 0 && <span> · {result.skipped_count} skipped</span>}
          </div>
          {result.skipped_count > 0 && (
            <div className="import-notes">
              {result.skipped.slice(0, 5).map((s, i) => (
                <div key={i} className="muted">Row {s.row}: {s.reason}</div>
              ))}
              {result.skipped.length > 5 && <div className="muted">…and {result.skipped.length - 5} more</div>}
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="import-notes">
              <strong>Errors ({result.errors.length}):</strong>
              {result.errors.slice(0, 6).map((e, i) => (
                <div key={i} className="import-err">Row {e.row}: {e.reason}</div>
              ))}
            </div>
          )}
          <div className="modal-actions">
            <Button variant="primary" onClick={close}>Done</Button>
            <Button variant="ghost" onClick={() => { setResult(null); setPreview(null); setFileName(''); }}>Import another file</Button>
          </div>
        </div>
      )}

      {!result && (
        <div className="import-flow">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {!preview && (
            <div className="dropzone" onClick={() => fileRef.current?.click()}>
              <div className="dropzone-icon">⇪</div>
              <div>Drop a CSV file here or <span className="link">browse</span></div>
              <div className="muted small">Typical bank exports work out of the box — Ledger auto-detects common columns.</div>
              {busy === 'preview' && <Spinner />}
              {error && <FieldError>{error}</FieldError>}
            </div>
          )}

          {preview && (
            <>
              <div className="import-file">{fileName} · {preview.total_rows} rows</div>

              <div className="map-grid">
                {FIELDS.map((f) => (
                  <label key={f.key} className="field">
                    <span className="field-label">{f.label}{f.required ? ' *' : ''}</span>
                    <select
                      className="input"
                      value={mapping[f.key] ?? ''}
                      onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                    >
                      <option value="">— none —</option>
                      {preview.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              <label className="check">
                <input type="checkbox" checked={dayFirst} onChange={(e) => setDayFirst(e.target.checked)} />
                Dates are day-first (DD/MM/YYYY)
              </label>

              <h4 className="subhead">Preview</h4>
              <div className="table-scroll">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      {preview.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r, i) => (
                      <tr key={i}>
                        {preview.headers.map((h) => (
                          <td key={h} className="muted">{String(r[h] ?? '').slice(0, 28) || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="import-hint">
                Categories are matched automatically from the description (e.g. “Starbucks” → Food). Duplicates
                (same date, amount, description) are skipped.
                {accounts.length === 0 && <FieldError>No accounts exist — create one in Settings first.</FieldError>}
              </div>

              <div className="modal-actions">
                <Button variant="ghost" onClick={() => { setPreview(null); setFileName(''); fileRef.current!.value = ''; }}>Back</Button>
                {error && <FieldError>{error}</FieldError>}
                <Button
                  variant="primary"
                  disabled={busy === 'import' || !mapping.date || !mapping.amount}
                  onClick={doImport}
                >
                  {busy === 'import' ? 'Importing…' : `Import ${preview.total_rows} rows`}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}