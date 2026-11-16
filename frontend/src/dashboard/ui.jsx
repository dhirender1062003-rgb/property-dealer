import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, CircleX, X } from 'lucide-react';

// Toast messages and confirmation dialogs for the dashboard.

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((type, message) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const confirm = useCallback((options) => new Promise((resolve) => setDialog({ ...options, resolve })), []);
  const value = useMemo(() => ({
    toast: { success: (m) => show('success', m), error: (m) => show('error', m) },
    confirm,
  }), [show, confirm]);
  const close = (answer) => {
    dialog?.resolve(answer);
    setDialog(null);
  };

  return (
    <UIContext.Provider value={value}>
      {children}
      <div className="dash-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`dash-toast dash-toast--${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            {t.type === 'success' ? <CircleCheck size={20} /> : <CircleX size={20} />}
            <span>{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={16} /></button>
          </div>
        ))}
      </div>
      {dialog && (
        <Modal title={dialog.title} onClose={() => close(false)} size="sm"
               footer={(
                 <>
                   <button type="button" className="btn btn--outline" onClick={() => close(false)}>Cancel</button>
                   <button type="button" className={`btn ${dialog.danger ? 'btn--danger' : 'btn--navy'}`}
                           onClick={() => close(true)} autoFocus>
                     {dialog.confirmLabel || 'Confirm'}
                   </button>
                 </>
               )}>
          <p className="dash-confirm-text">{dialog.message}</p>
        </Modal>
      )}
    </UIContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useUI = () => useContext(UIContext);

export function Modal({ title, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);

  return (
    <div className="dash-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`dash-modal dash-modal--${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="dash-modal__head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="dash-modal__body">{children}</div>
        {footer && <div className="dash-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
