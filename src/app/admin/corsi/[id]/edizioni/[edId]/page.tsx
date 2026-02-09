"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BrandedTabs } from "@/components/BrandedTabs";
import { ItalianDateInput } from "@/components/ui/italian-date-input";
import { formatItalianDate } from "@/lib/date-utils";
import { AttendanceMatrix } from "@/components/AttendanceMatrix";
import { AttendanceStats } from "@/components/AttendanceStats";
import { useAttendance } from "@/hooks/useAttendance";
import CertificateTable from "@/components/CertificateTable";
import AnagraficheResponsive from "@/components/AnagraficheResponsive";
import { LessonForm } from "@/components/LessonForm";
import { AttendanceStatus, Lesson } from "@/types";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";
import { Skeleton } from "@/components/ui/Skeleton";
import DeleteEditionModal from "@/components/admin/DeleteEditionModal";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bozza",
  PUBLISHED: "Aperto",
  CLOSED: "Chiuso",
  ARCHIVED: "Archiviato",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-orange-100 text-orange-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

const TABS = [
  { id: "info", label: "Info" },
  { id: "lezioni", label: "Lezioni" },
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
  notes?: string | null;
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
    email?: string | null;
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

  const registryRows = useMemo(() => {
    if (registrations.length === 0) {
      return [
        {
          nome: "",
          cognome: "",
          codiceFiscale: "",
          dataNascita: "",
          luogoNascita: "",
          email: "",
          mansione: "",
          note: "",
        },
      ];
    }
    return registrations.map((reg) => ({
      nome: reg.employee.nome,
      cognome: reg.employee.cognome,
      codiceFiscale: reg.employee.codiceFiscale,
      dataNascita: reg.employee.dataNascita
        ? formatItalianDate(reg.employee.dataNascita)
        : "",
      luogoNascita: reg.employee.luogoNascita ?? "",
      email: reg.employee.email ?? "",
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

  useEffect(() => {
    const loadRegistrations = async () => {
      if (!edition?.client?.id) return;
      setRegistrationsLoading(true);
      const res = await fetch(
        `/api/corsi/${params.edId}/registrazioni?clientId=${edition.client.id}`
      );
      const json = await res.json().catch(() => ({}));
      setRegistrations(json.data ?? []);
      setRegistrationsLoading(false);
    };

    loadRegistrations();
  }, [edition?.client?.id, params.edId]);

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
    const fieldErrors: Record<string, string> = {};
    if (!startDate) fieldErrors.startDate = "Questo campo e obbligatorio";
    if (!endDate) fieldErrors.endDate = "Questo campo e obbligatorio";
    if (!deadlineRegistry) {
      fieldErrors.deadlineRegistry = "Questo campo e obbligatorio";
    }
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    const res = await fetch(`/api/corsi/${params.id}/edizioni/${params.edId}` , {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        deadlineRegistry,
        status,
        notes,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
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
    toast.success("Edizione aggiornata");
  };

  const handleLessonSubmit = async (data: {
    date: string;
    startTime?: string;
    endTime?: string;
    durationHours: number;
    title?: string;
    notes?: string;
  }) => {
    if (!edition) return;
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
          <Link
            href={`/admin/attestati/upload?courseEditionId=${edition.id}&clientId=${edition.client.id}`}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Carica attestato
          </Link>
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
        <span
          className={`rounded-full px-3 py-1 ${
            STATUS_BADGE[edition.status] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {STATUS_LABELS[edition.status] ?? edition.status}
        </span>
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
              error={errors.deadlineRegistry}
            />
          </div>

          <label className="flex flex-col gap-2 text-sm">
            <FormLabel>Stato</FormLabel>
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
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
            />
          </label>

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
        </div>
      ) : null}

      {tab === "lezioni" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Totale lezioni: {lessons.length} &middot; Ore totali: {totalLessonHours}
            </p>
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
              onClick={() => {
                setEditingLesson(null);
                setLessonModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi lezione
            </button>
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
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Ora inizio</th>
                    <th className="px-4 py-3">Ora fine</th>
                    <th className="px-4 py-3">Durata</th>
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
                      <td className="px-4 py-3">{lessonItem.title || "-"}</td>
                      <td className="px-4 py-3">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {tab === "anagrafiche" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {registrations.length} dipendenti registrati
            </p>
          </div>

          {registrationsLoading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-3 h-32 w-full" />
            </div>
          ) : (
            <AnagraficheResponsive
              initialData={registryRows}
              courseEditionId={edition.id}
              clientId={edition.client.id}
            />
          )}
        </div>
      ) : null}

      {tab === "presenze" ? (
        <PresenzeTab courseEditionId={edition.id} />
      ) : null}

      {tab === "attestati" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {certificates.length} attestati trovati
            </p>
            <div className="flex gap-2">
              <Link
                href={`/admin/attestati/upload?courseEditionId=${edition.id}&clientId=${edition.client.id}`}
                className="rounded-md border px-3 py-2 text-sm"
              >
                Carica attestato
              </Link>
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
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg"
                  role="dialog"
                  aria-modal="true"
                  onClick={(event) => event.stopPropagation()}
                >
                  <h2 className="text-lg font-semibold">
                    {editingLesson ? "Modifica lezione" : "Aggiungi lezione"}
                  </h2>
                  <div className="mt-4">
                    <LessonForm
                      lesson={editingLesson ?? undefined}
                      onSubmit={handleLessonSubmit}
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
    </div>
  );
}

function PresenzeTab({ courseEditionId }: { courseEditionId: string }) {
  const { data, isLoading, saveAttendances } = useAttendance(courseEditionId);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceEntry>>(
    new Map()
  );
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, AttendanceEntry>>(
    new Map()
  );

  useEffect(() => {
    if (!data) return;
    const map = new Map<string, AttendanceEntry>();
    data.attendances.forEach((entry) => {
      map.set(`${entry.lessonId}:${entry.employeeId}`, {
        lessonId: entry.lessonId,
        employeeId: entry.employeeId,
        status: entry.status,
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
    notes?: string
  ) => {
    const key = `${lessonId}:${employeeId}`;
    setAttendanceMap((prev) => {
      const next = new Map(prev);
      next.set(key, { lessonId, employeeId, status, notes });
      return next;
    });
    setPendingUpdates((prev) => {
      const next = new Map(prev);
      next.set(key, { lessonId, employeeId, status, notes });
      return next;
    });
  };

  const handleSave = async () => {
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

  return (
    <div className="space-y-4">
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
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            onClick={handleSave}
            disabled={pendingUpdates.size === 0 || saveAttendances.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveAttendances.isPending ? "Salvataggio..." : "Salva modifiche"}
          </button>
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
            stats={data.stats}
            onUpdate={handleUpdate}
          />
          <p className="text-xs text-muted-foreground">
            Legenda: P = Presente, A = Assente, G = Assente giustificato.
          </p>
          <AttendanceStats stats={data.stats} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nessun dato disponibile.</p>
      )}
    </div>
  );
}
