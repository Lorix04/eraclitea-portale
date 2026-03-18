"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  Loader2,
  MessageSquare,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

type AttendanceStatus = "PRESENT" | "ABSENT" | "ABSENT_JUSTIFIED";

type Participant = {
  employeeId: string;
  firstName: string;
  lastName: string;
  fiscalCode: string;
  attendance: {
    status: AttendanceStatus;
    hoursAttended: number | null;
    notes: string | null;
  } | null;
};

type LocalEntry = {
  employeeId: string;
  status: AttendanceStatus | null;
  hoursAttended: number | null;
  notes: string;
  showNotes: boolean;
};

type TeacherAttendanceProps = {
  lessonId: string;
  durationHours: number;
  canEdit: boolean;
};

const STATUS_OPTIONS: Array<{
  value: AttendanceStatus | "";
  label: string;
  short: string;
  cls: string;
}> = [
  { value: "", label: "— Non registrato", short: "—", cls: "text-gray-400" },
  { value: "PRESENT", label: "✓ Presente", short: "✓", cls: "text-emerald-600" },
  { value: "ABSENT", label: "✗ Assente", short: "✗", cls: "text-red-600" },
  { value: "ABSENT_JUSTIFIED", label: "G Giustificato", short: "G", cls: "text-amber-600" },
];

export default function TeacherAttendance({
  lessonId,
  durationHours,
  canEdit,
}: TeacherAttendanceProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [entries, setEntries] = useState<LocalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch attendance data
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/teacher/lessons/${lessonId}/attendance`);
        if (!res.ok) throw new Error("Errore caricamento presenze");
        const json = await res.json();
        setParticipants(json.participants ?? []);
        setEntries(
          (json.participants ?? []).map((p: Participant) => ({
            employeeId: p.employeeId,
            status: p.attendance?.status ?? null,
            hoursAttended: p.attendance?.hoursAttended ?? (p.attendance?.status === "PRESENT" || p.attendance?.status === "ABSENT_JUSTIFIED" ? durationHours : null),
            notes: p.attendance?.notes ?? "",
            showNotes: false,
          }))
        );
      } catch {
        setError("Errore nel caricamento delle presenze.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lessonId, durationHours]);

  // Update a single entry
  const updateEntry = useCallback(
    (employeeId: string, field: keyof LocalEntry, value: unknown) => {
      setEntries((prev) =>
        prev.map((e) => {
          if (e.employeeId !== employeeId) return e;
          const updated = { ...e, [field]: value };
          // Auto-set hours when status changes
          if (field === "status") {
            if (value === "PRESENT" || value === "ABSENT_JUSTIFIED") {
              updated.hoursAttended = e.hoursAttended ?? durationHours;
            } else {
              updated.hoursAttended = null;
            }
          }
          return updated;
        })
      );
    },
    [durationHours]
  );

  // Bulk actions
  const markAllPresent = useCallback(() => {
    setEntries((prev) =>
      prev.map((e) => ({
        ...e,
        status: "PRESENT" as AttendanceStatus,
        hoursAttended: durationHours,
      }))
    );
  }, [durationHours]);

  const markAllAbsent = useCallback(() => {
    setEntries((prev) =>
      prev.map((e) => ({
        ...e,
        status: "ABSENT" as AttendanceStatus,
        hoursAttended: null,
      }))
    );
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const total = entries.length;
    let present = 0, absent = 0, absentJustified = 0, notRecorded = 0;
    for (const e of entries) {
      if (e.status === "PRESENT") present++;
      else if (e.status === "ABSENT") absent++;
      else if (e.status === "ABSENT_JUSTIFIED") absentJustified++;
      else notRecorded++;
    }
    return { total, present, absent, absentJustified, notRecorded };
  }, [entries]);

  const hasAnyRecorded = entries.some((e) => e.status !== null);

  // Save
  const handleSave = useCallback(async () => {
    const toSave = entries
      .filter((e) => e.status !== null)
      .map((e) => ({
        employeeId: e.employeeId,
        status: e.status!,
        hoursAttended: e.status === "ABSENT" ? null : e.hoursAttended,
        notes: e.notes.trim() || null,
      }));

    if (toSave.length === 0) {
      toast.error("Seleziona almeno una presenza");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/teacher/lessons/${lessonId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendances: toSave }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Errore salvataggio presenze");
        return;
      }
      toast.success(`Presenze salvate (${json.count ?? toSave.length} registrazioni)`);
    } catch {
      toast.error("Errore di connessione");
    } finally {
      setSaving(false);
    }
  }, [entries, lessonId]);

  // Download PDF
  const handleDownloadPdf = useCallback(async () => {
    const res = await fetch(`/api/teacher/lessons/${lessonId}/attendance/pdf`);
    if (!res.ok) {
      toast.error("Errore generazione PDF");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registro-presenze-${lessonId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [lessonId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="mr-1 inline h-4 w-4" /> {error}
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Nessun partecipante iscritto a questa edizione.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> Presenti: {stats.present}/{stats.total}
        </span>
        <span className="text-red-600">Assenti: {stats.absent}</span>
        <span className="text-amber-600">Giustificati: {stats.absentJustified}</span>
        {stats.notRecorded > 0 && (
          <span className="text-gray-400">Non registrati: {stats.notRecorded}</span>
        )}
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!hasAnyRecorded}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
            title={hasAnyRecorded ? "Scarica registro" : "Registra prima le presenze"}
          >
            <Download className="h-3.5 w-3.5" />
            Scarica registro PDF
          </button>
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          Le presenze potranno essere registrate il giorno della lezione o successivamente.
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 w-8">#</th>
              <th className="px-3 py-2">Partecipante</th>
              <th className="px-3 py-2 hidden md:table-cell">Codice Fiscale</th>
              <th className="px-3 py-2 w-40">Stato</th>
              <th className="px-3 py-2 w-20">Ore</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p, i) => {
              const entry = entries.find((e) => e.employeeId === p.employeeId);
              if (!entry) return null;
              const showHours = entry.status === "PRESENT" || entry.status === "ABSENT_JUSTIFIED";
              return (
                <tr key={p.employeeId} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{p.lastName} {p.firstName}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">{p.fiscalCode}</td>
                  <td className="px-3 py-2">
                    <select
                      value={entry.status ?? ""}
                      onChange={(e) => updateEntry(p.employeeId, "status", e.target.value || null)}
                      disabled={!canEdit}
                      className={`min-h-[36px] w-full rounded-md border bg-background px-2 py-1 text-sm ${
                        STATUS_OPTIONS.find((o) => o.value === (entry.status ?? ""))?.cls ?? ""
                      }`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {showHours ? (
                      <input
                        type="number"
                        min={0}
                        max={durationHours}
                        step={0.5}
                        value={entry.hoursAttended ?? ""}
                        onChange={(e) => updateEntry(p.employeeId, "hoursAttended", e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={!canEdit}
                        className="w-16 rounded-md border bg-background px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => updateEntry(p.employeeId, "showNotes", !entry.showNotes)}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded text-xs ${entry.notes ? "text-primary" : "text-muted-foreground"} hover:bg-muted`}
                      title="Note"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                    {entry.showNotes && (
                      <input
                        className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-xs"
                        placeholder="Note..."
                        value={entry.notes}
                        onChange={(e) => updateEntry(p.employeeId, "notes", e.target.value)}
                        disabled={!canEdit}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {participants.map((p, i) => {
          const entry = entries.find((e) => e.employeeId === p.employeeId);
          if (!entry) return null;
          const showHours = entry.status === "PRESENT" || entry.status === "ABSENT_JUSTIFIED";
          return (
            <div key={p.employeeId} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{i + 1}. {p.lastName} {p.firstName}</span>
              </div>
              <p className="text-xs text-muted-foreground">{p.fiscalCode}</p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={entry.status ?? ""}
                  onChange={(e) => updateEntry(p.employeeId, "status", e.target.value || null)}
                  disabled={!canEdit}
                  className={`min-h-[44px] rounded-md border bg-background px-2 py-1 text-sm ${
                    STATUS_OPTIONS.find((o) => o.value === (entry.status ?? ""))?.cls ?? ""
                  }`}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.short} {opt.label.split(" ").slice(1).join(" ")}</option>
                  ))}
                </select>
                {showHours && (
                  <input
                    type="number"
                    min={0}
                    max={durationHours}
                    step={0.5}
                    value={entry.hoursAttended ?? ""}
                    onChange={(e) => updateEntry(p.employeeId, "hoursAttended", e.target.value ? parseFloat(e.target.value) : null)}
                    disabled={!canEdit}
                    placeholder="Ore"
                    className="min-h-[44px] rounded-md border bg-background px-2 py-1 text-sm"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t pt-4">
          <div className="flex gap-2">
            <button type="button" onClick={markAllPresent} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Tutti presenti
            </button>
            <button type="button" onClick={markAllAbsent} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
              <UserX className="h-3.5 w-3.5 text-red-600" /> Tutti assenti
            </button>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Salva presenze
          </button>
        </div>
      )}
    </div>
  );
}
