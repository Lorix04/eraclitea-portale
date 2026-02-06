"use client";

import { formatItalianDate } from "@/lib/date-utils";
import { Lesson } from "@/types";
import { Pencil, Trash2 } from "lucide-react";

type LessonWithCounts = Lesson & {
  attendanceCounts?: {
    present: number;
    absent: number;
    justified: number;
  };
};

interface LessonListProps {
  lessons: LessonWithCounts[];
  totalEmployees?: number;
  onEdit?: (lesson: LessonWithCounts) => void;
  onDelete?: (lessonId: string) => void;
  readonly?: boolean;
}

export function LessonList({
  lessons,
  totalEmployees = 0,
  onEdit,
  onDelete,
  readonly = false,
}: LessonListProps) {
  if (!lessons.length) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Nessuna lezione disponibile.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Orario</th>
            <th className="px-4 py-3">Durata</th>
            <th className="px-4 py-3">Argomento</th>
            <th className="px-4 py-3">Presenze</th>
            {!readonly ? <th className="px-4 py-3">Azioni</th> : null}
          </tr>
        </thead>
        <tbody>
          {lessons.map((lesson) => {
            const presentCount =
              (lesson.attendanceCounts?.present ?? 0) +
              (lesson.attendanceCounts?.justified ?? 0);
            const total =
              totalEmployees || lesson._count?.attendances || 0;
            return (
              <tr key={lesson.id} className="border-t">
                <td className="px-4 py-3">
                  {formatItalianDate(lesson.date)}
                </td>
                <td className="px-4 py-3">
                  {lesson.startTime || "-"}
                  {lesson.endTime ? ` - ${lesson.endTime}` : ""}
                </td>
                <td className="px-4 py-3">{lesson.durationHours}h</td>
                <td className="px-4 py-3">{lesson.title || "-"}</td>
                <td className="px-4 py-3">
                  {total ? `${presentCount}/${total}` : "-"}
                </td>
                {!readonly ? (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {onEdit ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-primary"
                          onClick={() => onEdit(lesson)}
                        >
                          <Pencil className="h-3 w-3" />
                          Modifica
                        </button>
                      ) : null}
                      {onDelete ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-destructive"
                          onClick={() => onDelete(lesson.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Elimina
                        </button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
