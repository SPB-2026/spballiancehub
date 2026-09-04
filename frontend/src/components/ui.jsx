// Reusable UI primitives: buttons, states, modal, confirm dialog, countdown chip.
import React, { useEffect, useRef } from 'react';
import { countdownText, countdownParts } from '../utils/format.js';

export function Button({ variant = 'gold', size, icon, loading = false, children, className = '', ...rest }) {
  const cls = `btn btn-${variant}${size ? ` btn-${size}` : ''} ${className}`.trim();
  return (
    <button className={cls} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

export function Badge({ kind = 'gray', children, dot = false }) {
  return (
    <span className={`badge badge-${kind}`}>
      {dot ? <span className={`status-dot ${kind}`} /> : null}
      {children}
    </span>
  );
}

export function LoadingBox({ label = 'Loading…' }) {
  return (
    <div className="loading-box" role="status" aria-live="polite">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon = '🛡️', title, children, action }) {
  return (
    <div className="state-box" role="status">
      <div className="state-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state-box" role="alert">
      <div className="state-icon" aria-hidden="true">⚠️</div>
      <h3>Something went wrong</h3>
      <p>{error?.message || 'An unexpected error occurred.'}</p>
      {onRetry ? (
        <button className="btn btn-outline btn-sm" onClick={onRetry}>Try again</button>
      ) : null}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide = false }) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);

  // Always call the freshest onClose (pages pass an inline arrow whose identity
  // changes every render — keep it in a ref instead of as an effect dependency).
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Runs ONCE when the modal opens: lock page scroll, wire Escape, and focus
  // the first visible form field. It must NOT re-run on re-renders (e.g. every
  // keystroke) — that was the focus bug: the effect re-ran on each render and
  // yanked focus out of the field being typed into (onto the close button).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const firstField = Array.from(ref.current?.querySelectorAll('input, textarea, select') || [])
      .find((el) => !el.disabled && el.offsetParent !== null);
    firstField?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close dialog">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title = 'Are you sure?', message, confirmLabel = 'Confirm', danger = false, loading = false, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'gold'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{message}</p>
    </Modal>
  );
}

// Live countdown chip — re-renders each second while active.
export function Countdown({ targetIso, label = 'in', active = true }) {
  const [, setTick] = React.useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [active]);

  const parts = countdownParts(targetIso);
  const text = countdownText(targetIso);
  return (
    <span className="countdown" title={text} aria-label={`${label} ${text}`}>
      <span className="cd-label">{label}</span>
      {parts.past ? (
        <span className="cd-ended">Ended</span>
      ) : (
        <>
          <span className="cd-box"><b>{parts.d}</b><i>days</i></span>
          <span className="cd-box"><b>{parts.h}</b><i>hrs</i></span>
          <span className="cd-box"><b>{parts.m}</b><i>min</i></span>
          <span className="cd-box"><b>{parts.s}</b><i>sec</i></span>
        </>
      )}
    </span>
  );
}

export function Field({ label, hint, error, children, id }) {
  return (
    <div className="field">
      {label ? <label htmlFor={id}>{label}</label> : null}
      {children}
      {hint ? <div className="hint">{hint}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
    </div>
  );
}
