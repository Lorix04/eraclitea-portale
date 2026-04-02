"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, MapPin, Search, Users } from "lucide-react";
import { formatItalianDate } from "@/lib/date-utils";
import MobileFilterPanel from "@/components/ui/MobileFilterPanel";

type LessonItem = {
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
  editionId: string;
  participantsCount: number;
  attendanceRecorded?: boolean;
  attendanceCount?: number;
};

type PeriodFilter = "upcoming" | "past" | "all";

export default function TeacherLessonsPage() {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [courseFilter, setCourseFilter] = useState("");
  const [search, setSearch] = useState("");

  const lessonsQuery = useQuery({
    queryKey: ["teacher-lessons", period, courseFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("period", period);
      if (courseFilter) params.set("courseId", courseFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/teacher/lessons?${params}`);
      if (!res.ok) throw new Error("Errore caricamento lezioni");
      const json = await res.json();
      return (json.data ?? []) as LessonItem[];
    },
    staleTime: 20_000,
  });

  const lessons = useMemo(() => lessonsQuery.data ?? [], [lessonsQuery.data]);

  // Extract unique courses for filter dropdown
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of lessons) {
      if (!map.has(l.courseName)) map.set(l.courseName, l.courseName);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "it"));
  }, [lessons]);

  const resetFilters = () => {
    setPeriod("all");
    setCourseFilter("");
    setSearch("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <BookOpen className="h-5 w-5" />
          Le mie Lezioni
        </h1>
        <p className="text-sm text-muted-foreground">
          Tutte le lezioni a te assegnate.
        </p>
      </div>

      <MobileFilterPanel
        searchBar={
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca corso, luogo, cliente..."
              className="min-h-[44px] w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>
        }
        activeFiltersCount={
          [period !== "all", courseFilter !== ""].filter(Boolean).length
        }
        onReset={resetFilters}
        resultCount={<>{lessons.length} lezioni</>}
      >
        <div className="space-y-3 md:space-y-0 md:flex md:flex-wrap md:items-end md:gap-3">
          <select
            className="w-full md:w-auto min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
          >
            <option value="upcoming">Prossime</option>
            <option value="past">Passate</option>
            <option value="all">Tutte</option>
          </select>

          <select
            className="w-full md:w-auto min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="">Tutti i corsi</option>
            {courseOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </MobileFilterPanel>

      {lessonsQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Nessuna lezione trovata.
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/docente/lezioni/${lesson.id}`}
              className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-primary">
                      {formatItalianDate(lesson.date)}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {lesson.startTime || "--:--"}-{lesson.endTime || "--:--"} ({lesson.durationHours}h)
                    </span>
                  </div>
                  <p className="text-sm font-semibold">
                    {lesson.title || lesson.courseName}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {lesson.clientName} · Ed. #{lesson.editionNumber}
                    </span>
                    {lesson.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {lesson.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {lesson.participantsCount} partecipanti
                    </span>
                    {new Date(lesson.date) <= new Date() && (
                      lesson.attendanceRecorded ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          ✓ Presenze: {lesson.attendanceCount}/{lesson.participantsCount}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          ⚠ Presenze non registrate
                        </span>
                      )
                    )}
                  </div>
                </div>
                <span className="text-xs text-primary font-medium">Dettaglio →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
