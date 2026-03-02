"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  GraduationCap,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import TeacherModal, { TeacherFormValue } from "@/components/admin/TeacherModal";
import { formatItalianDate } from "@/lib/date-utils";

type EditionStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

type Assignment = {
  id: string;
  lessonId: string;
  lesson: {
    id: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    title?: string | null;
    luogo?: string | null;
    courseEdition: {
      id: string;
      editionNumber: number;
      status: EditionStatus;
      course: { id: string; title: string };
      client: { id: string; ragioneSociale: string };
    };
  };
};

type Unavailability = {
  id: string;
  date: string;
  reason?: string | null;
  allDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

type TeacherDetail = TeacherFormValue & {
  assignments: Assignment[];
  unavailabilities: Unavailability[];
};

type Day = {
  date: string;
  status: "busy" | "unavailable" | "partial" | "free";
  assignments: Assignment[];
  unavailability: Unavailability | null;
};

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function fetchTeacher(id: string): Promise<TeacherDetail> {
  return fetch(`/api/admin/teachers/${id}`).then(async (response) => {
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.error ?? "Errore caricamento docente");
    }
    return json.data as TeacherDetail;
  });
}

function fetchCalendar(id: string, month: number, year: number): Promise<Day[]> {
  return fetch(`/api/admin/teachers/${id}/calendar?month=${month}&year=${year}`).then(
    async (response) => {
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? "Errore caricamento calendario");
      }
      return Array.isArray(json.days) ? (json.days as Day[]) : [];
    }
  );
}

function statusBadge(status: EditionStatus) {
  if (status === "PUBLISHED") return "bg-emerald-100 text-emerald-700";
  if (status === "CLOSED") return "bg-amber-100 text-amber-700";
  if (status === "ARCHIVED") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

function statusLabel(status: EditionStatus) {
  if (status === "PUBLISHED") return "Aperta";
  if (status === "CLOSED") return "Chiusa";
  if (status === "ARCHIVED") return "Archiviata";
  return "Bozza";
}

function dayClass(status: Day["status"], selected: boolean) {
  const base = "min-h-[88px] rounded-lg border p-2 text-left text-xs transition-colors";
  const ring = selected ? " ring-2 ring-primary/70" : "";
  if (status === "busy") return `${base} border-red-200 bg-red-50 text-red-700${ring}`;
  if (status === "unavailable")
    return `${base} border-gray-300 bg-gray-100 text-gray-700${ring}`;
  if (status === "partial")
    return `${base} border-amber-200 bg-amber-50 text-amber-700${ring}`;
  return `${base} border-emerald-200 bg-emerald-50 text-emerald-700${ring}`;
}

function keyForDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function AdminTeacherDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : params?.id?.[0] ?? "";
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [unavailabilityModalOpen, setUnavailabilityModalOpen] = useState(false);
  const [unavailabilitySaving, setUnavailabilitySaving] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [unavailabilityForm, setUnavailabilityForm] = useState({
    date: "",
    allDay: true,
    startTime: "",
    endTime: "",
    reason: "",
  });
  const cvInputRef = useRef<HTMLInputElement | null>(null);

  const month = monthCursor.getMonth() + 1;
  const year = monthCursor.getFullYear();

  const teacherQuery = useQuery({
    queryKey: ["teacher-detail", id],
    queryFn: () => fetchTeacher(id),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
  });

  const calendarQuery = useQuery({
    queryKey: ["teacher-calendar", id, month, year],
    queryFn: () => fetchCalendar(id, month, year),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
  });

  const teacher = teacherQuery.data;
  const days = useMemo(() => calendarQuery.data ?? [], [calendarQuery.data]);

  const dayMap = useMemo(() => {
    const map = new Map<string, Day>();
    days.forEach((day) => map.set(day.date, day));
    return map;
  }, [days]);

  const monthCells = useMemo(() => {
    const first = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const total = new Date(year, month, 0).getDate();
    const cells: Array<{ key: string; day: number; data: Day } | null> = [];
    for (let i = 0; i < first; i += 1) cells.push(null);
    for (let day = 1; day <= total; day += 1) {
      const key = keyForDate(year, month, day);
      cells.push({
        key,
        day,
        data:
          dayMap.get(key) ??
          { date: key, status: "free", assignments: [], unavailability: null },
      });
    }
    return cells;
  }, [dayMap, month, year]);

  const selectedDay = useMemo(
    () => (selectedDayKey ? dayMap.get(selectedDayKey) ?? null : null),
    [dayMap, selectedDayKey]
  );

  const assignments = useMemo(() => {
    if (!teacher) return [];
    return [...teacher.assignments].sort(
      (a, b) =>
        new Date(a.lesson.date).getTime() - new Date(b.lesson.date).getTime()
    );
  }, [teacher]);

  const visibleAssignments = useMemo(() => {
    if (showAllLessons) return assignments;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return assignments.filter(
      (assignment) => new Date(assignment.lesson.date).getTime() >= today.getTime()
    );
  }, [assignments, showAllLessons]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("it-IT", {
        month: "long",
        year: "numeric",
      }).format(monthCursor),
    [monthCursor]
  );

  const openUnavailabilityModal = (date: string) => {
    setUnavailabilityForm({
      date,
      allDay: true,
      startTime: "",
      endTime: "",
      reason: "",
    });
    setUnavailabilityModalOpen(true);
  };

  const uploadCv = async (file: File) => {
    setCvUploading(true);
    try {
      const formData = new FormData();
      formData.append("cv", file);
      const response = await fetch(`/api/admin/teachers/${id}/cv`, {
        method: "POST",
        body: formData,
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(json.error ?? "Errore upload CV");
        return;
      }
      toast.success("CV caricato");
      await teacherQuery.refetch();
    } catch (error) {
      console.error("[TEACHER_CV_UPLOAD] Error:", error);
      toast.error("Errore upload CV");
    } finally {
      setCvUploading(false);
    }
  };

  const downloadCv = async () => {
    if (!teacher?.cvPath) return;
    const response = await fetch(`/api/admin/teachers/${id}/cv`);
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      toast.error(json.error ?? "Errore download CV");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = teacher.cvOriginalName || `cv_${id}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const removeCv = async () => {
    const response = await fetch(`/api/admin/teachers/${id}/cv`, {
      method: "DELETE",
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(json.error ?? "Errore rimozione CV");
      return;
    }
    toast.success("CV rimosso");
    await teacherQuery.refetch();
  };

  const saveUnavailability = async () => {
    if (!unavailabilityForm.date) {
      toast.error("Data non valida");
      return;
    }
    if (
      !unavailabilityForm.allDay &&
      (!unavailabilityForm.startTime || !unavailabilityForm.endTime)
    ) {
      toast.error("Inserisci ora inizio e ora fine");
      return;
    }
    if (
      !unavailabilityForm.allDay &&
      unavailabilityForm.startTime >= unavailabilityForm.endTime
    ) {
      toast.error("L'ora fine deve essere successiva all'ora inizio");
      return;
    }

    setUnavailabilitySaving(true);
    try {
      const response = await fetch(`/api/admin/teachers/${id}/unavailability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: unavailabilityForm.date,
          allDay: unavailabilityForm.allDay,
          startTime: unavailabilityForm.allDay ? null : unavailabilityForm.startTime,
          endTime: unavailabilityForm.allDay ? null : unavailabilityForm.endTime,
          reason: unavailabilityForm.reason.trim() || null,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(json.error ?? "Errore salvataggio indisponibilita");
        return;
      }
      toast.success("Indisponibilita aggiunta");
      setUnavailabilityModalOpen(false);
      setSelectedDayKey(unavailabilityForm.date);
      await Promise.all([calendarQuery.refetch(), teacherQuery.refetch()]);
    } catch (error) {
      console.error("[TEACHER_UNAVAILABILITY_SAVE] Error:", error);
      toast.error("Errore salvataggio indisponibilita");
    } finally {
      setUnavailabilitySaving(false);
    }
  };

  const deleteUnavailability = async (unavailabilityId: string) => {
    const response = await fetch(
      `/api/admin/teachers/${id}/unavailability?id=${unavailabilityId}`,
      { method: "DELETE" }
    );
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(json.error ?? "Errore rimozione indisponibilita");
      return;
    }
    toast.success("Indisponibilita rimossa");
    await Promise.all([calendarQuery.refetch(), teacherQuery.refetch()]);
  };

  if (teacherQuery.isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Caricamento docente...
      </div>
    );
  }

  if (teacherQuery.isError || !teacher) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-red-600">
        Errore caricamento docente.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/docenti" className="text-sm text-primary">
            &larr; Torna ai docenti
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold">
            <GraduationCap className="h-5 w-5" />
            {teacher.firstName} {teacher.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestisci anagrafica, CV e calendario disponibilita.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center rounded-md border px-3 py-2 text-sm"
          onClick={() => setEditModalOpen(true)}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Modifica
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">Scheda docente</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd>{teacher.email || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Telefono</dt>
                <dd>{teacher.phone || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Specializzazione</dt>
                <dd>{teacher.specialization || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Aree</dt>
                <dd>
                  {teacher.categories && teacher.categories.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {teacher.categories.map((category) => (
                        <span
                          key={category.id}
                          className="rounded-full px-2 py-0.5 text-[11px] text-white"
                          style={{ backgroundColor: category.color ?? "#6B7280" }}
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Bio</dt>
                <dd>{teacher.bio || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Note</dt>
                <dd>{teacher.notes || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Stato</dt>
                <dd>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      teacher.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {teacher.active ? "Attivo" : "Inattivo"}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">CV</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOC o DOCX - max 10MB.
            </p>
            <div
              className={`mt-3 rounded-lg border-2 border-dashed p-4 text-center ${
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void uploadCv(file);
              }}
            >
              <p className="text-xs text-muted-foreground">
                Trascina qui il CV o clicca su Carica CV
              </p>
            </div>
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">File:</span>{" "}
              {teacher.cvOriginalName || "-"}
            </p>
            <input
              ref={cvInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadCv(file);
                event.currentTarget.value = "";
              }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-h-[36px] items-center rounded-md border px-2 py-1 text-xs"
                onClick={() => cvInputRef.current?.click()}
                disabled={cvUploading}
              >
                {cvUploading ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    Upload...
                  </>
                ) : (
                  <>
                    <Upload className="mr-1 h-3.5 w-3.5" />
                    Carica CV
                  </>
                )}
              </button>
              <button
                type="button"
                className="inline-flex min-h-[36px] items-center rounded-md border px-2 py-1 text-xs"
                onClick={downloadCv}
                disabled={!teacher.cvPath}
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                Scarica CV
              </button>
              <button
                type="button"
                className="inline-flex min-h-[36px] items-center rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                onClick={removeCv}
                disabled={!teacher.cvPath}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Rimuovi CV
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4" />
                Calendario disponibilita
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-[36px] items-center rounded-md border px-2 py-1 text-xs"
                  onClick={() =>
                    setMonthCursor(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                    )
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[160px] text-center text-sm font-medium capitalize">
                  {monthLabel}
                </span>
                <button
                  type="button"
                  className="inline-flex min-h-[36px] items-center rounded-md border px-2 py-1 text-xs"
                  onClick={() =>
                    setMonthCursor(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-xs sm:grid-cols-7">
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                Libero
              </span>
              <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">
                Occupato
              </span>
              <span className="rounded-md bg-gray-100 px-2 py-1 text-gray-700">
                Indisponibile
              </span>
              <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">
                Parziale
              </span>
            </div>

            {calendarQuery.isLoading ? (
              <p className="mt-6 text-sm text-muted-foreground">Caricamento calendario...</p>
            ) : calendarQuery.isError ? (
              <p className="mt-6 text-sm text-red-600">Errore caricamento calendario.</p>
            ) : (
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
                  {WEEK_DAYS.map((label) => (
                    <div key={label}>{label}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {monthCells.map((cell, index) =>
                    cell ? (
                      <button
                        key={cell.key}
                        type="button"
                        className={dayClass(cell.data.status, selectedDayKey === cell.key)}
                        onClick={() => {
                          if (cell.data.status === "free") {
                            openUnavailabilityModal(cell.data.date);
                          } else {
                            setSelectedDayKey(cell.data.date);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{cell.day}</span>
                          {cell.data.assignments.length > 0 ? (
                            <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
                              {cell.data.assignments.length}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    ) : (
                      <div key={`empty-${index}`} />
                    )
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-lg border bg-background p-3 text-sm">
              {!selectedDay ? (
                <p className="text-muted-foreground">
                  Clicca su un giorno occupato/indisponibile per i dettagli.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium">{formatItalianDate(selectedDay.date)}</p>
                  {selectedDay.assignments.length > 0 ? (
                    <ul className="space-y-1 text-xs">
                      {selectedDay.assignments.map((assignment) => (
                        <li key={assignment.id}>
                          {assignment.lesson.courseEdition.course.title} - Ed. #
                          {assignment.lesson.courseEdition.editionNumber}
                          {" · "}
                          {assignment.lesson.startTime || "--:--"}
                          {assignment.lesson.endTime ? ` - ${assignment.lesson.endTime}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {selectedDay.unavailability ? (
                    <div className="rounded-md bg-muted p-2 text-xs">
                      <p>
                        {selectedDay.unavailability.allDay
                          ? "Tutto il giorno"
                          : `${selectedDay.unavailability.startTime || "--:--"} - ${
                              selectedDay.unavailability.endTime || "--:--"
                            }`}
                      </p>
                      <p>Motivo: {selectedDay.unavailability.reason || "-"}</p>
                      <button
                        type="button"
                        className="mt-2 inline-flex min-h-[34px] items-center rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                        onClick={() => deleteUnavailability(selectedDay.unavailability!.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Rimuovi indisponibilita
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Prossime lezioni assegnate</h2>
              <button
                type="button"
                className="inline-flex min-h-[34px] items-center rounded-md border px-2 py-1 text-xs"
                onClick={() => setShowAllLessons((prev) => !prev)}
              >
                {showAllLessons ? "Mostra solo future" : "Mostra tutte"}
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-lg border">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Orario</th>
                      <th className="px-3 py-2">Corso</th>
                      <th className="px-3 py-2">Edizione</th>
                      <th className="px-3 py-2">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAssignments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-6 text-center text-sm text-muted-foreground"
                        >
                          Nessuna lezione assegnata.
                        </td>
                      </tr>
                    ) : (
                      visibleAssignments.map((assignment) => (
                        <tr key={assignment.id} className="border-t">
                          <td className="px-3 py-2">
                            {formatItalianDate(assignment.lesson.date)}
                          </td>
                          <td className="px-3 py-2">
                            {assignment.lesson.startTime || "--:--"}
                            {assignment.lesson.endTime
                              ? ` - ${assignment.lesson.endTime}`
                              : ""}
                          </td>
                          <td className="px-3 py-2">
                            {assignment.lesson.courseEdition.course.title}
                          </td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/admin/corsi/${assignment.lesson.courseEdition.course.id}/edizioni/${assignment.lesson.courseEdition.id}`}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              Ed. #{assignment.lesson.courseEdition.editionNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-1 text-xs ${statusBadge(
                                assignment.lesson.courseEdition.status
                              )}`}
                            >
                              {statusLabel(assignment.lesson.courseEdition.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      <TeacherModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        teacher={teacher}
        title="Modifica docente"
        onSaved={async () => {
          await teacherQuery.refetch();
        }}
      />

      {unavailabilityModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border bg-card p-5 shadow-lg">
            <h3 className="text-base font-semibold">Aggiungi indisponibilita</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Imposta un impegno esterno per il docente.
            </p>
            <div className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-muted-foreground">Data</span>
                <input
                  type="date"
                  value={unavailabilityForm.date}
                  onChange={(event) =>
                    setUnavailabilityForm((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                  className="rounded-md border bg-background px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={unavailabilityForm.allDay}
                  onChange={(event) =>
                    setUnavailabilityForm((prev) => ({
                      ...prev,
                      allDay: event.target.checked,
                    }))
                  }
                />
                Tutto il giorno
              </label>
              {!unavailabilityForm.allDay ? (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="time"
                    value={unavailabilityForm.startTime}
                    onChange={(event) =>
                      setUnavailabilityForm((prev) => ({
                        ...prev,
                        startTime: event.target.value,
                      }))
                    }
                    className="rounded-md border bg-background px-3 py-2"
                  />
                  <input
                    type="time"
                    value={unavailabilityForm.endTime}
                    onChange={(event) =>
                      setUnavailabilityForm((prev) => ({
                        ...prev,
                        endTime: event.target.value,
                      }))
                    }
                    className="rounded-md border bg-background px-3 py-2"
                  />
                </div>
              ) : null}
              <input
                value={unavailabilityForm.reason}
                onChange={(event) =>
                  setUnavailabilityForm((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
                className="rounded-md border bg-background px-3 py-2"
                placeholder="Motivo (opzionale)"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() => setUnavailabilityModalOpen(false)}
                disabled={unavailabilitySaving}
              >
                Annulla
              </button>
              <button
                type="button"
                className="inline-flex min-h-[40px] items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                onClick={saveUnavailability}
                disabled={unavailabilitySaving}
              >
                {unavailabilitySaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  "Salva"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
