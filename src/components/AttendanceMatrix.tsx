"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Plus, Users } from "lucide-react";
import { AttendanceStatus } from "@/types";
import { formatItalianDate } from "@/lib/date-utils";
import { AttendanceCell } from "@/components/AttendanceCell";
import { AttendanceNoteModal } from "@/components/AttendanceNoteModal";

type AttendanceEntry = {
  lessonId: string;
  employeeId: string;
  status: AttendanceStatus;
  notes?: string | null;
};

type AttendanceStat = {
  employeeId: string;
  employeeName: string;
  totalLessons: number;
  present: number;
  absent: number;
  justified: number;
  percentage: number;
  totalHours: number;
  attendedHours: number;
  belowMinimum: boolean;
};

interface AttendanceMatrixProps {
  courseEditionId: string;
  lessons: Array<{
    id: string;
    date: string | Date;
    startTime?: string | null;
    endTime?: string | null;
    durationHours: number;
    title?: string | null;
  }>;
  employees: Array<{
    id: string;
    nome: string;
    cognome: string;
    codiceFiscale?: string;
  }>;
  attendances: AttendanceEntry[];
  stats: AttendanceStat[];
  onUpdate?: (
    lessonId: string,
    employeeId: string,
    status: AttendanceStatus,
    notes?: string
  ) => void;
  readonly?: boolean;
  isAdmin?: boolean;
}

export function AttendanceMatrix({
  courseEditionId,
  lessons,
  employees,
  attendances,
  stats,
  onUpdate,
  readonly = false,
  isAdmin = false,
}: AttendanceMatrixProps) {
  const [noteState, setNoteState] = useState<{
    lessonId: string;
    employeeId: string;
    status: AttendanceStatus;
    notes?: string | null;
    employeeName: string;
    lessonDate: string;
  } | null>(null);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceEntry>();
    attendances.forEach((entry) => {
      map.set(`${entry.lessonId}:${entry.employeeId}`, entry);
    });
    return map;
  }, [attendances]);

  if (!lessons.length) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        <Calendar className="mx-auto mb-3 h-8 w-8 opacity-50" />
        <p className="font-medium text-foreground">Nessuna lezione disponibile</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Crea le lezioni per poter registrare le presenze.
        </p>
        {isAdmin ? (
          <Link
            href={`/admin/corsi/${courseEditionId}/lezioni`}
            className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Crea lezione
          </Link>
        ) : null}
      </div>
    );
  }

  if (!employees.length) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        <Users className="mx-auto mb-3 h-8 w-8 opacity-50" />
        <p className="font-medium text-foreground">Nessun dipendente registrato</p>
        <p className="mt-1 text-xs text-muted-foreground">
          I dipendenti devono essere inseriti nelle anagrafiche prima di poter registrare le
          presenze.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-auto rounded-lg border bg-card">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Dipendente</th>
              {lessons.map((lesson) => (
                <th key={lesson.id} className="px-2 py-3 text-center">
                  <div className="text-xs font-medium">
                    {formatItalianDate(lesson.date).slice(0, 5)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {lesson.durationHours}h
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-center">%</th>
              <th className="px-4 py-3 text-center">Ore</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const stat = stats.find((item) => item.employeeId === employee.id);
              return (
                <tr key={employee.id} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    {employee.cognome} {employee.nome}
                  </td>
                  {lessons.map((lesson) => {
                    const key = `${lesson.id}:${employee.id}`;
                    const entry = attendanceMap.get(key);
                    const cellStatus = entry?.status ?? (readonly ? null : "ABSENT");
                    const noteStatus: AttendanceStatus = entry?.status ?? "ABSENT";
                    const notes = entry?.notes ?? undefined;

                    return (
                      <td key={key} className="px-2 py-2">
                        <AttendanceCell
                          status={cellStatus}
                          notes={notes}
                          readonly={readonly}
                          onChange={(nextStatus) =>
                            onUpdate?.(lesson.id, employee.id, nextStatus, notes ?? undefined)
                          }
                          onOpenNotes={() =>
                            setNoteState({
                              lessonId: lesson.id,
                              employeeId: employee.id,
                              status: noteStatus,
                              notes,
                              employeeName: `${employee.cognome} ${employee.nome}`,
                              lessonDate: formatItalianDate(lesson.date),
                            })
                          }
                        />
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    {stat ? `${stat.percentage}%` : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {stat ? `${stat.attendedHours}/${stat.totalHours}` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {noteState ? (
        <AttendanceNoteModal
          isOpen
          employeeName={noteState.employeeName}
          lessonDate={noteState.lessonDate}
          currentStatus={noteState.status}
          currentNotes={noteState.notes ?? undefined}
          onClose={() => setNoteState(null)}
          onSave={(nextStatus, nextNotes) => {
            onUpdate?.(
              noteState.lessonId,
              noteState.employeeId,
              nextStatus,
              nextNotes
            );
            setNoteState(null);
          }}
        />
      ) : null}
    </>
  );
}
