import { useState, useCallback, createContext, useContext, useRef, useEffect, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback for contexts where the provider isn't mounted (e.g. SSR)
    return {
      showToast: (_type, message) => { if (typeof window !== 'undefined') window.alert(message); },
      confirm: (opts) => Promise.resolve(typeof window !== 'undefined' ? window.confirm(opts.message) : false),
    };
  }
  return ctx;
}

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-stone-500" />,
  error: <XCircle className="h-5 w-5 text-stone-600" />,
  warning: <AlertTriangle className="h-5 w-5 text-stone-500" />,
  info: <Info className="h-5 w-5 text-stone-500" />,
};

const BG: Record<ToastType, string> = {
  success: 'border-stone-200 bg-white',
  error: 'border-stone-300 bg-white',
  warning: 'border-stone-200 bg-white',
  info: 'border-stone-200 bg-white',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button when confirm dialog opens
  useEffect(() => {
    if (confirmState && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [confirmState]);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirm = useCallback((value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  }, [confirmState]);

  return (
    <ToastContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Toast container */}
      <div
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg animate-fadeIn ${BG[toast.type]}`}
            role="alert"
          >
            {ICONS[toast.type]}
            <span className="text-sm font-medium text-stone-800">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="ml-2 text-stone-400 transition-colors hover:text-stone-600"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-stone-950/20 backdrop-blur-sm">
          <div
            className="app-surface w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fadeIn"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
          >
            <h3 id="confirm-title" className="mb-2 text-lg font-semibold text-stone-800">
              {confirmState.options.title}
            </h3>
            <p id="confirm-message" className="mb-6 text-sm text-stone-500">
              {confirmState.options.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                ref={confirmRef}
                onClick={() => handleConfirm(false)}
                className="rounded-xl border border-stone-100 bg-white  px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
              >
                {confirmState.options.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${
                  confirmState.options.destructive
                    ? 'bg-stone-800 hover:bg-stone-600'
                    : 'bg-stone-900 hover:bg-stone-800'
                }`}
              >
                {confirmState.options.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
