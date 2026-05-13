"use client";

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  action?: { label: string; href: string };
}

interface ToastContextType {
  toast: (
    message: string,
    type?: Toast["type"],
    action?: Toast["action"],
  ) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (
      message: string,
      type: Toast["type"] = "success",
      action?: Toast["action"],
    ) => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
      setToasts((prev) => [...prev, { id, message, type, action }]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Bottom-center on mobile so tapping a card action actually shows the
          feedback in the user's eyeline. Bottom-right on larger screens. */}
      <div
        className="fixed inset-x-3 bottom-4 z-[100] flex flex-col items-center gap-2 sm:left-auto sm:right-4 sm:items-end sm:inset-x-auto"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    // Keep info toasts with an action visible longer so guests have time to act.
    const ms = toast.action ? 6000 : 3000;
    const timer = setTimeout(() => onRemove(toast.id), ms);
    return () => clearTimeout(timer);
  }, [toast.id, toast.action, onRemove]);

  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;
  const colors = {
    success: "border-green-500/30 bg-green-500/10 text-green-300",
    error: "border-red-500/30 bg-red-500/10 text-red-300",
    info: "border-primary/30 bg-primary/10 text-primary",
  };

  return (
    <div
      className={`flex max-w-sm items-center gap-2 rounded-lg border px-4 py-2.5 shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom sm:slide-in-from-right ${colors[toast.type]}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">{toast.message}</span>
      {toast.action && (
        <a
          href={toast.action.href}
          className="ml-1 shrink-0 rounded-full bg-text text-bg px-2.5 py-1 text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          {toast.action.label}
        </a>
      )}
      <button onClick={() => onRemove(toast.id)} className="ml-1 shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss notification">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
