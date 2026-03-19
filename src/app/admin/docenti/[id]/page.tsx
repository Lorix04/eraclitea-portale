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
  FileText,
  GraduationCap,
  Loader2,
  LogIn,
  Mail,
  Pencil,
  Phone,
  Trash2,
  Upload,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import TeacherModal, { TeacherFormValue } from "@/components/admin/TeacherModal";
import { formatItalianDate } from "@/lib/date-utils";
import { useProvinceRegioni } from "@/hooks/useProvinceRegioni";

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
  userId?: string | null;
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

const STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  ACTIVE: { cls: "bg-emerald-100 text-emerald-700", label: "Attivo" },
  PENDING: { cls: "bg-amber-100 text-amber-700", label: "In attesa" },
  ONBOARDING: { cls: "bg-blue-100 text-blue-700", label: "In corso" },
  INACTIVE: { cls: "bg-gray-100 text-gray-700", label: "Non attivo" },
  SUSPENDED: { cls: "bg-red-100 text-red-700", label: "Sospeso" },
};

function TeacherStatusBadge({ status, active }: { status?: string; active?: boolean }) {
  const cfg = STATUS_CONFIG[status ?? ""] ?? (active ? STATUS_CONFIG.ACTIVE : STATUS_CONFIG.INACTIVE);
  return (
    <span className={`rounded-full px-2 py-1 text-xs ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {children}
      </dl>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value || "\u2014"}</dd>
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<"calendar" | "lessons" | "documents" | "details">("calendar");
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const cvInputRef = useRef<HTMLInputElement | null>(null);
  const { province: provinceOptions } = useProvinceRegioni();

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
  const provinceLabelBySigla = useMemo(() => {
    const map = new Map<string, string>();
    provinceOptions.forEach((item) => {
      map.set(item.sigla.toUpperCase(), item.nome);
    });
    return map;
  }, [provinceOptions]);

  const formattedProvince = useMemo(() => {
    if (!teacher?.province) return "-";
    const sigla = teacher.province.toUpperCase();
    const name = provinceLabelBySigla.get(sigla);
    return name ? `${sigla} - ${name}` : sigla;
  }, [provinceLabelBySigla, teacher?.province]);
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

  const downloadIdDocument = async () => {
    if (!(teacher as any).idDocumentPath) return;
    const response = await fetch(`/api/admin/teachers/${id}/id-document`);
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      toast.error(json.error ?? "Errore download documento");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = (teacher as any).idDocumentName || `id_document_${id}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const removeIdDocument = async () => {
    const response = await fetch(`/api/admin/teachers/${id}/id-document`, {
      method: "DELETE",
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(json.error ?? "Errore rimozione documento");
      return;
    }
    toast.success("Documento d'identita rimosso");
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

  const performStatusAction = async (endpoint: string, successMessage: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/teachers/${id}/${endpoint}`, {
        method: "POST",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(json.error ?? "Errore nell'operazione");
        return;
      }
      toast.success(successMessage);
      setConfirmSuspend(false);
      await teacherQuery.refetch();
    } catch (error) {
      console.error("[TEACHER_STATUS_ACTION] Error:", error);
      toast.error("Errore nell'operazione");
    } finally {
      setActionLoading(false);
    }
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

  const teacherStatus = (teacher as any).status as string | undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <Link href="/admin/docenti" className="text-xs text-primary md:text-sm">
            &larr; Torna ai docenti
          </Link>
          <h1 className="mt-1 flex items-center gap-2 break-words text-lg font-semibold md:mt-2 md:text-xl">
            <GraduationCap className="h-5 w-5 shrink-0" />
            {teacher.firstName} {teacher.lastName}
          </h1>
          <p className="text-xs text-muted-foreground md:text-sm">
            Gestisci anagrafica, CV e calendario disponibilita.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        {/* LEFT SIDEBAR - Compact profile card */}
        <div className="space-y-4">
          <section className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {teacher.firstName?.[0]?.toUpperCase()}{teacher.lastName?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate">{teacher.firstName} {teacher.lastName}</h2>
                <TeacherStatusBadge status={teacherStatus} active={teacher.active} />
              </div>
            </div>

            {teacherStatus === "PENDING" && (teacher as any).inviteSentAt && (
              <p className="mb-3 text-xs text-muted-foreground">
                Invito inviato il {formatItalianDate(new Date((teacher as any).inviteSentAt))}
              </p>
            )}
            {teacherStatus === "ONBOARDING" && (
              <p className="mb-3 text-xs text-blue-600">
                In attesa di firma documento
              </p>
            )}

            <dl className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <dd className="truncate">{teacher.email || "-"}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <dd>{teacher.phone || "-"}</dd>
              </div>
              {(teacher as any).mobile && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <dd>{(teacher as any).mobile}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Provincia</dt>
                <dd>{formattedProvince}</dd>
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
            </dl>

            {/* Action buttons */}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                className="inline-flex min-h-[36px] w-full items-center justify-center rounded-md border px-3 py-1.5 text-xs"
                onClick={() => setEditModalOpen(true)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Modifica
              </button>

              {teacherStatus === "ACTIVE" && teacher.userId && (
                <button
                  type="button"
                  className="inline-flex min-h-[36px] w-full items-center justify-center rounded-md bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-600"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/admin/impersonate-teacher", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ teacherId: teacher.id }),
                      });
                      const payload = await res.json().catch(() => ({}));
                      if (res.ok) {
                        window.location.href = payload?.redirectTo || "/docente";
                      } else {
                        toast.error(payload?.error ?? "Errore");
                      }
                    } catch { toast.error("Errore di connessione"); }
                  }}
                >
                  <LogIn className="mr-1.5 h-3.5 w-3.5" />
                  Accedi come docente
                </button>
              )}

              {teacherStatus === "INACTIVE" && (
                <button
                  type="button"
                  className="inline-flex min-h-[36px] w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
                  onClick={() => performStatusAction("invite", "Invito inviato")}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Mail className="mr-1.5 h-3.5 w-3.5" />}
                  Invia invito
                </button>
              )}

              {teacherStatus === "PENDING" && (
                <>
                  <button
                    type="button"
                    className="inline-flex min-h-[36px] w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
                    onClick={() => performStatusAction("invite", "Invito reinviato")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Mail className="mr-1.5 h-3.5 w-3.5" />}
                    Reinvia invito
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-[36px] w-full items-center justify-center rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700"
                    onClick={() => performStatusAction("cancel-invite", "Invito annullato")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <XCircle className="mr-1.5 h-3.5 w-3.5" />}
                    Annulla invito
                  </button>
                </>
              )}

              {teacherStatus === "ONBOARDING" && (
                <button
                  type="button"
                  className="inline-flex min-h-[36px] w-full items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white"
                  onClick={() => performStatusAction("remind", "Sollecito inviato")}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Mail className="mr-1.5 h-3.5 w-3.5" />}
                  Sollecita completamento
                </button>
              )}

              {teacherStatus === "ACTIVE" && (
                <>
                  {!confirmSuspend ? (
                    <button
                      type="button"
                      className="inline-flex min-h-[36px] w-full items-center justify-center rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700"
                      onClick={() => setConfirmSuspend(true)}
                      disabled={actionLoading}
                    >
                      <UserX className="mr-1.5 h-3.5 w-3.5" />
                      Sospendi
                    </button>
                  ) : (
                    <div className="rounded-md border border-red-200 bg-red-50 p-2">
                      <p className="text-xs text-red-700 mb-2">Confermi la sospensione del docente?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="inline-flex min-h-[30px] flex-1 items-center justify-center rounded-md bg-red-600 px-2 py-1 text-xs text-white"
                          onClick={() => performStatusAction("suspend", "Docente sospeso")}
                          disabled={actionLoading}
                        >
                          {actionLoading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                          Conferma
                        </button>
                        <button
                          type="button"
                          className="inline-flex min-h-[30px] flex-1 items-center justify-center rounded-md border px-2 py-1 text-xs"
                          onClick={() => setConfirmSuspend(false)}
                          disabled={actionLoading}
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {teacherStatus === "SUSPENDED" && (
                <button
                  type="button"
                  className="inline-flex min-h-[36px] w-full items-center justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs text-white"
                  onClick={() => performStatusAction("reactivate", "Docente riattivato")}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <UserCheck className="mr-1.5 h-3.5 w-3.5" />}
                  Riattiva
                </button>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT CONTENT - Tabs */}
        <div className="space-y-0">
          {/* Tab bar */}
          <div className="flex border-b mb-4">
            {(["calendar", "lessons", "documents", "details"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setActiveTab(t)}
                className={`px-4 py-2 text-sm border-b-2 transition-colors ${activeTab === t ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {t === "calendar" ? "Calendario" : t === "lessons" ? "Lezioni" : t === "documents" ? "Documenti" : "Dettagli"}
              </button>
            ))}
          </div>

          {/* Tab: Calendario */}
          {activeTab === "calendar" && (
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
          )}

          {/* Tab: Lezioni */}
          {activeTab === "lessons" && (
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
          )}

          {/* Tab: Documenti */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              {/* CV section */}
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

              {/* ID Document section */}
              <section className="rounded-lg border bg-card p-4">
                <h2 className="text-sm font-semibold mb-3">Documento d&apos;identita</h2>
                {(teacher as any).idDocumentName ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{(teacher as any).idDocumentName}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex min-h-[36px] items-center rounded-md border px-2 py-1 text-xs"
                        onClick={downloadIdDocument}
                      >
                        <Download className="mr-1 h-3.5 w-3.5" />
                        Scarica
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-[36px] items-center rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                        onClick={removeIdDocument}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Rimuovi
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed bg-gray-50 p-4 text-center text-sm text-muted-foreground">
                    Nessun documento d&apos;identita caricato.
                  </div>
                )}
              </section>

              {/* Signed documents */}
              <section className="rounded-lg border bg-card p-4">
                <h2 className="text-sm font-semibold mb-3">Documenti firmati</h2>
                {(teacher as any).signedDocuments?.length > 0 ? (
                  <div className="space-y-3">
                    {((teacher as any).signedDocuments as Array<{
                      id: string;
                      documentType: string;
                      declaration1: boolean;
                      declaration2: boolean;
                      declaration3: boolean;
                      declaration4: boolean;
                      declaration5: boolean;
                      signedAt: string | null;
                      signedFromIp: string | null;
                      pdfPath: string | null;
                    }>).map((doc) => (
                      <div
                        key={doc.id}
                        className="rounded-lg border bg-gray-50 p-3 text-sm"
                      >
                        <p className="font-medium">
                          {doc.documentType === "ATTO_NOTORIETA"
                            ? "Atto di Notorieta"
                            : doc.documentType}
                        </p>
                        {doc.signedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Firmato il {formatItalianDate(new Date(doc.signedAt))}
                            {doc.signedFromIp
                              ? ` da IP: ${doc.signedFromIp}`
                              : ""}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                          Dichiarazioni:{" "}
                          {[doc.declaration1, doc.declaration2, doc.declaration3, doc.declaration4, doc.declaration5].map(
                            (checked, i) => (
                              <span key={i}>{checked ? "\u2611" : "\u2610"}{i + 1}</span>
                            )
                          )}
                        </div>
                        {doc.pdfPath && (
                          <a
                            href={`/api/teacher/documents/${doc.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-primary hover:bg-gray-100"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Scarica PDF
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed bg-gray-50 p-4 text-center text-sm text-muted-foreground">
                    Nessun documento firmato.
                    {teacherStatus === "ONBOARDING" && (
                      <p className="mt-1 text-xs">In attesa di firma</p>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Tab: Dettagli */}
          {activeTab === "details" && (
            <div className="space-y-6">
              <DetailSection title="Dati personali">
                <DetailItem
                  label="Data di nascita"
                  value={(teacher as any).birthDate ? formatItalianDate(new Date((teacher as any).birthDate)) : null}
                />
                <DetailItem
                  label="Comune di nascita"
                  value={
                    (teacher as any).birthPlace
                      ? `${(teacher as any).birthPlace}${(teacher as any).birthProvince ? ` (${(teacher as any).birthProvince})` : ""}`
                      : null
                  }
                />
                <DetailItem
                  label="Genere"
                  value={(teacher as any).gender === "M" ? "Uomo" : (teacher as any).gender === "F" ? "Donna" : (teacher as any).gender}
                />
                <DetailItem label="Codice Fiscale" value={(teacher as any).fiscalCode} />
              </DetailSection>

              <DetailSection title="Residenza">
                <DetailItem label="Indirizzo" value={(teacher as any).address} />
                <DetailItem
                  label="Comune"
                  value={
                    (teacher as any).city
                      ? `${(teacher as any).city}${teacher.province ? ` (${teacher.province})` : ""}`
                      : null
                  }
                />
                <DetailItem label="CAP" value={(teacher as any).postalCode} />
                <DetailItem label="Regione" value={teacher.region} />
              </DetailSection>

              <DetailSection title="Contatti">
                <DetailItem label="Telefono" value={teacher.phone} />
                <DetailItem label="Cellulare" value={(teacher as any).mobile} />
                <DetailItem label="Fax" value={(teacher as any).fax} />
                <DetailItem label="Email" value={teacher.email} />
                <DetailItem label="Email secondaria" value={(teacher as any).emailSecondary} />
                <DetailItem label="PEC" value={(teacher as any).pec} />
              </DetailSection>

              <DetailSection title="Dati professionali">
                <DetailItem label="Specializzazione" value={teacher.specialization} />
                <DetailItem label="Professione" value={(teacher as any).profession} />
                <DetailItem label="Titolo di studio" value={(teacher as any).educationLevel} />
                <DetailItem label="Datore di lavoro" value={(teacher as any).employerName} />
                <DetailItem label="P.IVA" value={(teacher as any).vatNumber} />
                <DetailItem label="IBAN" value={(teacher as any).iban} />
                <DetailItem label="Esente IVA" value={(teacher as any).vatExempt ? "Si" : "No"} />
                <DetailItem
                  label="Dipendente pubblico"
                  value={(teacher as any).publicEmployee != null ? ((teacher as any).publicEmployee ? "Si" : "No") : null}
                />
                <DetailItem label="Codice Destinatario" value={(teacher as any).sdiCode} />
                <DetailItem label="Matricola" value={(teacher as any).registrationNumber} />
              </DetailSection>

              <DetailSection title="Altro">
                <DetailItem label="Bio" value={teacher.bio} />
                <DetailItem label="Note" value={teacher.notes} />
              </DetailSection>
            </div>
          )}
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
        <div className="fixed inset-0 z-50 bg-black/50 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="modal-panel border bg-card shadow-lg sm:max-w-md">
            <div className="modal-header">
              <h3 className="text-base font-semibold">Aggiungi indisponibilit\u00e0</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Imposta un impegno esterno per il docente.
              </p>
            </div>
            <div className="modal-body modal-scroll space-y-3">
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <div className="modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
