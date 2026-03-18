"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Building2, Calendar, Clock, MapPin, Users } from "lucide-react";
import { formatItalianDate } from "@/lib/date-utils";
import TeacherAttendance from "@/components/teacher/TeacherAttendance";

type AttendanceStatus = "PRESENT" | "ABSENT" | "ABSENT_JUSTIFIED";

type Participant = {
  employeeId: string;
  nome: string;
  cognome: string;
  attendance?: { status: AttendanceStatus; hoursAttended?: number | null; notes?: string | null } | null;
};

type LessonDetail = {
  id: string;
  lesson: {
    id: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    durationHours: number;
    title?: string | null;
    luogo?: string | null;
    notes?: string | null;
    courseEdition: {
      id: string;
      editionNumber: number;
      course: { id: string; title: string };
      client: { id: string; ragioneSociale: string };
      registrations: Array<{
        employee: { id: string; nome: string; cognome: string };
      }>;
    };
    attendances: Array<{
      employeeId: string;
      status: AttendanceStatus;
      hoursAttended?: number | null;
      notes?: string | null;
    }>;
  };
};

const STATUS_LABELS: Record<AttendanceStatus, { label: string; cls: string }> = {
  PRESENT: { label: "Presente", cls: "bg-emerald-100 text-emerald-700" },
  ABSENT: { label: "Assente", cls: "bg-red-100 text-red-700" },
  ABSENT_JUSTIFIED: { label: "Assente giust.", cls: "bg-amber-100 text-amber-700" },
};

export default function TeacherLessonDetailPage() {
  const params = useParams();
  const lessonId = params.id as string;
  const [activeTab, setActiveTab] = useState<"info" | "attendance">("info");

  const query = useQuery({
    queryKey: ["teacher-lesson-detail", lessonId],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/lessons/${lessonId}`);
      if (!res.ok) throw new Error("Errore caricamento lezione");
      const json = await res.json();
      return json.data as LessonDetail;
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Link href="/docente/lezioni" className="text-xs text-primary">← Torna alle lezioni</Link>
        <div className="h-40 animate-pulse rounded-lg border bg-muted" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-4">
        <Link href="/docente/lezioni" className="text-xs text-primary">← Torna alle lezioni</Link>
        <div className="rounded-lg border bg-card p-6 text-sm text-red-600">
          Errore caricamento lezione.
        </div>
      </div>
    );
  }

  const { lesson } = query.data;
  const ce = lesson.courseEdition;
  const attendanceMap = new Map(lesson.attendances.map((a) => [a.employeeId, a]));

  const participants: Participant[] = ce.registrations.map((r) => ({
    employeeId: r.employee.id,
    nome: r.employee.nome,
    cognome: r.employee.cognome,
    attendance: attendanceMap.get(r.employee.id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <Link href="/docente/lezioni" className="text-xs text-primary md:text-sm">
        ← Torna alle lezioni
      </Link>

      <div>
        <h1 className="text-lg font-semibold md:text-xl">
          {lesson.title || ce.course.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatItalianDate(lesson.date)} · {lesson.startTime || "--:--"} - {lesson.endTime || "--:--"} ({lesson.durationHours}h)
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button type="button" onClick={() => setActiveTab("info")}
          className={`px-4 py-2 text-sm border-b-2 transition-colors ${activeTab === "info" ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >Informazioni</button>
        <button type="button" onClick={() => setActiveTab("attendance")}
          className={`px-4 py-2 text-sm border-b-2 transition-colors ${activeTab === "attendance" ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >Presenze</button>
      </div>

      {activeTab === "attendance" && (
        <TeacherAttendance
          lessonId={lesson.id}
          durationHours={lesson.durationHours}
          canEdit={new Date(lesson.date).setHours(23, 59, 59) <= Date.now() || new Date(lesson.date).toDateString() === new Date().toDateString()}
        />
      )}

      {activeTab === "info" && (
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Info card */}
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Informazioni</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div>
                <dt className="text-xs text-muted-foreground">Corso</dt>
                <dd>{ce.course.title}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div>
                <dt className="text-xs text-muted-foreground">Edizione</dt>
                <dd>#{ce.editionNumber}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div>
                <dt className="text-xs text-muted-foreground">Cliente</dt>
                <dd>{ce.client.ragioneSociale}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div>
                <dt className="text-xs text-muted-foreground">Durata</dt>
                <dd>{lesson.durationHours}h</dd>
              </div>
            </div>
            {lesson.luogo && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                <div>
                  <dt className="text-xs text-muted-foreground">Luogo</dt>
                  <dd>{lesson.luogo}</dd>
                </div>
              </div>
            )}
            {lesson.notes && (
              <div>
                <dt className="text-xs text-muted-foreground">Note</dt>
                <dd className="mt-0.5 text-xs">{lesson.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Participants table */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4" />
              Partecipanti ({participants.length})
            </h2>
          </div>

          {participants.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nessun partecipante iscritto.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2">Dipendente</th>
                    <th className="px-3 py-2">Stato</th>
                    <th className="px-3 py-2 hidden sm:table-cell">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => {
                    const att = p.attendance;
                    const statusInfo = att ? STATUS_LABELS[att.status] : null;
                    return (
                      <tr key={p.employeeId} className="border-t">
                        <td className="px-3 py-2">
                          {p.cognome} {p.nome}
                        </td>
                        <td className="px-3 py-2">
                          {statusInfo ? (
                            <span className={`rounded-full px-2 py-0.5 text-xs ${statusInfo.cls}`}>
                              {statusInfo.label}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/D</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">
                          {att?.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
