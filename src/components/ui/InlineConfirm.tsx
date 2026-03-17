"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface InlineConfirmProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  autoClose?: number;
}

export default function InlineConfirm({
  message,
  onConfirm,
  onCancel,
  isLoading = false,
  autoClose = 5000,
}: InlineConfirmProps) {
  const [hovering, setHovering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (hovering || isLoading) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    timerRef.current = setTimeout(onCancel, autoClose);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hovering, isLoading, autoClose, onCancel]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [onCancel]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-200 dark:border-red-900 dark:bg-red-950/40"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
      <span className="min-w-0 flex-1 text-sm text-red-700 dark:text-red-300">
        {message}
      </span>
      <button
        type="button"
        className="shrink-0 rounded-md px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        onClick={onCancel}
        disabled={isLoading}
      >
        Annulla
      </button>
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        onClick={onConfirm}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Conferma
      </button>
    </div>
  );
}
