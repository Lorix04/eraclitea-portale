"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle,
  Clock,
  Copy,
  Download,
  Lock,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { BrandedTabs } from "@/components/BrandedTabs";
import { ItalianDateInput } from "@/components/ui/italian-date-input";
import { formatItalianDate } from "@/lib/date-utils";
import { AttendanceMatrix } from "@/components/AttendanceMatrix";
import { AttendanceStats } from "@/components/AttendanceStats";
import { useAttendance } from "@/hooks/useAttendance";
import CertificateTable from "@/components/CertificateTable";
import { LessonForm } from "@/components/LessonForm";
import { AttendanceStatus, Lesson } from "@/types";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";
import { Skeleton } from "@/components/ui/Skeleton";
import DeleteEditionModal from "@/components/admin/DeleteEditionModal";
import DuplicateEditionModal from "@/components/admin/DuplicateEditionModal";
import EditionTeachersTab from "@/components/admin/EditionTeachersTab";
import EditionStatusBadge from "@/components/EditionStatusBadge";
import ImportEmployeesModal from "@/components/ImportEmployeesModal";
import { calculateAttendanceStats } from "@/lib/attendance-utils";

const AnagraficheResponsive = dynamic(
  () => import("@/components/AnagraficheResponsive"),
  { ssr: false }
);

const TABS = [
  { id: "info", label: "Info" },
  { id: "lezioni", label: "Lezioni" },
  { id: "docenti", label: "Docenti" },
  { id: "anagrafiche", label: "Anagrafiche" },
  { id: "presenze", label: "Presenze" },
  { id: "attestati", label: "Attestati" },
];

type EditionDetail = {
  id: string;
  editionNumber: number;
  startDate?: string | null;
  endDate?: string | null;
  deadlineRegistry?: string | null;
  status: string;
  presenzaMinimaType?: "percentage" | "days" | "hours" | null;
  presenzaMinimaValue?: number | null;
  notes?: string | null;
  registrySentAt?: string | null;
  course: { id: string; title: string; durationHours?: number | null };
  client: { id: string; ragioneSociale: string };
  _count?: { registrations: number; lessons: number; certificates: number };
};

type RegistrationRow = {
  id: string;
  status: string;
  insertedAt: string;
  employee: {
    id: string;
    nome: string;
    cognome: string;
    codiceFiscale: string;
    sesso?: string | null;
    email?: string | null;
    telefono?: string | null;
    cellulare?: string | null;
    indirizzo?: string | null;
    comuneResidenza?: string | null;
    cap?: string | null;
    provincia?: string | null;
    regione?: string | null;
    emailAziendale?: string | null;
    partitaIva?: string | null;
    iban?: string | null;
    pec?: string | null;
    dataNascita?: string | null;
    luogoNascita?: string | null;
    mansione?: string | null;
    note?: string | null;
  };
};

type CertificateRow = {
  id: string;
  employee: { nome: string; cognome: string };
  courseEdition?: {
    id: string;
    editionNumber: number;
    course?: { title: string } | null;
  } | null;
  achievedAt?: string | null;
  expiresAt?: string | null;
  uploadedAt?: string | null;
  uploadedByEmail?: string | null;
};

type AttendanceEntry = {
  lessonId: string;
  employeeId: string;
  status: AttendanceStatus;
  hoursAttended?: number | null;
  notes?: string;
};

export default function AdminEditionDetailPage({
  params,
}: {
  params: { id: string; edId: string };
}) {
  const router = useRouter();
  const [tab, setTab] = useState("info");
  const [edition, setEdition] = useState<EditionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deadlineRegistry, setDeadlineRegistry] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [notes, setNotes] = useState("");
  const [hasPresenzaMinima, setHasPresenzaMinima] = useState(false);
  const [presenzaMinimaType, setPresenzaMinimaType] = useState<
    "percentage" | "days" | "hours"
  >("percentage");
  const [presenzaMinimaValue, setPresenzaMinimaValue] = useState("");
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [modalMounted, setModalMounted] = useState(false);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [lessonDeleting, setLessonDeleting] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const registryRows = useMemo(() => {
    if (registrations.length === 0) {
      return [
        {
          nome: "",
          cognome: "",
          codiceFiscale: "",
          sesso: "",
          dataNascita: "",
          luogoNascita: "",
          email: "",
          telefono: "",
          cellulare: "",
          indirizzo: "",
          comuneResidenza: "",
          cap: "",
          provincia: "",
          regione: "",
          emailAziendale: "",
          partitaIva: "",
          iban: "",
          pec: "",
          mansione: "",
          note: "",
        },
      ];
    }
    return registrations.map((reg) => ({
      employeeId: reg.employee.id,
      nome: reg.employee.nome,
      cognome: reg.employee.cognome,
      codiceFiscale: reg.employee.codiceFiscale,
      sesso: reg.employee.sesso ?? "",
      dataNascita: reg.employee.dataNascita
        ? formatItalianDate(reg.employee.dataNascita)
        : "",
      luogoNascita: reg.employee.luogoNascita ?? "",
      email: reg.employee.email ?? "",
      telefono: reg.employee.telefono ?? "",
      cellulare: reg.employee.cellulare ?? "",
      indirizzo: reg.employee.indirizzo ?? "",
      comuneResidenza: reg.employee.comuneResidenza ?? "",
      cap: reg.employee.cap ?? "",
      provincia: reg.employee.provincia ?? "",
      regione: reg.employee.regione ?? "",
      emailAziendale: reg.employee.emailAziendale ?? "",
      partitaIva: reg.employee.partitaIva ?? "",
      iban: reg.employee.iban ?? "",
      pec: reg.employee.pec ?? "",
      mansione: reg.employee.mansione ?? "",
      note: reg.employee.note ?? "",
    }));
  }, [registrations]);

  const loadEdition = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/corsi/${params.id}/edizioni/${params.edId}`);
    if (!res.ok) {
      setEdition(null);
      setLoading(false);
      return;
    }
    const json = await res.json();
    const data = json.data as EditionDetail;
    setEdition(data);
    setStartDate(formatItalianDate(data.startDate));
    setEndDate(formatItalianDate(data.endDate));
    setDeadlineRegistry(formatItalianDate(data.deadlineRegistry));
    setStatus(data.status ?? "DRAFT");
    setNotes(data.notes ?? "");
    const hasMinimum =
      (data.presenzaMinimaType === "percentage" ||
        data.presenzaMinimaType === "days" ||
        data.presenzaMinimaType === "hours") &&
      typeof data.presenzaMinimaValue === "number";
    setHasPresenzaMinima(hasMinimum);
    setPresenzaMinimaType(
      data.presenzaMinimaType === "days" || data.presenzaMinimaType === "hours"
        ? data.presenzaMinimaType
        : "percentage"
    );
    setPresenzaMinimaValue(
      hasMinimum ? String(data.presenzaMinimaValue ?? "") : ""
    );
    setLoading(false);
  }, [params.id, params.edId]);

  useEffect(() => {
    loadEdition();
  }, [loadEdition]);

  const loadLessons = useCallback(async () => {
    if (!params.edId) return;
    setLessonsLoading(true);
    const res = await fetch(
      `/api/corsi/${params.id}/edizioni/${params.edId}/lezioni?limit=200`
    );
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Errore caricamento lezioni");
      setLessons([]);
      setLessonsLoading(false);
      return;
    }
    const json = await res.json().catch(() => ({}));
    setLessons(json.data ?? []);
    setLessonsLoading(false);
  }, [params.id, params.edId]);

  useEffect(() => {
    if (!edition) return;
    loadLessons();
  }, [edition, loadLessons]);

  const loadRegistrations = useCallback(async () => {
    if (!edition?.client?.id) return;
    setRegistrationsLoading(true);
    const res = await fetch(
      `/api/corsi/${params.edId}/registrazioni?clientId=${edition.client.id}`
    );
    const json = await res.json().catch(() => ({}));
    setRegistrations(json.data ?? []);
    setRegistrationsLoading(false);
  }, [edition?.client?.id, params.edId]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  useEffect(() => {
    const loadCertificates = async () => {
      setCertificatesLoading(true);
      const res = await fetch(
        `/api/attestati?courseEditionId=${params.edId}&limit=200`
      );
      const json = await res.json().catch(() => ({}));
      const mapped: CertificateRow[] = (json.data ?? []).map((cert: any) => ({
        id: cert.id,
        employee: cert.employee,
        courseEdition: cert.courseEdition
          ? {
              id: cert.courseEdition.id,
              editionNumber: cert.courseEdition.editionNumber,
              course: cert.courseEdition.course
                ? { title: cert.courseEdition.course.title ?? "Esterno" }
                : null,
            }
          : null,
        achievedAt: cert.achievedAt,
        expiresAt: cert.expiresAt,
        uploadedAt: cert.uploadedAt,
        uploadedByEmail: cert.uploader?.email ?? null,
      }));
      setCertificates(mapped);
      setCertificatesLoading(false);
    };

    loadCertificates();
  }, [params.edId]);

  useEffect(() => {
    setModalMounted(true);
  }, []);

  useEffect(() => {
    if (!modalMounted) return;
    if (lessonModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lessonModalOpen, modalMounted]);

  const handleSave = async () => {
    if (!edition) return;
    if (edition.status === "ARCHIVED") {
      toast.error("L'edizione e archiviata. Nessuna modifica consentita.");
      return;
    }
    const fieldErrors: Record<string, string> = {};
    if (!startDate) fieldErrors.startDate = "Questo campo e obbligatorio";
    if (!endDate) fieldErrors.endDate = "Questo campo e obbligatorio";
    if (!deadlineRegistry) {
      fieldErrors.deadlineRegistry = "Questo campo e obbligatorio";
    }
    if (hasPresenzaMinima) {
      if (!presenzaMinimaValue.trim()) {
        fieldErrors.presenzaMinimaValue = "Inserisci il valore minimo richiesto";
      } else {
        const parsedValue = Number(presenzaMinimaValue);
        if (!Number.isInteger(parsedValue) || parsedValue < 1) {
          fieldErrors.presenzaMinimaValue =
            "Il valore minimo deve essere un numero intero positivo";
        } else if (presenzaMinimaType === "percentage" && parsedValue > 100) {
          fieldErrors.presenzaMinimaValue =
            "La percentuale minima deve essere tra 1 e 100";
        }
      }
    }
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    const presenzaMinimaPayloadValue = hasPresenzaMinima
      ? Number(presenzaMinimaValue)
      : null;
    const res = await fetch(`/api/corsi/${params.id}/edizioni/${params.edId}` , {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        deadlineRegistry,
        status,
        presenzaMinimaType: hasPresenzaMinima ? presenzaMinimaType : null,
        presenzaMinimaValue: presenzaMinimaPayloadValue,
        notes,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      const message = String(json.error ?? "");
      if (message.includes("fine")) {
        setErrors((prev) => ({ ...prev, endDate: message }));
      } else if (message.includes("deadline")) {
        setErrors((prev) => ({ ...prev, deadlineRegistry: message }));
      }
      toast.error(json.error ?? "Errore durante il salvataggio");
      return;
    }

    const json = await res.json();
    const data = json.data as EditionDetail;
    setEdition(data);
    setStartDate(formatItalianDate(data.startDate));
    setEndDate(formatItalianDate(data.endDate));
    setDeadlineRegistry(formatItalianDate(data.deadlineRegistry));
    setStatus(data.status ?? "DRAFT");
    setNotes(data.notes ?? "");
    const hasMinimum =
      (data.presenzaMinimaType === "percentage" ||
        data.presenzaMinimaType === "days" ||
        data.presenzaMinimaType === "hours") &&
      typeof data.presenzaMinimaValue === "number";
    setHasPresenzaMinima(hasMinimum);
    setPresenzaMinimaType(
      data.presenzaMinimaType === "days" || data.presenzaMinimaType === "hours"
        ? data.presenzaMinimaType
        : "percentage"
    );
    setPresenzaMinimaValue(
      hasMinimum ? String(data.presenzaMinimaValue ?? "") : ""
    );
    toast.success("Edizione aggiornata");
  };

  const handleLessonSubmit = async (data: {
    date: string;
    startTime?: string;
    endTime?: string;
    durationHours: number;
    luogo: string;
    title?: string;
    notes?: string;
  }) => {
    if (!edition) return;
    if (edition.status === "ARCHIVED") {
      toast.error("L'edizione e archiviata. Nessuna modifica consentita.");
      return;
    }
    setLessonSaving(true);
    const method = editingLesson ? "PUT" : "POST";
    const endpoint = editingLesson
      ? `/api/corsi/${params.id}/edizioni/${params.edId}/lezioni/${editingLesson.id}`
      : `/api/corsi/${params.id}/edizioni/${params.edId}/lezioni`;

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLessonSaving(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Errore durante il salvataggio");
      return;
    }

    toast.success(editingLesson ? "Lezione aggiornata" : "Lezione creata");
    setLessonModalOpen(false);
    setEditingLesson(null);
    await Promise.all([loadLessons(), loadEdition()]);
  };

  const handleLessonDelete = async (lessonId: string) => {
    if (!edition) return;
    if (edition.status === "ARCHIVED") {
      toast.error("L'edizione e archiviata. Nessuna modifica consentita.");
      return;
    }
    if (!confirm("Eliminare questa lezione?")) return;
    setLessonDeleting(lessonId);
    const res = await fetch(
      `/api/corsi/${params.id}/edizioni/${params.edId}/lezioni/${lessonId}`,
      { method: "DELETE" }
    );
    setLessonDeleting(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Errore eliminazione lezione");
      return;
    }
    toast.success("Lezione eliminata");
    await Promise.all([loadLessons(), loadEdition()]);
  };

  const totalLessonHours = useMemo(
    () =>
      lessons.reduce(
        (acc, lessonItem) => acc + (lessonItem.durationHours ?? 0),
        0
      ),
    [lessons]
  );

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="mt-2 h-4 w-64" />
        <Skeleton className="mt-6 h-32 w-full" />
      </div>
    );
  }

  if (!edition) {
    return <p className="text-sm text-muted-foreground">Edizione non trovata.</p>;
  }

  const isArchived = edition.status === "ARCHIVED";
  const isClosed = edition.status === "CLOSED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {edition.course?.title} &middot; {edition.client?.ragioneSociale} &middot; Ed. #{edition.editionNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestione dettagli per l&apos;edizione selezionata.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/corsi/${edition.course.id}`}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Torna al corso
          </Link>
          <button
            type="button"
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
            onClick={() => setDuplicateModalOpen(true)}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplica edizione
          </button>
          {!isArchived ? (
            <Link
              href={`/admin/attestati/upload?courseEditionId=${edition.id}&clientId=${edition.client.id}`}
              className="rounded-md border px-3 py-2 text-sm"
            >
              Carica attestato
            </Link>
          ) : null}
          <button
            type="button"
            className="rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground"
            onClick={() => setDeleteModalOpen(true)}
          >
            Elimina edizione
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <EditionStatusBadge status={edition.status} className="px-3 py-1 text-sm" />
        <span className="text-muted-foreground">
          Lezioni: {edition._count?.lessons ?? 0}
        </span>
        <span className="text-muted-foreground">
          Partecipanti: {edition._count?.registrations ?? 0}
        </span>
        <span className="text-muted-foreground">
          Attestati: {edition._count?.certificates ?? 0}
        </span>
      </div>

      <BrandedTabs tabs={TABS} activeTab={tab} onTabChange={setTab} />

      {tab === "info" ? (
        <div className="space-y-6 rounded-lg border bg-card p-6">
          {isArchived ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 p-3 text-sm text-gray-600">
              <Archive className="h-4 w-4" />
              <span>
                <strong>Edizione archiviata</strong> - I dati sono in sola lettura.
              </span>
            </div>
          ) : null}
          <FormRequiredLegend />
          <div className="grid gap-4 md:grid-cols-3">
            <ItalianDateInput
              label="Data inizio"
              value={startDate}
              onChange={(value) => {
                setStartDate(value);
                if (errors.startDate) {
                  setErrors((prev) => ({ ...prev, startDate: "" }));
                }
              }}
              required
              disabled={isArchived}
              error={errors.startDate}
            />
            <ItalianDateInput
              label="Data fine"
              value={endDate}
              onChange={(value) => {
                setEndDate(value);
                if (errors.endDate) {
                  setErrors((prev) => ({ ...prev, endDate: "" }));
                }
              }}
              required
              disabled={isArchived}
              error={errors.endDate}
            />
            <ItalianDateInput
              label="Deadline anagrafiche"
              value={deadlineRegistry}
              onChange={(value) => {
                setDeadlineRegistry(value);
                if (errors.deadlineRegistry) {
                  setErrors((prev) => ({ ...prev, deadlineRegistry: "" }));
                }
              }}
              required
              disabled={isArchived}
              error={errors.deadlineRegistry}
            />
          </div>

          <label className="flex flex-col gap-2 text-sm">
            <FormLabel>Stato</FormLabel>
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={isArchived}
            >
              <option value="DRAFT">Bozza</option>
              <option value="PUBLISHED">Aperto</option>
              <option value="CLOSED">Chiuso</option>
              <option value="ARCHIVED">Archiviato</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <FormLabel>Note</FormLabel>
            <textarea
              className="min-h-[120px] rounded-md border bg-background px-3 py-2"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isArchived}
            />
          </label>

          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasPresenzaMinima}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setHasPresenzaMinima(checked);
                  if (!checked) {
                    setPresenzaMinimaValue("");
                    setErrors((prev) => ({ ...prev, presenzaMinimaValue: "" }));
                  }
                }}
                disabled={isArchived}
              />
              Richiedi presenza minima
            </label>

            {hasPresenzaMinima ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <FormLabel>Tipo requisito</FormLabel>
                  <select
                    className="rounded-md border bg-background px-3 py-2"
                    value={presenzaMinimaType}
                      onChange={(event) =>
                        setPresenzaMinimaType(
                          event.target.value as "percentage" | "days" | "hours"
                        )
                      }
                      disabled={isArchived}
                    >
                      <option value="percentage">Percentuale</option>
                      <option value="days">Numero di lezioni</option>
                      <option value="hours">Ore</option>
                    </select>
                  </label>

                <label className="flex flex-col gap-2 text-sm">
                  <FormLabel required>Valore minimo</FormLabel>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={presenzaMinimaType === "percentage" ? 100 : undefined}
                      className={`w-full rounded-md border bg-background px-3 py-2 ${
                        errors.presenzaMinimaValue
                          ? "border-red-500 focus-visible:outline-red-500"
                          : ""
                      }`}
                      value={presenzaMinimaValue}
                      onChange={(event) => {
                        setPresenzaMinimaValue(event.target.value);
                        if (errors.presenzaMinimaValue) {
                          setErrors((prev) => ({ ...prev, presenzaMinimaValue: "" }));
                        }
                      }}
                      placeholder={
                        presenzaMinimaType === "percentage"
                          ? "Es. 75"
                          : presenzaMinimaType === "hours"
                            ? "Es. 24"
                            : "Es. 6"
                      }
                      disabled={isArchived}
                    />
                      <span className="min-w-[48px] text-xs text-muted-foreground">
                      {presenzaMinimaType === "percentage"
                        ? "%"
                        : presenzaMinimaType === "hours"
                          ? "h"
                          : "lezioni"}
                      </span>
                    </div>
                    <FormFieldError message={errors.presenzaMinimaValue} />
                </label>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nessun requisito di presenza minima impostato.
              </p>
            )}
          </div>

          {!isArchived ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Salvataggio..." : "Salva modifiche"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "lezioni" ? (
        <div className="space-y-4">
          {isArchived ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 p-3 text-sm text-gray-600">
              <Archive className="h-4 w-4" />
              <span>
                <strong>Edizione archiviata</strong> - I dati sono in sola lettura.
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Totale lezioni: {lessons.length} &middot; Ore totali: {totalLessonHours}
            </p>
            {!isArchived ? (
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                onClick={() => {
                  setEditingLesson(null);
                  setLessonModalOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi lezione
              </button>
            ) : null}
          </div>

          {lessonsLoading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-3 h-8 w-full" />
              <Skeleton className="mt-2 h-8 w-full" />
            </div>
          ) : lessons.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
              Nessuna lezione disponibile.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-card">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Ora inizio</th>
                    <th className="px-4 py-3">Ora fine</th>
                    <th className="px-4 py-3">Durata</th>
                    <th className="px-4 py-3">Luogo</th>
                    <th className="px-4 py-3">Titolo</th>
                    <th className="px-4 py-3">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((lessonItem) => (
                    <tr key={lessonItem.id} className="border-t">
                      <td className="px-4 py-3">
                        {formatItalianDate(lessonItem.date)}
                      </td>
                      <td className="px-4 py-3">{lessonItem.startTime || "-"}</td>
                      <td className="px-4 py-3">{lessonItem.endTime || "-"}</td>
                      <td className="px-4 py-3">{lessonItem.durationHours}h</td>
                      <td className="px-4 py-3">{lessonItem.luogo || "-"}</td>
                      <td className="px-4 py-3">{lessonItem.title || "-"}</td>
                      <td className="px-4 py-3">
                        {!isArchived ? (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-xs text-primary"
                              onClick={() => {
                                setEditingLesson(lessonItem);
                                setLessonModalOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                              Modifica
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-xs text-destructive"
                              onClick={() => handleLessonDelete(lessonItem.id)}
                              disabled={lessonDeleting === lessonItem.id}
                            >
                              <Trash2 className="h-3 w-3" />
                              {lessonDeleting === lessonItem.id ? "Elimino..." : "Elimina"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sola lettura</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {tab === "docenti" ? (
        <EditionTeachersTab
          editionId={edition.id}
          lessons={lessons}
          readOnly={isArchived}
        />
      ) : null}

      {tab === "anagrafiche" ? (
        <div className="space-y-4">
          {isArchived ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 p-3 text-sm text-gray-600">
              <Archive className="h-4 w-4" />
              <span>
                <strong>Edizione archiviata</strong> - I dati sono in sola lettura.
              </span>
            </div>
          ) : null}
          {edition.registrySentAt ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span>
                Anagrafiche inviate dal cliente il{" "}
                <strong>{formatItalianDate(edition.registrySentAt)}</strong>
              </span>
            </div>
          ) : edition.status !== "DRAFT" ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <Clock className="h-4 w-4" />
              <span>Il cliente non ha ancora inviato le anagrafiche.</span>
            </div>
          ) : null}
          {isClosed ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <Lock className="h-4 w-4" />
              <span>
                <strong>Edizione chiusa</strong> - Le anagrafiche sono bloccate per il cliente. L&apos;admin puo ancora modificarle se necessario.
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {registrations.length} dipendenti registrati
            </p>
            {!isArchived ? (
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center rounded-md border px-3 py-2 text-sm"
                onClick={() => setImportModalOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importa CSV/Excel
              </button>
            ) : null}
          </div>

          {registrationsLoading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-3 h-32 w-full" />
            </div>
          ) : (
            <div className={isArchived ? "[&_button]:hidden" : ""}>
              <AnagraficheResponsive
                initialData={registryRows}
                courseEditionId={edition.id}
                clientId={edition.client.id}
                readOnly={isArchived}
              />
            </div>
          )}
        </div>
      ) : null}

      {tab === "presenze" ? (
        <PresenzeTab courseEditionId={edition.id} readOnly={isArchived} />
      ) : null}

      {tab === "attestati" ? (
        <div className="space-y-4">
          {isArchived ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 p-3 text-sm text-gray-600">
              <Archive className="h-4 w-4" />
              <span>
                <strong>Edizione archiviata</strong> - I dati sono in sola lettura.
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {certificates.length} attestati trovati
            </p>
            <div className="flex gap-2">
              {!isArchived ? (
                <Link
                  href={`/admin/attestati/upload?courseEditionId=${edition.id}&clientId=${edition.client.id}`}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  Carica attestato
                </Link>
              ) : null}
            </div>
          </div>
          <CertificateTable certificates={certificates} isLoading={certificatesLoading} />
        </div>
      ) : null}

      {lessonModalOpen && modalMounted
        ? createPortal(
            <div className="fixed inset-0 z-50">
              <div
                className="fixed inset-0 bg-black/50"
                onClick={() => {
                  if (!lessonSaving) {
                    setLessonModalOpen(false);
                    setEditingLesson(null);
                  }
                }}
                aria-hidden="true"
              />
              <div className="fixed inset-0 z-50 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
                <div
                  className="modal-panel bg-card shadow-lg sm:max-w-lg"
                  role="dialog"
                  aria-modal="true"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="modal-header">
                    <h2 className="text-lg font-semibold">
                      {editingLesson ? "Modifica lezione" : "Aggiungi lezione"}
                    </h2>
                  </div>
                  <div className="flex h-full flex-1 flex-col overflow-hidden">
                    <LessonForm
                      lesson={editingLesson ?? undefined}
                      onSubmit={handleLessonSubmit}
                      stickyFooter
                      onCancel={() => {
                        if (!lessonSaving) {
                          setLessonModalOpen(false);
                          setEditingLesson(null);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {deleteModalOpen ? (
        <DeleteEditionModal
          editionId={edition.id}
          courseId={edition.course.id}
          courseName={edition.course.title}
          editionNumber={edition.editionNumber}
          clientName={edition.client.ragioneSociale}
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={() => {
            router.push(`/admin/corsi/${params.id}`);
          }}
        />
      ) : null}

      {duplicateModalOpen ? (
        <DuplicateEditionModal
          open={duplicateModalOpen}
          onClose={() => setDuplicateModalOpen(false)}
          edition={{
            id: edition.id,
            editionNumber: edition.editionNumber,
            course: { name: edition.course.title },
            client: { name: edition.client.ragioneSociale },
            lessonsCount: edition._count?.lessons ?? 0,
            teacherAssignmentsCount: 0,
            presenzaMinimaType: edition.presenzaMinimaType ?? null,
            presenzaMinimaValue: edition.presenzaMinimaValue ?? null,
          }}
          onSuccess={(newEdition) => {
            router.push(
              `/admin/corsi/${newEdition.courseId}/edizioni/${newEdition.id}`
            );
          }}
        />
      ) : null}

      {!isArchived ? (
        <ImportEmployeesModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          clientId={edition.client.id}
          editionId={edition.id}
          onImportComplete={async () => {
            await Promise.all([loadRegistrations(), loadEdition()]);
          }}
        />
      ) : null}
    </div>
  );
}

function PresenzeTab({
  courseEditionId,
  readOnly = false,
}: {
  courseEditionId: string;
  readOnly?: boolean;
}) {
  const { data, isLoading, saveAttendances } = useAttendance(courseEditionId);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceEntry>>(
    new Map()
  );
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, AttendanceEntry>>(
    new Map()
  );
  const [employeeFilter, setEmployeeFilter] = useState("");

  useEffect(() => {
    if (!data) return;
    const map = new Map<string, AttendanceEntry>();
      data.attendances.forEach((entry) => {
        map.set(`${entry.lessonId}:${entry.employeeId}`, {
          lessonId: entry.lessonId,
          employeeId: entry.employeeId,
          status: entry.status,
          hoursAttended: entry.hoursAttended ?? null,
          notes: entry.notes,
        });
      });
    setAttendanceMap(map);
    setPendingUpdates(new Map());
  }, [data]);

  const handleUpdate = (
    lessonId: string,
    employeeId: string,
    status: AttendanceStatus,
    notes?: string,
    hoursAttended?: number | null
  ) => {
    if (readOnly) return;
    const key = `${lessonId}:${employeeId}`;
    setAttendanceMap((prev) => {
      const next = new Map(prev);
      next.set(key, { lessonId, employeeId, status, notes, hoursAttended });
      return next;
    });
    setPendingUpdates((prev) => {
      const next = new Map(prev);
      next.set(key, { lessonId, employeeId, status, notes, hoursAttended });
      return next;
    });
  };

  const handleSave = async () => {
    if (readOnly) return;
    if (pendingUpdates.size === 0) return;
    const payload = Array.from(pendingUpdates.values());
    try {
      await saveAttendances.mutateAsync(payload);
      toast.success("Presenze salvate");
      setPendingUpdates(new Map());
    } catch {
      toast.error("Errore durante il salvataggio");
    }
  };

  const handleExport = async (format: "csv" | "pdf") => {
    const res = await fetch(
      `/api/corsi/${courseEditionId}/presenze/export?format=${format}`
    );
    if (!res.ok) {
      toast.error("Errore export presenze");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `presenze_${courseEditionId}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const matrixAttendances = useMemo(() => {
    return Array.from(attendanceMap.values());
  }, [attendanceMap]);

  const localStats = useMemo(() => {
    if (!data) return null;
    return calculateAttendanceStats({
      employees: data.employees.map((employee) => ({
        id: employee.id,
        nome: employee.nome,
        cognome: employee.cognome,
      })),
      lessons: data.lessons.map((lesson) => ({
        id: lesson.id,
        durationHours: lesson.durationHours ?? 0,
      })),
      attendances: matrixAttendances.map((entry) => ({
        lessonId: entry.lessonId,
        employeeId: entry.employeeId,
        status: entry.status,
        hoursAttended: entry.hoursAttended ?? null,
      })),
      presenzaMinimaType: data.presenzaMinimaType,
      presenzaMinimaValue: data.presenzaMinimaValue,
    });
  }, [data, matrixAttendances]);

  return (
    <div className="space-y-4">
      {readOnly ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 p-3 text-sm text-gray-600">
          <Archive className="h-4 w-4" />
          <span>
            <strong>Edizione archiviata</strong> - I dati sono in sola lettura.
          </span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Lezioni: {data?.totalLessons ?? 0} &middot; Ore totali: {data?.totalHours ?? 0}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
            onClick={() => handleExport("csv")}
          >
            <Download className="mr-2 h-4 w-4" />
            Esporta CSV
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
            onClick={() => handleExport("pdf")}
          >
            <Download className="mr-2 h-4 w-4" />
            Esporta PDF
          </button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              placeholder="Cerca dipendente..."
              className="h-10 rounded-md border bg-background pl-9 pr-3 text-sm"
            />
          </div>
          {!readOnly ? (
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
              onClick={handleSave}
              disabled={pendingUpdates.size === 0 || saveAttendances.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveAttendances.isPending ? "Salvataggio..." : "Salva modifiche"}
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-32 w-full" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          <AttendanceMatrix
            courseEditionId={courseEditionId}
            lessons={data.lessons}
            employees={data.employees}
            attendances={matrixAttendances}
            onUpdate={handleUpdate}
            readonly={readOnly}
            isAdmin
            minRequirementType={data.presenzaMinimaType}
            minRequirementValue={data.presenzaMinimaValue}
            employeeFilter={employeeFilter}
            onEmployeeFilterChange={setEmployeeFilter}
          />
          <AttendanceStats
            stats={localStats?.stats ?? data.stats}
            minRequirementType={data.presenzaMinimaType}
            minRequirementValue={data.presenzaMinimaValue}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nessun dato disponibile.</p>
      )}
    </div>
  );
}
