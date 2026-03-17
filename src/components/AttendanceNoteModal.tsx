"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AttendanceStatus } from "@/types";

interface AttendanceNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  lessonDate: string;
  lessonDurationHours: number;
  currentStatus: AttendanceStatus;
  currentHoursAttended?: number | null;
  currentNotes?: string;
  onSave: (
    status: AttendanceStatus,
    notes: string,
    hoursAttended?: number | null
  ) => void;
}

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function AttendanceNoteModal({
  isOpen,
  onClose,
  employeeName,
  lessonDate,
  lessonDurationHours,
  currentStatus,
  currentHoursAttended,
  currentNotes,
  onSave,
}: AttendanceNoteModalProps) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<AttendanceStatus>(currentStatus);
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [hoursAttended, setHoursAttended] = useState("");

  const defaultHours = useMemo(
    () => formatHours(lessonDurationHours),
    [lessonDurationHours]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setStatus(currentStatus);
    setNotes(currentNotes ?? "");
    if (typeof currentHoursAttended === "number") {
      setHoursAttended(formatHours(currentHoursAttended));
      return;
    }
    if (currentStatus === "PRESENT" || currentStatus === "ABSENT_JUSTIFIED") {
      setHoursAttended(defaultHours);
      return;
    }
    setHoursAttended("");
  }, [currentHoursAttended, currentNotes, currentStatus, defaultHours, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const isHoursVisible = status === "PRESENT" || status === "ABSENT_JUSTIFIED";

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="modal-panel border bg-white shadow-xl sm:max-w-lg">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">Dettagli presenza</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {employeeName} · {lessonDate}
        </p>
        </div>

        <div className="modal-body modal-scroll space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Stato</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                className={`rounded-md border px-3 py-2 text-sm ${
                  status === "PRESENT"
                    ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                    : "border-gray-200 bg-white"
                }`}
                onClick={() => setStatus("PRESENT")}
              >
                Presente
              </button>
              <button
                type="button"
                className={`rounded-md border px-3 py-2 text-sm ${
                  status === "ABSENT"
                    ? "border-red-300 bg-red-100 text-red-700"
                    : "border-gray-200 bg-white"
                }`}
                onClick={() => setStatus("ABSENT")}
              >
                Assente
              </button>
              <button
                type="button"
                className={`rounded-md border px-3 py-2 text-sm ${
                  status === "ABSENT_JUSTIFIED"
                    ? "border-blue-300 bg-blue-100 text-blue-700"
                    : "border-gray-200 bg-white"
                }`}
                onClick={() => setStatus("ABSENT_JUSTIFIED")}
              >
                Assente giust.
              </button>
            </div>
          </div>

          {isHoursVisible ? (
            <label className="flex flex-col gap-2 text-sm">
              Ore frequentate (su {formatHours(lessonDurationHours)}h totali)
              <input
                type="number"
                min={0}
                max={lessonDurationHours}
                step={0.5}
                value={hoursAttended}
                onChange={(event) => setHoursAttended(event.target.value)}
                className="rounded-md border px-3 py-2"
                placeholder={defaultHours}
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-2 text-sm">
            Nota
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="Aggiungi una nota opzionale..."
            />
          </label>
        </div>

        <div className="modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm"
            onClick={onClose}
          >
            Annulla
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => {
              if (!isHoursVisible) {
                onSave(status, notes, null);
                return;
              }
              const parsed = Number(hoursAttended.replace(",", "."));
              const normalized = Number.isFinite(parsed)
                ? Math.min(Math.max(parsed, 0), lessonDurationHours)
                : lessonDurationHours;
              onSave(status, notes, normalized);
            }}
          >
            Salva
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
