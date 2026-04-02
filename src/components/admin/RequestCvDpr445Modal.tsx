"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  teacherId: string;
  teacherName: string;
  teacherEmail: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function RequestCvDpr445Modal({
  open,
  teacherId,
  teacherName,
  teacherEmail,
  onClose,
  onSuccess,
}: Props) {
  const [mounted, setMounted] = useState(false);
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
      setDeadline("");
      setSendEmail(true);
      setSendNotification(true);
    }
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/docenti/${teacherId}/cv-dpr445`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deadline: deadline || undefined,
            sendEmail,
            sendNotification,
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore");
      toast.success(`Richiesta CV inviata a ${teacherName}`);
      onSuccess();
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
          <p className="text-sm">
            Vuoi richiedere a{" "}
            <span className="font-medium">{teacherName}</span>
            {teacherEmail && (
              <span className="text-muted-foreground">
                {" "}
                ({teacherEmail})
              </span>
            )}{" "}
            di compilare il CV DPR 445/2000?
          </p>

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
            disabled={submitting}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Invio...
              </span>
            ) : (
              "Invia richiesta"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
