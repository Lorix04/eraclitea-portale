"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  isDeleting?: boolean;
  warningMessage?: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  isDeleting = false,
  warningMessage,
}: DeleteConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => {
          if (!isDeleting) onClose();
        }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h2 id="delete-confirm-title" className="text-lg font-semibold">
              {title}
            </h2>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <p>{description}</p>
            {itemName ? (
              <p className="font-medium text-foreground">&quot;{itemName}&quot;</p>
            ) : null}
            {warningMessage ? (
              <div className="rounded-md bg-amber-50 p-3 text-amber-700">
                ⚠️ {warningMessage}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border px-4 py-2 text-sm"
              onClick={onClose}
              disabled={isDeleting}
            >
              Annulla
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                "Elimina"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
