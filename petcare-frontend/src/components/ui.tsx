import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode,
} from 'react';
import { Check, CircleX, Info, X } from 'lucide-react';
import { STATUS_CLASS, STATUS_LABEL } from '../format';
import type { BookingStatus } from '../types';

type ToastIcon = 'check' | 'info' | 'circle-x';
interface ToastItem { id: number; text: string; icon: ToastIcon }
const ToastContext = createContext<(text: string, icon?: ToastIcon) => void>(() => {});
const TOAST_ICON = { check: Check, info: Info, 'circle-x': CircleX };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, icon: ToastIcon = 'check') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toasts.map((t) => {
          const Icon = TOAST_ICON[t.icon];
          return (
            <div key={t.id} className="toast">
              <Icon className="i" aria-hidden="true" />
              <span>{t.text}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

interface ModalProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  iconTone?: 'danger' | 'warn';
  size?: 'sm' | 'md';
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ title, subtitle, icon, iconTone = 'warn', size = 'md', onClose, children, footer }: ModalProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    const first =
      ref.current?.querySelector<HTMLElement>('.modal-body input:not([type=hidden]), .modal-body select, .modal-body textarea') ??
      ref.current?.querySelector<HTMLElement>('.modal-foot .btn');
    setTimeout(() => first?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal ${size === 'sm' ? 'sm' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <div>
            {icon && <div className={`modal-icon ${iconTone}`}>{icon}</div>}
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X className="i" aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  id, label, error, hint, children,
}: { id: string; label: string; error?: string | false; hint?: string; children: ReactNode }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="help-always">{hint}</span>}
      <span className="field-error">{error}</span>
    </div>
  );
}

export function FormAlert({ message }: { message?: string | null }) {
  return <p className={`alert ${message ? 'show' : ''}`} role="alert">{message}</p>;
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function PageHead({ crumb, title, text, actions }: { crumb?: string; title: string; text?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {crumb && <p className="crumb">{crumb}</p>}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

export function Loading({ text = 'Cargando…' }: { text?: string }) {
  return <p className="loading" role="status"><span className="spinner" aria-hidden="true" />{text}</p>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card card-pad error-box" role="alert">
      <h3>No se pudo cargar la información</h3>
      <p className="muted">{message}</p>
      {onRetry && <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card empty">
      <div className="art">{icon}</div>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
