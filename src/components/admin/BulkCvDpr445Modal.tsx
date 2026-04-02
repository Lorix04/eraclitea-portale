"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  counts: { withoutCv: number; withoutApproved: number };
};

export default function BulkCvDpr445Modal({
  open,
  onClose,
  onSent,
  counts,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [target, setTarget] = useState("all_without_cv");
  const [deadline, setDeadline] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendNotification, setSendNotification] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      setTarget("all_without_cv");
      setDeadline("");
      setSendEmail(true);
      setSendNotification(true);
    }
  }, [open]);

  const targetCount =
    target === "all_without_cv"
      ? counts.withoutCv
      : target === "all_without_approved_cv"
        ? counts.withoutApproved
        : 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/cv-dpr445/bulk-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          deadline: deadline || undefined,
          sendEmail,
          sendNotification,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore");
      toast.success(
        `Richiesta inviata a ${json.sent} docent${json.sent === 1 ? "e" : "i"}${json.skipped > 0 ? ` (${json.skipped} saltati)` : ""}`
      );
      onSent();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={submitting ? undefined : onClose}
      />
      <div className="modal-panel relative z-10 w-full border bg-card shadow-xl sm:max-w-md sm:rounded-lg">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Richiedi CV DPR 445</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            A chi vuoi inviare la richiesta?
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-2 rounded-md border px-3 py-2.5 cursor-pointer hover:bg-muted/50">
              <input
                type="radio"
                name="target"
                value="all_without_cv"
                checked={target === "all_without_cv"}
                onChange={() => setTarget("all_without_cv")}
                disabled={submitting}
              />
              <span className="text-sm">
                Tutti i docenti senza CV DPR 445{" "}
                <span className="text-muted-foreground">
                  ({counts.withoutCv})
                </span>
              </span>
            </label>
            <label className="flex items-center gap-2 rounded-md border px-3 py-2.5 cursor-pointer hover:bg-muted/50">
              <input
                type="radio"
                name="target"
                value="all_without_approved_cv"
                checked={target === "all_without_approved_cv"}
                onChange={() => setTarget("all_without_approved_cv")}
                disabled={submitting}
              />
              <span className="text-sm">
                Tutti i docenti senza CV approvato{" "}
                <span className="text-muted-foreground">
                  ({counts.withoutApproved})
                </span>
              </span>
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Scadenza{" "}
              <span className="text-xs text-muted-foreground">
                (opzionale)
              </span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="rounded"
                disabled={submitting}
              />
              <span className="text-sm">Invia email</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="rounded"
                disabled={submitting}
              />
              <span className="text-sm">Invia notifica nel portale</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 border-t px-5 py-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || targetCount === 0}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Invio...
              </span>
            ) : (
              `Invia richiesta (${targetCount})`
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
