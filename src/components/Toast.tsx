import React, { useEffect } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error";

export interface ToastState {
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastState | null;
  onClose: () => void;
  durationMs?: number;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose, durationMs = 2800 }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [toast, onClose, durationMs]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div className="fixed top-20 left-1/2 z-[70] -translate-x-1/2 px-4 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
          isSuccess ? "bg-emerald-600" : "bg-rose-600"
        }`}
        role="status"
      >
        {isSuccess ? (
          <CheckCircle className="h-5 w-5 shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 shrink-0" />
        )}
        <span>{toast.message}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-1 rounded p-0.5 hover:bg-white/20"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
