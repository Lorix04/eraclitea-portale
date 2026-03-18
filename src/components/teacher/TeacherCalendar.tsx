"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, Clock, Users, BookOpen } from "lucide-react";
import { formatItalianDate } from "@/lib/date-utils";

type CalendarLesson = {
  id: string;
  assignmentId: string;
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
};

type CalendarDay = {
  date: string;
  status: "busy" | "unavailable" | "partial" | "free";
  assignments: Array<{
    lesson: {
      id: string;
      date: string;
      startTime?: string | null;
      endTime?: string | null;
      durationHours: number;
      title?: string | null;
      luogo?: string | null;
      courseEdition: {
        id: string;
        editionNumber: number;
        course: { id: string; title: string };
        client: { id: string; ragioneSociale: string };
      };
    };
  }>;
  unavailability: {
    reason?: string | null;
    allDay: boolean;
    startTime?: string | null;
    endTime?: string | null;
  } | null;
};

type TeacherCalendarProps = {
  days: CalendarDay[];
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
  onDayClick?: (date: string, status: string) => void;
  loading?: boolean;
};

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function TeacherCalendar({
  days,
  month,
  year,
  onMonthChange,
  onDayClick,
  loading,
}: TeacherCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthLabel = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  }, [month, year]);

  const dayMap = useMemo(() => {
    const m = new Map<string, CalendarDay>();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  const cells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    let startDow = firstDay.getDay();
    if (startDow === 0) startDow = 7; // Mon=1
    const daysInMonth = new Date(year, month, 0).getDate();

    const result: Array<{ day: number; key: string } | null> = [];
    for (let i = 1; i < startDow; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      result.push({ day: d, key });
    }
    return result;
  }, [month, year]);

  const selectedDay = selectedDate ? dayMap.get(selectedDate) : null;
  const today = todayKey();

  const prevMonth = () => {
    if (month === 1) onMonthChange(12, year - 1);
    else onMonthChange(month - 1, year);
  };
  const nextMonth = () => {
    if (month === 12) onMonthChange(1, year + 1);
    else onMonthChange(month + 1, year);
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={prevMonth} className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm hover:bg-muted">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold capitalize">{monthLabel}</span>
        <button type="button" onClick={nextMonth} className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm hover:bg-muted">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Lezione</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-gray-400" /> Indisponibile</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" /> Parziale</span>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Caricamento...</p>
      ) : (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEK_DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) =>
              cell ? (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    const d = dayMap.get(cell.key);
                    const status = d?.status ?? "free";
                    if (d && status !== "free") setSelectedDate(cell.key);
                    else setSelectedDate(null);
                    onDayClick?.(cell.key, status);
                  }}
                  className={`relative flex flex-col items-center justify-center rounded-lg p-1 text-xs transition-colors min-h-[36px] ${
                    selectedDate === cell.key
                      ? "ring-2 ring-primary bg-primary/5"
                      : cell.key === today
                        ? "ring-1 ring-amber-400"
                        : "hover:bg-muted"
                  }`}
                >
                  <span className="font-medium">{cell.day}</span>
                  {(() => {
                    const d = dayMap.get(cell.key);
                    if (!d || d.status === "free") return null;
                    const color =
                      d.status === "busy" ? "bg-amber-400" :
                      d.status === "unavailable" ? "bg-gray-400" :
                      "bg-blue-400";
                    return <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${color}`} />;
                  })()}
                </button>
              ) : (
                <div key={`empty-${i}`} />
              )
            )}
          </div>
        </>
      )}

      {/* Selected day detail */}
      {selectedDay && (
        <div className="mt-4 rounded-lg border bg-background p-3 space-y-2">
          <p className="text-sm font-semibold">{formatItalianDate(selectedDay.date)}</p>

          {selectedDay.assignments.map((a, i) => (
            <div key={i} className="rounded-md bg-amber-50 p-2.5 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-amber-800">
                <BookOpen className="h-3.5 w-3.5" />
                {a.lesson.title || a.lesson.courseEdition.course.title}
              </div>
              <div className="flex items-center gap-1.5 text-amber-700">
                <Clock className="h-3 w-3" />
                {a.lesson.startTime || "--:--"} - {a.lesson.endTime || "--:--"} ({a.lesson.durationHours}h)
              </div>
              {a.lesson.luogo && (
                <div className="flex items-center gap-1.5 text-amber-700">
                  <MapPin className="h-3 w-3" />
                  {a.lesson.luogo}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-amber-700">
                <Users className="h-3 w-3" />
                {a.lesson.courseEdition.client.ragioneSociale} · Ed. #{a.lesson.courseEdition.editionNumber}
              </div>
              <Link
                href={`/docente/lezioni/${a.lesson.id}`}
                className="mt-1 inline-flex items-center text-xs font-medium text-primary hover:underline"
              >
                Vai alla lezione →
              </Link>
            </div>
          ))}

          {selectedDay.unavailability && (
            <div className="rounded-md bg-gray-100 p-2.5 text-xs text-gray-700">
              <p className="font-medium">Indisponibile</p>
              <p>
                {selectedDay.unavailability.allDay
                  ? "Tutto il giorno"
                  : `${selectedDay.unavailability.startTime || "--:--"} - ${selectedDay.unavailability.endTime || "--:--"}`}
              </p>
              {selectedDay.unavailability.reason && (
                <p className="mt-0.5 text-gray-500">Motivo: {selectedDay.unavailability.reason}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
