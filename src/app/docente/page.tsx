"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BookOpen, Calendar, Clock, GraduationCap, MapPin, Users } from "lucide-react";
import TeacherCalendar from "@/components/teacher/TeacherCalendar";
import { formatItalianDate } from "@/lib/date-utils";

type NextLesson = {
  id: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  durationHours: number;
  title?: string | null;
  location?: string | null;
  courseName: string;
  clientName: string;
  editionNumber: number;
};

type PendingAttendance = {
  lessonId: string;
  date: string;
  courseName: string;
};

type DashboardData = {
  upcomingLessons: number;
  totalLessons: number;
  totalHours: number;
  activeCourses: number;
  nextLessons: NextLesson[];
  pendingAttendances?: PendingAttendance[];
};

export default function TeacherDashboardPage() {
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calYear, setCalYear] = useState(now.getFullYear());

  const dashboardQuery = useQuery({
    queryKey: ["teacher-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/dashboard");
      if (!res.ok) throw new Error("Errore caricamento dashboard");
      return (await res.json()) as DashboardData;
    },
    staleTime: 30_000,
  });

  const calendarQuery = useQuery({
    queryKey: ["teacher-calendar", calMonth, calYear],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/calendar?month=${calMonth}&year=${calYear}`);
      if (!res.ok) throw new Error("Errore caricamento calendario");
      const json = await res.json();
      return json.days as any[];
    },
    staleTime: 30_000,
  });

  // Background sync portal teaching experience on dashboard load
  useEffect(() => {
    fetch("/api/teacher/cv/sync-portal-experience", { method: "POST" }).catch(() => {});
  }, []);

  const stats = dashboardQuery.data;
  const nextLessons = stats?.nextLessons ?? [];
  const pendingAttendances = stats?.pendingAttendances ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <GraduationCap className="h-5 w-5" />
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Panoramica delle tue attivita come docente.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          label="Lezioni prossime"
          value={stats?.upcomingLessons ?? 0}
          icon={Calendar}
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Lezioni totali"
          value={stats?.totalLessons ?? 0}
          icon={BookOpen}
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Ore totali"
          value={stats ? `${stats.totalHours}h` : "0h"}
          icon={Clock}
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Corsi attivi"
          value={stats?.activeCourses ?? 0}
          icon={Users}
          loading={dashboardQuery.isLoading}
        />
      </div>

      {/* Pending attendances widget */}
      {pendingAttendances.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2">
            <AlertCircle className="h-4 w-4" />
            Presenze da registrare
          </h2>
          <p className="text-xs text-amber-700 mb-3">
            Hai {pendingAttendances.length} {pendingAttendances.length === 1 ? "lezione" : "lezioni"} con presenze non registrate:
          </p>
          <ul className="space-y-1.5">
            {pendingAttendances.map((pa) => (
              <li key={pa.lessonId}>
                <Link
                  href={`/docente/lezioni/${pa.lessonId}`}
                  className="text-xs text-amber-800 hover:underline"
                >
                  {formatItalianDate(pa.date)} — {pa.courseName} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Calendar + Next lessons */}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <TeacherCalendar
          days={calendarQuery.data ?? []}
          month={calMonth}
          year={calYear}
          onMonthChange={(m, y) => {
            setCalMonth(m);
            setCalYear(y);
          }}
          loading={calendarQuery.isLoading}
        />

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4" />
              Prossime lezioni
            </h2>
            <Link
              href="/docente/lezioni"
              className="text-xs text-primary hover:underline"
            >
              Vedi tutte →
            </Link>
          </div>

          {dashboardQuery.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Caricamento...</p>
          ) : nextLessons.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nessuna lezione programmata.
            </p>
          ) : (
            <div className="space-y-2">
              {nextLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/docente/lezioni/${lesson.id}`}
                  className="block rounded-lg border p-3 text-xs transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="text-primary">
                      {formatItalianDate(lesson.date)}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span>
                      {lesson.startTime || "--:--"}-{lesson.endTime || "--:--"}
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-sm truncate">
                    {lesson.title || lesson.courseName}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {lesson.clientName}
                    </span>
                    {lesson.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {lesson.location}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  icon: any;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-bold">
        {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-muted" /> : value}
      </p>
    </div>
  );
}
