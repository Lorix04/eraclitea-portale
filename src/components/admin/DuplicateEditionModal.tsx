"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";

type PresenzaMinimaType = "percentage" | "days" | "hours" | null;

type DuplicateEditionInput = {
  id: string;
  editionNumber: number;
  course: { name: string };
  client: { name: string };
  lessonsCount: number;
  teacherAssignmentsCount: number;
  presenzaMinimaType: PresenzaMinimaType;
  presenzaMinimaValue: number | null;
};

type DuplicateEditionPreview = {
  id: string;
  editionNumber: number;
  nextEditionNumber: number;
  courseName: string;
  clientName: string;
  lessonsCount: number;
  teacherAssignmentsCount: number;
  presenzaMinimaType: PresenzaMinimaType;
  presenzaMinimaValue: number | null;
};

type DuplicateEditionModalProps = {
  open: boolean;
  onClose: () => void;
  edition: DuplicateEditionInput;
  onSuccess: (newEdition: {
    id: string;
    courseId: string;
    clientId: string;
    editionNumber: number;
    status: string;
  }) => void;
};

function formatPresenzaMinima(type: PresenzaMinimaType, value: number | null) {
  if (type === "percentage" && typeof value === "number") return `${value}%`;
  if (type === "days" && typeof value === "number") return `${value} lezioni`;
  if (type === "hours" && typeof value === "number") return `${value}h`;
  return "Non configurata";
}

export default function DuplicateEditionModal({
  open,
  onClose,
  edition,
  onSuccess,
}: DuplicateEditionModalProps) {
  const [preview, setPreview] = useState<DuplicateEditionPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateLessons, setDuplicateLessons] = useState(true);
  const [duplicateTeachers, setDuplicateTeachers] = useState(true);
  const [duplicateMinPresence, setDuplicateMinPresence] = useState(true);

  const effectivePreview = useMemo(() => {
    if (preview) return preview;
    return {
      id: edition.id,
      editionNumber: edition.editionNumber,
      nextEditionNumber: edition.editionNumber + 1,
      courseName: edition.course.name,
      clientName: edition.client.name,
      lessonsCount: edition.lessonsCount,
      teacherAssignmentsCount: edition.teacherAssignmentsCount,
      presenzaMinimaType: edition.presenzaMinimaType,
      presenzaMinimaValue: edition.presenzaMinimaValue,
    } satisfies DuplicateEditionPreview;
  }, [preview, edition]);

  const hasTeacherAssignments = effectivePreview.teacherAssignmentsCount > 0;
  const hasPresenzaMinima =
    (effectivePreview.presenzaMinimaType === "percentage" ||
      effectivePreview.presenzaMinimaType === "days" ||
      effectivePreview.presenzaMinimaType === "hours") &&
    typeof effectivePreview.presenzaMinimaValue === "number";

  useEffect(() => {
    if (!open) return;
    setDuplicateLessons(true);
    setDuplicateTeachers(hasTeacherAssignments);
    setDuplicateMinPresence(hasPresenzaMinima);
  }, [open, hasTeacherAssignments, hasPresenzaMinima]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingPreview(true);
    fetch(`/api/admin/editions/${edition.id}/duplicate`)
      .then((res) => {
        if (!res.ok) throw new Error("Errore caricamento anteprima");
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const nextPreview = json?.preview as DuplicateEditionPreview | undefined;
        if (nextPreview) {
          setPreview(nextPreview);
          setDuplicateTeachers(nextPreview.teacherAssignmentsCount > 0);
          setDuplicateMinPresence(
            (nextPreview.presenzaMinimaType === "percentage" ||
              nextPreview.presenzaMinimaType === "days" ||
              nextPreview.presenzaMinimaType === "hours") &&
              typeof nextPreview.presenzaMinimaValue === "number"
          );
        } else {
          setPreview(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPreview(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, edition.id]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleSubmit = async () => {
    if (duplicating) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/admin/editions/${edition.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duplicateLesson: duplicateLessons,
          duplicateLessons,
          duplicateTeachers: duplicateLessons ? duplicateTeachers : false,
          duplicateMinPresence,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error ?? "Errore durante la duplicazione");
        return;
      }

      const createdEdition = json?.edition as
        | {
            id: string;
            courseId: string;
            clientId: string;
            editionNumber: number;
            status: string;
          }
        | undefined;
      if (!createdEdition) {
        toast.error("Risposta non valida dalla duplicazione");
        return;
      }

      toast.success(`Edizione #${json.editionNumber} creata con successo`);
      onSuccess(createdEdition);
      onClose();
    } catch (error) {
      console.error("Errore duplicazione edizione:", error);
      toast.error("Errore durante la duplicazione");
    } finally {
      setDuplicating(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => {
          if (!duplicating) onClose();
        }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
        <div
          className="modal-panel bg-card shadow-lg sm:max-w-2xl"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Duplica Edizione</h2>
          </div>

          <div className="modal-body modal-scroll space-y-4 text-sm">
            {loadingPreview ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                <p>Stai per duplicare:</p>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="font-medium">{effectivePreview.courseName}</p>
                  <p className="text-muted-foreground">
                    {effectivePreview.clientName} · Edizione #
                    {effectivePreview.editionNumber}
                  </p>
                  <p className="text-muted-foreground">
                    {effectivePreview.lessonsCount} lezioni ·{" "}
                    {effectivePreview.teacherAssignmentsCount} assegnazioni docenti
                  </p>
                  <p className="text-muted-foreground">
                    Presenza minima:{" "}
                    {formatPresenzaMinima(
                      effectivePreview.presenzaMinimaType,
                      effectivePreview.presenzaMinimaValue
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-medium">
                    La nuova edizione sarà: Edizione #
                    {effectivePreview.nextEditionNumber}
                  </p>
                  <p className="text-muted-foreground">Stato: DRAFT (bozza)</p>
                </div>

                <div className="space-y-3 rounded-lg border p-3">
                  <p className="font-medium">Cosa vuoi duplicare?</p>

                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={duplicateLessons}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setDuplicateLessons(checked);
                        if (!checked) {
                          setDuplicateTeachers(false);
                        } else if (hasTeacherAssignments) {
                          setDuplicateTeachers(true);
                        }
                      }}
                    />
                    <span>
                      <strong>Lezioni</strong> (struttura senza date)
                      <br />
                      <span className="text-muted-foreground">
                        {effectivePreview.lessonsCount} lezioni: orari, durata, luogo
                        e titolo. Le date saranno da compilare manualmente.
                      </span>
                    </span>
                  </label>

                  <label
                    className={`flex items-start gap-2 ${
                      !duplicateLessons || !hasTeacherAssignments
                        ? "text-muted-foreground"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={duplicateTeachers}
                      onChange={(event) => setDuplicateTeachers(event.target.checked)}
                      disabled={!duplicateLessons || !hasTeacherAssignments}
                    />
                    <span>
                      <strong>Assegnazioni docenti</strong>
                      <br />
                      <span>
                        {hasTeacherAssignments
                          ? `${effectivePreview.teacherAssignmentsCount} assegnazioni docente-lezione`
                          : "Nessuna assegnazione presente"}
                      </span>
                      {!duplicateLessons ? (
                        <span className="block text-xs">
                          Richiede &quot;Lezioni&quot; selezionato.
                        </span>
                      ) : null}
                    </span>
                  </label>

                  <label
                    className={`flex items-start gap-2 ${
                      !hasPresenzaMinima ? "text-muted-foreground" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={duplicateMinPresence}
                      onChange={(event) =>
                        setDuplicateMinPresence(event.target.checked)
                      }
                      disabled={!hasPresenzaMinima}
                    />
                    <span>
                      <strong>Impostazioni presenza minima</strong>
                      <br />
                      <span>
                        {hasPresenzaMinima
                          ? `Tipo: ${effectivePreview.presenzaMinimaType}, Valore: ${formatPresenzaMinima(
                              effectivePreview.presenzaMinimaType,
                              effectivePreview.presenzaMinimaValue
                            )}`
                          : "Non configurata"}
                      </span>
                    </span>
                  </label>
                </div>

                <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  <p className="font-medium">
                    Cosa NON verrà duplicato
                  </p>
                  <p className="text-muted-foreground">
                    Le seguenti informazioni non vengono copiate:
                  </p>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    <li>Date edizione (inizio, fine, deadline)</li>
                    <li>Iscrizioni dipendenti</li>
                    <li>Presenze registrate</li>
                    <li>Attestati</li>
                  </ul>
                </div>

                {!duplicateLessons && duplicateTeachers ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    Le assegnazioni docenti richiedono la duplicazione delle lezioni.
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-md border px-4 py-2 text-sm"
              onClick={onClose}
              disabled={duplicating}
            >
              Annulla
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              onClick={handleSubmit}
              disabled={duplicating || loadingPreview}
            >
              {duplicating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Duplicazione...
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplica edizione
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
