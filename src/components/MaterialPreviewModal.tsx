"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";

type MaterialPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  material: {
    id: string;
    fileName: string;
    mimeType: string;
    downloadUrl: string;
  } | null;
};

export function canPreview(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

export default function MaterialPreviewModal({
  open,
  onClose,
  material,
}: MaterialPreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !material) return null;

  const isPdf = material.mimeType === "application/pdf";
  const isImage = material.mimeType.startsWith("image/");

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-4">
        <div
          className="flex h-full w-full flex-col bg-card shadow-xl sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-lg"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="truncate text-sm font-semibold sm:text-base">
              {material.fileName}
            </h2>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={material.downloadUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-muted sm:text-sm"
              >
                <Download className="h-4 w-4" />
                Scarica
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                title="Chiudi"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto p-4">
            {isPdf ? (
              <iframe
                src={material.downloadUrl}
                className="h-[70vh] w-full rounded border"
                title={material.fileName}
              />
            ) : isImage ? (
              <img
                src={material.downloadUrl}
                alt={material.fileName}
                className="mx-auto max-h-[70vh] max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Anteprima non disponibile per questo tipo di file.
                </p>
                <a
                  href={material.downloadUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" />
                  Scarica file
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
