import { useEffect, useState } from 'react';
import { dismissToast, subscribeToasts, type Toast } from './celebrate';

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => subscribeToasts(setToasts), []);

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <span className="toast-icon" aria-hidden="true">{toast.tone === 'milestone' ? '🏆' : '✨'}</span>
          <div className="toast-body">
            <strong>{toast.title}</strong>
            {toast.detail && <span>{toast.detail}</span>}
          </div>
          <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismissToast(toast.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
