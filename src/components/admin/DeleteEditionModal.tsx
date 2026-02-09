"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";

type EditionStats = {
  registrations: number;
  lessons: number;
  attendances: number;
  certificates: number;
};

type DeleteEditionModalProps = {
  editionId: string;
  courseId: string;
  courseName: string;
  editionNumber: number;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
};

function normalizeConfirm(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export default function DeleteEditionModal({
  editionId,
  courseId,
  courseName,
  editionNumber,
  clientName,
  isOpen,
  onClose,
  onDeleted,
}: DeleteEditionModalProps) {
  const [stats, setStats] = useState<EditionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const requiredText = useMemo(
    () => `${courseName} Ed.#${editionNumber}`,
    [courseName, editionNumber]
  );

  const hasStats = stats !== null;
  const requiresConfirm = hasStats ? stats.certificates > 0 : true;
  const confirmMatches = useMemo(
    () =>
      normalizeConfirm(confirmText) === normalizeConfirm(requiredText),
    [confirmText, requiredText]
  );

  useEffect(() => {
    if (!isOpen) return;
    setConfirmText("");
    setLoading(true);
    setStats(null);
    fetch(`/api/corsi/${courseId}/edizioni/${editionId}/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data.data ?? null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [isOpen, courseId, editionId]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/corsi/${courseId}/edizioni/${editionId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Errore durante l'eliminazione");
        return;
      }
      toast.success("Edizione eliminata con successo");
      onDeleted();
      onClose();
    } catch (error) {
      console.error("Errore eliminazione edizione:", error);
      toast.error("Errore durante l'eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => {
          if (!deleting) onClose();
        }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">
              Elimina Edizione #{editionNumber} — {clientName}
            </h2>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : !hasStats ? (
              <p className="text-sm text-destructive">
                Impossibile recuperare i dati dell&apos;edizione. Riprova.
              </p>
            ) : (
              <>
                <p>Stai per eliminare questa edizione e tutti i dati associati:</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  <li>{stats?.registrations ?? 0} registrazioni</li>
                  <li>{stats?.lessons ?? 0} lezioni</li>
                  <li>{stats?.attendances ?? 0} presenze</li>
                  {requiresConfirm ? (
                    <li className="font-semibold text-destructive">
                      {stats?.certificates ?? 0} attestati
                    </li>
                  ) : null}
                </ul>
              </>
            )}

            {requiresConfirm ? (
              <div className="space-y-2">
                <p className="font-medium text-destructive">
                  ATTENZIONE: Questa edizione contiene attestati che verranno eliminati permanentemente.
                </p>
                <p>
                  Per confermare, digita il nome dell&apos;edizione:{" "}
                  <span className="font-semibold">{requiredText}</span>
                </p>
                <input
                  type="text"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  placeholder={requiredText}
                />
              </div>
            ) : (
              <p className="text-muted-foreground">Questa azione e irreversibile.</p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border px-4 py-2 text-sm"
              onClick={onClose}
              disabled={deleting}
            >
              Annulla
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground disabled:opacity-50"
              onClick={handleDelete}
              disabled={deleting || !hasStats || (requiresConfirm && !confirmMatches)}
            >
              {deleting ? (
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
