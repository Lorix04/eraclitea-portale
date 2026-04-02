"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  Clock,
  Download,
  FileText,
  Loader2,
  Mail,
  Send,
  X,
} from "lucide-react";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type CvDpr445Data = {
  id?: string;
  status: string;
  requestedAt: string | null;
  requestedById: string | null;
  deadline: string | null;
  submittedAt: string | null;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  rejectionReason: string | null;
  reminderSentAt: string | null;
  consensoPrivacy: boolean;
  formData: Record<string, any> | null;
};

const STATUS_CONFIG: Record<
  string,
  { cls: string; label: string; icon: typeof Check }
> = {
  NOT_REQUESTED: {
    cls: "bg-gray-100 text-gray-600",
    label: "Non richiesto",
    icon: FileText,
  },
  REQUESTED: {
    cls: "bg-amber-100 text-amber-700",
    label: "In attesa",
    icon: Clock,
  },
  SUBMITTED: {
    cls: "bg-blue-100 text-blue-700",
    label: "Ricevuto",
    icon: FileText,
  },
  APPROVED: {
    cls: "bg-emerald-100 text-emerald-700",
    label: "Approvato",
    icon: Check,
  },
  REJECTED: {
    cls: "bg-red-100 text-red-700",
    label: "Rifiutato",
    icon: AlertCircle,
  },
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CvDpr445Tab({ teacherId }: { teacherId: string }) {
  const queryClient = useQueryClient();
  const { confirm, prompt } = useConfirmDialog();
  const [actionLoading, setActionLoading] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");

  const cvQuery = useQuery({
    queryKey: ["admin-teacher-cv-dpr445", teacherId],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/docenti/${teacherId}/cv-dpr445`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore");
      return json.data as CvDpr445Data;
    },
  });

  const cv = cvQuery.data;

  const doAction = async (
    method: "POST" | "PUT",
    body: Record<string, any>,
    successMsg: string
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/admin/docenti/${teacherId}/cv-dpr445`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Errore");
        return;
      }
      toast.success(successMsg);
      cvQuery.refetch();
    } catch {
      toast.error("Errore di rete");
    } finally {
      setActionLoading(false);
    }
  };

  if (cvQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cv) {
    return (
      <div className="text-sm text-muted-foreground">
        Errore nel caricamento dati CV DPR 445.
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[cv.status] || STATUS_CONFIG.NOT_REQUESTED;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">CV DPR 445/2000</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.cls}`}
        >
          <StatusIcon className="h-3 w-3" />
          {statusCfg.label}
        </span>
      </div>

      {/* NOT_REQUESTED */}
      {cv.status === "NOT_REQUESTED" && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="mb-4 text-sm text-muted-foreground">
            Nessuna richiesta inviata per questo docente.
          </p>
          <div className="mb-3">
            <label className="mb-1 block text-xs text-muted-foreground">
              Scadenza (opzionale)
            </label>
            <input
              type="date"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="rounded-md border px-3 py-1.5 text-sm"
            />
          </div>
          <button
            disabled={actionLoading}
            onClick={() =>
              doAction(
                "POST",
                { deadline: deadlineInput || undefined },
                "Richiesta inviata"
              )
            }
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Richiedi compilazione CV
          </button>
        </div>
      )}

      {/* REQUESTED */}
      {cv.status === "REQUESTED" && (
        <div className="space-y-3 rounded-lg border bg-amber-50/50 p-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-xs text-muted-foreground">Richiesto il</span>
              <p>{fmtDateTime(cv.requestedAt)}</p>
            </div>
            {cv.deadline && (
              <div>
                <span className="text-xs text-muted-foreground">Scadenza</span>
                <p className="font-medium">{fmtDate(cv.deadline)}</p>
              </div>
            )}
            {cv.reminderSentAt && (
              <div>
                <span className="text-xs text-muted-foreground">
                  Ultimo reminder
                </span>
                <p>{fmtDateTime(cv.reminderSentAt)}</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={actionLoading}
              onClick={() =>
                doAction("PUT", { action: "reminder" }, "Reminder inviato")
              }
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              <Mail className="h-3.5 w-3.5" /> Invia reminder
            </button>
            <button
              disabled={actionLoading}
              onClick={async () => {
                const ok = await confirm({
                  title: "Annulla richiesta",
                  message: "Annullare la richiesta di compilazione CV DPR 445?",
                  confirmText: "Annulla richiesta",
                  variant: "danger",
                });
                if (!ok) return;
                doAction("PUT", { action: "cancel" }, "Richiesta annullata");
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Annulla richiesta
            </button>
          </div>
        </div>
      )}

      {/* SUBMITTED */}
      {cv.status === "SUBMITTED" && (
        <div className="space-y-4 rounded-lg border bg-blue-50/50 p-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-xs text-muted-foreground">Inviato il</span>
              <p>{fmtDateTime(cv.submittedAt)}</p>
            </div>
          </div>

          {/* File */}
          {cv.fileName && (
            <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="flex-1 text-sm">{cv.fileName}</span>
              {cv.filePath && (
                <a
                  href={`/api/storage/clients/${cv.filePath}`}
                  download
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-muted"
                >
                  <Download className="h-3.5 w-3.5" /> Scarica
                </a>
              )}
            </div>
          )}

          {/* Form data summary */}
          {cv.formData && (
            <div className="rounded-md border bg-white p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Dati compilati
              </p>
              <div className="space-y-1 text-sm">
                {cv.formData.prerequisitoTitoloStudio && (
                  <p>
                    <span className="text-muted-foreground">Titolo di studio:</span>{" "}
                    {cv.formData.prerequisitoTitoloStudio}
                  </p>
                )}
                {cv.formData.criterioSelezionato && (
                  <p>
                    <span className="text-muted-foreground">Criterio:</span>{" "}
                    {cv.formData.criterioSelezionato}
                  </p>
                )}
                {cv.formData.areeTematiche?.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Aree tematiche:</span>{" "}
                    {cv.formData.areeTematiche.join(", ")}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Consenso privacy:</span>{" "}
                  {cv.consensoPrivacy ? "\u2705" : "\u274C"}
                </p>
              </div>
            </div>
          )}

          {/* Approve / Reject */}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={actionLoading}
              onClick={async () => {
                const ok = await confirm({
                  title: "Approva CV",
                  message:
                    "Confermi l'approvazione del CV DPR 445 di questo docente?",
                  confirmText: "Approva",
                });
                if (!ok) return;
                doAction("PUT", { action: "approve" }, "CV approvato");
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Approva
            </button>
            <button
              disabled={actionLoading}
              onClick={async () => {
                const reason = await prompt({
                  title: "Rifiuta CV",
                  message: "Inserisci il motivo del rifiuto:",
                  placeholder: "es. Manca documentazione per il criterio 3",
                });
                if (!reason) return;
                doAction(
                  "PUT",
                  { action: "reject", rejectionReason: reason },
                  "CV rifiutato"
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Rifiuta
            </button>
          </div>
        </div>
      )}

      {/* APPROVED */}
      {cv.status === "APPROVED" && (
        <div className="space-y-3 rounded-lg border bg-emerald-50/50 p-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-xs text-muted-foreground">Approvato il</span>
              <p>{fmtDateTime(cv.reviewedAt)}</p>
            </div>
          </div>
          {cv.fileName && cv.filePath && (
            <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span className="flex-1 text-sm">{cv.fileName}</span>
              <a
                href={`/api/storage/clients/${cv.filePath}`}
                download
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" /> Scarica
              </a>
            </div>
          )}
          <button
            disabled={actionLoading}
            onClick={() => {
              setDeadlineInput("");
              doAction(
                "POST",
                {},
                "Nuova richiesta inviata"
              );
            }}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Richiedi nuova compilazione
          </button>
        </div>
      )}

      {/* REJECTED */}
      {cv.status === "REJECTED" && (
        <div className="space-y-3 rounded-lg border bg-red-50/50 p-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-xs text-muted-foreground">Rifiutato il</span>
              <p>{fmtDateTime(cv.reviewedAt)}</p>
            </div>
          </div>
          {cv.rejectionReason && (
            <div className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm">
              <span className="text-xs font-medium text-red-600">Motivo:</span>{" "}
              {cv.rejectionReason}
            </div>
          )}
          <button
            disabled={actionLoading}
            onClick={() =>
              doAction("POST", {}, "Nuova richiesta inviata")
            }
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Richiedi nuova compilazione
          </button>
        </div>
      )}
    </div>
  );
}
