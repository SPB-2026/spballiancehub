import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback((kind, title, message) => {
    const id = nextId++;
    setToasts((t) => [...t.slice(-3), { id, kind, title, message }]);
    timers.current[id] = setTimeout(() => dismiss(id), 5200);
    return id;
  }, [dismiss]);

  const api = {
    success: (title, message) => push('success', title, message),
    error: (title, message) => push('error', title, message),
    info: (title, message) => push('info', title, message),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} role="status">
            <div style={{ flex: 1 }}>
              <strong>{t.title}</strong>
              {t.message ? <span style={{ color: 'var(--text-2)' }}>{t.message}</span> : null}
            </div>
            <button
              className="modal-close"
              style={{ position: 'static', padding: '2px 6px', fontSize: 16 }}
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
