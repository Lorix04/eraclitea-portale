"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AttendanceStatus } from "@/types";

interface AttendanceNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  lessonDate: string;
  currentStatus: AttendanceStatus;
  currentNotes?: string;
  onSave: (status: AttendanceStatus, notes: string) => void;
}

export function AttendanceNoteModal({
  isOpen,
  onClose,
  employeeName,
  lessonDate,
  currentStatus,
  currentNotes,
  onSave,
}: AttendanceNoteModalProps) {
  const [status, setStatus] = useState<AttendanceStatus>(currentStatus);
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStatus(currentStatus);
      setNotes(currentNotes ?? "");
    }
  }, [isOpen, currentStatus, currentNotes]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">
          Nota per {employeeName} - {lessonDate}
        </h2>

        <div className="mt-4 space-y-3">
          <div className="space-y-2 text-sm">
            <p className="font-medium">Stato</p>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="attendance-status"
                checked={status === "PRESENT"}
                onChange={() => setStatus("PRESENT")}
              />
              Presente
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="attendance-status"
                checked={status === "ABSENT"}
                onChange={() => setStatus("ABSENT")}
              />
              Assente
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="attendance-status"
                checked={status === "ABSENT_JUSTIFIED"}
                onChange={() => setStatus("ABSENT_JUSTIFIED")}
              />
              Assente giustificato
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm">
            Motivazione
            <textarea
              className="rounded-md border bg-background px-3 py-2"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
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
            onClick={() => onSave(status, notes)}
          >
            Salva
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
