import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { FiCheckCircle, FiXCircle, FiInfo, FiX } from "react-icons/fi";

const VARIANT_STYLES = {
  info: "border-cobalt/30",
  success: "border-positive/30",
  error: "border-negative/30",
};

const VARIANT_ICONS = {
  info: <FiInfo className="text-cobalt" aria-hidden="true" />,
  success: <FiCheckCircle className="text-positive" aria-hidden="true" />,
  error: <FiXCircle className="text-negative" aria-hidden="true" />,
};

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    ({ variant = "info", message, duration = 5000 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, variant, message }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-sm right-sm z-50 flex flex-col gap-xs"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.variant === "error" ? "alert" : "status"}
            className={`flex items-center gap-xs rounded-md border bg-surface-raised px-sm py-xs text-sm text-white shadow-[0_4px_24px_0_rgba(0,0,0,0.4)] ${VARIANT_STYLES[toast.variant]}`}
          >
            {VARIANT_ICONS[toast.variant]}
            <span>{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
              className="ml-xs rounded-sm text-muted hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt"
            >
              <FiX aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
