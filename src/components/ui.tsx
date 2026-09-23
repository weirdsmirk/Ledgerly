import { useEffect, useRef, useState, useId, type ReactNode } from 'react';
import { useToasts } from '../hooks';
import { Icon } from './icons';

/* Toasts */
export function ToastHost({ toasts }: { toasts: ReturnType<typeof useToasts>['toasts'] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <span className="toast-ico">
            <Icon name={t.kind === 'ok' ? 'check' : 'info'} size={15} />
          </span>
          <span className="toast-text">{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/* Modal — with focus trap, focus restore, scroll lock and aria wiring. */
export function Modal({ open, onClose, title, kicker, children, wide }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  kicker?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const prevFocus = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? []);

    // Move focus into the dialog once it's mounted (after the paint so the
    // element is guaranteed present).
    requestAnimationFrame(() => {
      const first = focusables()[0];
      (first ?? dialog)?.focus();
    });
    prevFocus?.blur();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !dialog) return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0], last = els[els.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault(); first.focus();
      }
    };
    window.addEventListener('keydown', onKey);

    // Lock body scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div ref={dialogRef} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            {kicker && <div className="modal-kicker">{kicker}</div>}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close" type="button">
            <Icon name="close" size={19} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* Dropdown menu (driven by a "..." trigger) */
export function Menu({ trigger, items }: {
  trigger: ReactNode;
  items: Array<{ label: string; icon?: ReactNode; danger?: boolean; onClick: () => void }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open ]);
  return (
    <div className="menu-wrap" ref={ref}>
      <span onClick={() => setOpen((v) => !v)} style={{ display: 'inline-flex' }}>{trigger}</span>
      {open && (
        <div className="menu" role="menu">
          {items.map((it, i) => (
            <button key={i} type="button" role="menuitem" className={`menu-item ${it.danger ? 'danger' : ''}`} onClick={() => { setOpen(false); it.onClick(); }}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Small widgets */
export function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

export function EmptyState({ icon, title, hint, children }: { icon?: ReactNode; title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <div className="empty-title">{title}</div>
      {hint && <div className="empty-hint">{hint}</div>}
      {children && <div className="empty-action">{children}</div>}
    </div>
  );
}

export function ProgressBar({ value, max = 100, tone, height = 9, color }: {
  value: number; max?: number;
  tone?: 'accent' | 'warning' | 'danger' | 'positive' | 'neutral';
  height?: number; color?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="bar" style={{ height }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`bar-fill ${tone ?? 'accent'}`} style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }} />
    </div>
  );
}

export function TextInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input className="input" {...props} />
    </label>
  );
}

export function Select({ label, children, ...props }: { label: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <select className="input" {...props}>{children}</select>
    </label>
  );
}

export function Button({ variant = 'primary', children, ...props }: {
  variant?: 'primary' | 'outline' | 'danger' | 'light' | 'danger-ghost' | 'ghost' | 'subtle';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const map: Record<string, string> = {
    primary: 'btn-primary', outline: 'btn-outline', danger: 'btn-danger',
    light: 'btn-light', 'danger-ghost': 'btn-danger-ghost',
    ghost: 'btn-outline', subtle: 'btn-light',
  };
  return <button className={`btn ${map[variant] ?? 'btn-primary'}`} {...props}>{children}</button>;
}

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'positive' | 'danger' | 'warning' | 'neutral' | 'accent' }) {
  const map: Record<string, string> = { positive: 'positive', danger: 'danger', warning: 'warning', neutral: 'neutral', accent: 'positive' };
  return <span className={`pill ${map[tone]}`}>{children}</span>;
}

export function FieldError({ children }: { children: ReactNode }) {
  return <div className="field-error">{children}</div>;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="confirm-text">{message}</p>
      <div className="modal-actions">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
