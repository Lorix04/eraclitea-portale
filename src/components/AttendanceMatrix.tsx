"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCheck,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { AttendanceStatus } from "@/types";
import { formatItalianDate } from "@/lib/date-utils";
import {
  calculateAttendanceStats,
  formatPresenceRequirementLabel,
} from "@/lib/attendance-utils";
import { AttendanceCell } from "@/components/AttendanceCell";
import { AttendanceNoteModal } from "@/components/AttendanceNoteModal";
import { cn } from "@/lib/utils";

type AttendanceEntry = {
  lessonId: string;
  employeeId: string;
  status: AttendanceStatus;
  hoursAttended?: number | null;
  notes?: string | null;
};

interface AttendanceMatrixProps {
  courseEditionId: string;
  lessons: Array<{
    id: string;
    date: string | Date;
    startTime?: string | null;
    endTime?: string | null;
    durationHours: number;
    luogo?: string | null;
    title?: string | null;
  }>;
  employees: Array<{
    id: string;
    nome: string;
    cognome: string;
    codiceFiscale?: string;
  }>;
  attendances: AttendanceEntry[];
  onUpdate?: (
    lessonId: string,
    employeeId: string,
    status: AttendanceStatus,
    notes?: string,
    hoursAttended?: number | null
  ) => void;
  readonly?: boolean;
  isAdmin?: boolean;
  minRequirementType?: "percentage" | "days" | "hours" | null;
  minRequirementValue?: number | null;
  employeeFilter?: string;
  onEmployeeFilterChange?: (value: string) => void;
}

type ContextMenuState = {
  x: number;
  y: number;
  lessonId: string;
  employeeId: string;
};

type NoteModalState = {
  lessonId: string;
  employeeId: string;
  employeeName: string;
  lessonDate: string;
  lessonDurationHours: number;
  currentStatus: AttendanceStatus;
  currentHoursAttended?: number | null;
  currentNotes?: string;
};

type BulkActionState = {
  lessonId: string;
  status: AttendanceStatus;
};

function formatHours(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

export function AttendanceMatrix({
  courseEditionId,
  lessons,
  employees,
  attendances,
  onUpdate,
  readonly = false,
  isAdmin = false,
  minRequirementType = null,
  minRequirementValue = null,
  employeeFilter,
  onEmployeeFilterChange,
}: AttendanceMatrixProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [noteState, setNoteState] = useState<NoteModalState | null>(null);
  const [bulkAction, setBulkAction] = useState<BulkActionState | null>(null);

  const hasRequirement =
    (minRequirementType === "percentage" ||
      minRequirementType === "days" ||
      minRequirementType === "hours") &&
    typeof minRequirementValue === "number";
  const requirementLabel =
    formatPresenceRequirementLabel(minRequirementType, minRequirementValue) ?? null;

  const lessonMap = useMemo(() => {
    return new Map(lessons.map((lesson) => [lesson.id, lesson]));
  }, [lessons]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceEntry>();
    attendances.forEach((entry) => {
      map.set(`${entry.lessonId}:${entry.employeeId}`, entry);
    });
    return map;
  }, [attendances]);

  const localCalculation = useMemo(() => {
    return calculateAttendanceStats({
      employees: employees.map((employee) => ({
        id: employee.id,
        nome: employee.nome,
        cognome: employee.cognome,
      })),
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        durationHours: lesson.durationHours ?? 0,
      })),
      attendances: attendances.map((attendance) => ({
        lessonId: attendance.lessonId,
        employeeId: attendance.employeeId,
        status: attendance.status,
        hoursAttended: attendance.hoursAttended ?? null,
      })),
      presenzaMinimaType: minRequirementType,
      presenzaMinimaValue: minRequirementValue,
    });
  }, [attendances, employees, lessons, minRequirementType, minRequirementValue]);

  const statsByEmployee = useMemo(() => {
    return new Map(localCalculation.stats.map((stat) => [stat.employeeId, stat]));
  }, [localCalculation.stats]);

  const filteredEmployees = useMemo(() => {
    const activeFilter = employeeFilter ?? internalSearchTerm;
    const query = activeFilter.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((employee) => {
      const fullName = `${employee.cognome} ${employee.nome}`.toLowerCase();
      return fullName.includes(query);
    });
  }, [employeeFilter, employees, internalSearchTerm]);

  const showInternalFilter = !onEmployeeFilterChange;

  useEffect(() => {
    if (!contextMenu) return;

    const handleGlobalClick = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  const getEntry = (lessonId: string, employeeId: string) =>
    attendanceMap.get(`${lessonId}:${employeeId}`);

  const applyUpdate = (
    lessonId: string,
    employeeId: string,
    nextStatus: AttendanceStatus,
    explicitHours?: number | null,
    explicitNotes?: string
  ) => {
    if (readonly || !onUpdate) return;

    const lesson = lessonMap.get(lessonId);
    const currentEntry = getEntry(lessonId, employeeId);
    const durationHours = lesson?.durationHours ?? 0;
    const resolvedHours =
      nextStatus === "ABSENT"
        ? null
        : explicitHours !== undefined
          ? explicitHours
          : currentEntry?.hoursAttended ?? durationHours;

    onUpdate(
      lessonId,
      employeeId,
      nextStatus,
      explicitNotes ?? currentEntry?.notes ?? undefined,
      resolvedHours
    );
  };

  const handleToggleCell = (lessonId: string, employeeId: string) => {
    const entry = getEntry(lessonId, employeeId);
    const currentStatus = entry?.status ?? "ABSENT";
    const nextStatus: AttendanceStatus =
      currentStatus === "PRESENT" ? "ABSENT" : "PRESENT";
    applyUpdate(lessonId, employeeId, nextStatus);
  };

  const openContextMenu = (
    lessonId: string,
    employeeId: string,
    coordinates: { x: number; y: number }
  ) => {
    if (readonly) return;
    const maxMenuWidth = 280;
    const maxMenuHeight = 280;
    const x =
      typeof window !== "undefined"
        ? Math.min(coordinates.x, window.innerWidth - maxMenuWidth)
        : coordinates.x;
    const y =
      typeof window !== "undefined"
        ? Math.min(coordinates.y, window.innerHeight - maxMenuHeight)
        : coordinates.y;
    setContextMenu({ x, y, lessonId, employeeId });
  };

  const openNoteModalFromContext = (mode: "notes" | "hours") => {
    if (!contextMenu) return;
    const employee = employees.find((item) => item.id === contextMenu.employeeId);
    const lesson = lessonMap.get(contextMenu.lessonId);
    if (!employee || !lesson) return;

    const entry = getEntry(contextMenu.lessonId, contextMenu.employeeId);
    const currentStatus = entry?.status ?? "ABSENT";
    const fallbackStatus: AttendanceStatus =
      mode === "hours" && currentStatus === "ABSENT" ? "PRESENT" : currentStatus;

    setNoteState({
      lessonId: contextMenu.lessonId,
      employeeId: contextMenu.employeeId,
      employeeName: `${employee.cognome} ${employee.nome}`,
      lessonDate: formatItalianDate(lesson.date),
      lessonDurationHours: lesson.durationHours ?? 0,
      currentStatus: fallbackStatus,
      currentHoursAttended: entry?.hoursAttended ?? null,
      currentNotes: entry?.notes ?? "",
    });
    setContextMenu(null);
  };

  const handleBulkConfirm = () => {
    if (!bulkAction) return;
    employees.forEach((employee) => {
      applyUpdate(bulkAction.lessonId, employee.id, bulkAction.status);
    });
    setBulkAction(null);
  };

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
    <div className="space-y-3">
      <div
        className={cn(
          "flex items-center gap-3",
          showInternalFilter ? "justify-between" : "justify-end"
        )}
      >
        {showInternalFilter ? (
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={internalSearchTerm}
              onChange={(event) => setInternalSearchTerm(event.target.value)}
              placeholder="Cerca dipendente..."
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
              aria-label="Cerca dipendente"
            />
          </div>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {filteredEmployees.length}/{employees.length} visibili
        </span>
      </div>

      <div className="overflow-auto rounded-lg border bg-card">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="w-[260px] px-4 py-3">Dipendente</th>
              {lessons.map((lesson) => (
                <th key={lesson.id} className="w-[150px] px-2 py-3 text-center align-top">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold">
                      {formatItalianDate(lesson.date).slice(0, 5)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {lesson.durationHours}h
                    </div>
                    <div
                      className="mx-auto max-w-[130px] truncate text-[11px] text-muted-foreground"
                      title={lesson.title || lesson.luogo || "-"}
                    >
                      {lesson.title || lesson.luogo || "-"}
                    </div>
                    {!readonly ? (
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="rounded border border-emerald-300 bg-emerald-100 p-1 text-emerald-700 hover:bg-emerald-200"
                          title="Segna tutti presenti"
                          onClick={() =>
                            setBulkAction({ lessonId: lesson.id, status: "PRESENT" })
                          }
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded border border-red-300 bg-red-100 p-1 text-red-700 hover:bg-red-200"
                          title="Segna tutti assenti"
                          onClick={() =>
                            setBulkAction({ lessonId: lesson.id, status: "ABSENT" })
                          }
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </th>
              ))}
              <th className="w-[240px] px-4 py-3">Riepilogo</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td
                  colSpan={lessons.length + 2}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  Nessun dipendente trovato
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => {
                const stat = statsByEmployee.get(employee.id);
                const isBelow = Boolean(hasRequirement && stat?.belowMinimum);
                const rowTooltip =
                  isBelow && requirementLabel
                    ? `Sotto la soglia di presenza minima richiesta (${requirementLabel})`
                    : undefined;
                const progressValue = Math.max(
                  0,
                  Math.min(100, stat?.percentage ?? 0)
                );
                const progressClass =
                  stat?.totalLessons === 0
                    ? "bg-gray-400"
                    : isBelow
                      ? "bg-red-500"
                      : "bg-emerald-500";

                return (
                  <tr
                    key={employee.id}
                    className={cn("border-t", isBelow && "bg-red-50")}
                    title={rowTooltip}
                  >
                    <td
                      className={cn(
                        "px-4 py-3 font-medium",
                        isBelow && "text-red-700"
                      )}
                    >
                      {employee.cognome} {employee.nome}
                    </td>

                    {lessons.map((lesson) => {
                      const key = `${lesson.id}:${employee.id}`;
                      const entry = attendanceMap.get(key);
                      const cellStatus = entry?.status ?? null;

                      return (
                        <td key={key} className="px-2 py-2">
                          <AttendanceCell
                            status={cellStatus}
                            durationHours={lesson.durationHours ?? 0}
                            hoursAttended={entry?.hoursAttended ?? null}
                            notes={entry?.notes ?? undefined}
                            readonly={readonly}
                            onToggle={() => handleToggleCell(lesson.id, employee.id)}
                            onContextMenuRequest={(coordinates) =>
                              openContextMenu(lesson.id, employee.id, coordinates)
                            }
                          />
                        </td>
                      );
                    })}

                    <td className="px-4 py-3">
                      {stat ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium">
                            {formatHours(stat.attendedHours)}/{formatHours(stat.totalHours)}h (
                            {stat.percentage}%)
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-gray-200">
                              <div
                                className={cn("h-1.5 rounded-full", progressClass)}
                                style={{ width: `${progressValue}%` }}
                              />
                            </div>
                            {hasRequirement ? (
                              isBelow ? (
                                <X className="h-3.5 w-3.5 text-red-600" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-emerald-700">
            Presente
          </span>
          <span className="rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-amber-700">
            Presenza parziale
          </span>
          <span className="rounded border border-red-300 bg-red-100 px-2 py-0.5 text-red-700">
            Assente
          </span>
          <span className="rounded border border-blue-300 bg-blue-100 px-2 py-0.5 text-blue-700">
            Assente giustificato
          </span>
        </div>
        Click = Presente/Assente · Click destro (o long press su mobile) = Opzioni avanzate
      </div>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-[240px] rounded-md border bg-white p-1 shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(event) => event.stopPropagation()}
        >
          {(() => {
            const entry = getEntry(contextMenu.lessonId, contextMenu.employeeId);
            const hasNote = Boolean(entry?.notes?.trim());
            const notePreview = entry?.notes?.trim()?.slice(0, 60) ?? "";
            return (
              <>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    applyUpdate(
                      contextMenu.lessonId,
                      contextMenu.employeeId,
                      "PRESENT"
                    );
                    setContextMenu(null);
                  }}
                >
                  <Check className="h-4 w-4 text-emerald-600" />
                  Presente
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    applyUpdate(
                      contextMenu.lessonId,
                      contextMenu.employeeId,
                      "ABSENT"
                    );
                    setContextMenu(null);
                  }}
                >
                  <X className="h-4 w-4 text-red-600" />
                  Assente
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    applyUpdate(
                      contextMenu.lessonId,
                      contextMenu.employeeId,
                      "ABSENT_JUSTIFIED"
                    );
                    setContextMenu(null);
                  }}
                >
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Assente giustificato
                </button>
                <div className="my-1 border-t" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => openNoteModalFromContext("hours")}
                >
                  Imposta ore parziali...
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => openNoteModalFromContext("notes")}
                >
                  {hasNote ? "Modifica nota..." : "Aggiungi nota..."}
                </button>
                {hasNote ? (
                  <p className="px-3 py-1 text-xs text-muted-foreground">
                    {notePreview}
                    {entry?.notes && entry.notes.length > 60 ? "..." : ""}
                  </p>
                ) : null}
              </>
            );
          })()}
        </div>
      ) : null}

      {noteState ? (
        <AttendanceNoteModal
          isOpen
          onClose={() => setNoteState(null)}
          employeeName={noteState.employeeName}
          lessonDate={noteState.lessonDate}
          lessonDurationHours={noteState.lessonDurationHours}
          currentStatus={noteState.currentStatus}
          currentHoursAttended={noteState.currentHoursAttended}
          currentNotes={noteState.currentNotes}
          onSave={(nextStatus, nextNotes, nextHoursAttended) => {
            applyUpdate(
              noteState.lessonId,
              noteState.employeeId,
              nextStatus,
              nextHoursAttended,
              nextNotes
            );
            setNoteState(null);
          }}
        />
      ) : null}

      {bulkAction ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="modal-panel border bg-white shadow-xl sm:max-w-md">
            <div className="modal-header">
              <h3 className="text-base font-semibold">Conferma azione massiva</h3>
            </div>
            <div className="modal-body modal-scroll">
              <p className="text-sm text-muted-foreground">
                {bulkAction.status === "PRESENT"
                  ? "Segnare tutti come presenti per questa lezione?"
                  : "Segnare tutti come assenti per questa lezione?"}
              </p>
            </div>
            <div className="modal-footer flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() => setBulkAction(null)}
              >
                Annulla
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                onClick={handleBulkConfirm}
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
