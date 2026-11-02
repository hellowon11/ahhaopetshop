import React from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-900/40 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3
              id="confirm-dialog-title"
              className="text-lg font-semibold text-stone-900"
            >
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
              danger
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-stone-800 hover:bg-stone-900"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
