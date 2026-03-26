"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
}

interface PromptOptions {
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContext {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (title: string, message: string) => Promise<void>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

type ActiveDialog =
  | { type: "confirm"; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { type: "alert"; title: string; message: string; resolve: () => void }
  | {
      type: "prompt";
      options: PromptOptions;
      resolve: (v: string | null) => void;
    };

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const Ctx = createContext<DialogContext | null>(null);

export function useConfirmDialog() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error(
      "useConfirmDialog must be used within ConfirmDialogProvider"
    );
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLInputElement>(null);

  // --- API ---

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> =>
      new Promise((resolve) => setDialog({ type: "confirm", options, resolve })),
    []
  );

  const alert = useCallback(
    (title: string, message: string): Promise<void> =>
      new Promise((resolve) => setDialog({ type: "alert", title, message, resolve })),
    []
  );

  const prompt = useCallback(
    (options: PromptOptions): Promise<string | null> =>
      new Promise((resolve) => {
        setPromptValue(options.defaultValue || "");
        setDialog({ type: "prompt", options, resolve });
      }),
    []
  );

  // --- Handlers ---

  const close = useCallback(
    (result?: any) => {
      if (!dialog) return;
      if (dialog.type === "confirm") dialog.resolve(result ?? false);
      else if (dialog.type === "alert") dialog.resolve();
      else if (dialog.type === "prompt") dialog.resolve(result ?? null);
      setDialog(null);
    },
    [dialog]
  );

  // Escape key
  useEffect(() => {
    if (!dialog) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dialog, close]);

  // Auto-focus
  useEffect(() => {
    if (!dialog) return;
    requestAnimationFrame(() => {
      if (dialog.type === "prompt") promptRef.current?.focus();
      else cancelRef.current?.focus();
    });
  }, [dialog]);

  // --- Render ---

  const title =
    dialog?.type === "confirm"
      ? dialog.options.title
      : dialog?.type === "alert"
        ? dialog.title
        : dialog?.type === "prompt"
          ? dialog.options.title
          : "";

  const message =
    dialog?.type === "confirm"
      ? dialog.options.message
      : dialog?.type === "alert"
        ? dialog.message
        : dialog?.type === "prompt"
          ? dialog.options.message
          : "";

  return (
    <Ctx.Provider value={{ confirm, alert, prompt }}>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => close()}
          />

          {/* Dialog box */}
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cd-title"
            aria-describedby="cd-msg"
            className="relative w-full max-w-md mx-4 overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3
                id="cd-title"
                className="text-lg font-semibold text-gray-900"
              >
                {title}
              </h3>
              <p id="cd-msg" className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                {message}
              </p>

              {/* Prompt input */}
              {dialog.type === "prompt" && (
                <input
                  ref={promptRef}
                  type="text"
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  placeholder={dialog.options.placeholder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") close(promptValue);
                  }}
                  className="mt-3 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 px-6 pb-6">
              {dialog.type === "alert" ? (
                <button
                  ref={cancelRef}
                  onClick={() => close()}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors"
                >
                  OK
                </button>
              ) : (
                <>
                  <button
                    ref={cancelRef}
                    onClick={() => close()}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    {dialog.type === "confirm"
                      ? dialog.options.cancelText || "Annulla"
                      : dialog.options.cancelText || "Annulla"}
                  </button>
                  <button
                    onClick={() =>
                      dialog.type === "prompt"
                        ? close(promptValue)
                        : close(true)
                    }
                    className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${
                      dialog.type === "confirm" &&
                      dialog.options.variant === "danger"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-amber-500 hover:bg-amber-600"
                    }`}
                  >
                    {dialog.type === "confirm"
                      ? dialog.options.confirmText || "Conferma"
                      : dialog.options.confirmText || "OK"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
