"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, RefreshCw, X } from "lucide-react";

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
  const [previewError, setPreviewError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setPreviewError(false);
    setRetryKey(0);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !material) return null;

  const isPdf = material.mimeType === "application/pdf";
  const isImage = material.mimeType.startsWith("image/");
  const previewUrl = `${material.downloadUrl}${material.downloadUrl.includes("?") ? "&" : "?"}preview=true`;

  const handleRetry = () => {
    setPreviewError(false);
    setRetryKey((k) => k + 1);
  };

  const errorFallback = (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">
        Impossibile caricare l&apos;anteprima.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Riprova
        </button>
        <a
          href={material.downloadUrl}
          download
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Scarica
        </a>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 md:p-[5vh_5vw]">
        <div
          className="flex h-[100dvh] w-full flex-col bg-card shadow-xl md:h-[90vh] md:w-[90vw] md:max-w-[90vw] md:rounded-lg"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
            <h2 className="min-w-0 truncate text-sm font-semibold">
              {material.fileName}
            </h2>
            <div className="flex shrink-0 items-center gap-1.5">
              <a
                href={material.downloadUrl}
                download
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Scarica</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                title="Chiudi"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body — no padding, content fills the space */}
          <div className="min-h-0 flex-1 overflow-auto">
            {previewError ? (
              <div className="flex h-full items-center justify-center">{errorFallback}</div>
            ) : isPdf ? (
              <iframe
                key={retryKey}
                src={previewUrl}
                className="h-full w-full"
                title={material.fileName}
                onError={() => setPreviewError(true)}
              />
            ) : isImage ? (
              <div className="flex h-full items-center justify-center bg-black/5 p-2">
                <img
                  key={retryKey}
                  src={previewUrl}
                  alt={material.fileName}
                  className="max-h-full max-w-full object-contain"
                  onError={() => setPreviewError(true)}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
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
