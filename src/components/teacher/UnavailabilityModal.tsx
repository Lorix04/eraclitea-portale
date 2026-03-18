"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { toast } from "sonner";

type Conflict = {
  date: string;
  lessonTitle: string;
  startTime: string | null;
  endTime: string | null;
};

type UnavailabilityModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  existingId?: string | null;
  defaultDate?: string;
};

export default function UnavailabilityModal({
  open,
  onClose,
  onSaved,
  existingId,
  defaultDate,
}: UnavailabilityModalProps) {
  const [allDay, setAllDay] = useState(true);
  const [startDate, setStartDate] = useState(defaultDate || "");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  // Reset form on open
  useEffect(() => {
    if (!open) return;
    setConflicts([]);

    if (existingId) {
      setLoadingExisting(true);
      fetch(`/api/teacher/unavailability/${existingId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((json) => {
          if (json?.data) {
            const d = json.data;
            setAllDay(d.allDay ?? true);
            setStartDate(d.date?.slice(0, 10) ?? "");
            setEndDate("");
            setStartTime(d.startTime ?? "");
            setEndTime(d.endTime ?? "");
            setReason(d.reason ?? "");
          }
        })
        .finally(() => setLoadingExisting(false));
    } else {
      setAllDay(true);
      setStartDate(defaultDate || "");
      setEndDate("");
      setStartTime("");
      setEndTime("");
      setReason("");
    }
  }, [open, existingId, defaultDate]);

  // Check conflicts when dates change
  useEffect(() => {
    if (!open || !startDate) { setConflicts([]); return; }
    const end = endDate || startDate;
    fetch(`/api/teacher/unavailability/conflicts?startDate=${startDate}&endDate=${end}`)
      .then((r) => r.ok ? r.json() : { conflicts: [] })
      .then((json) => setConflicts(json.conflicts ?? []))
      .catch(() => setConflicts([]));
  }, [open, startDate, endDate]);

  const handleSave = useCallback(async () => {
    if (!startDate) { toast.error("Data inizio obbligatoria"); return; }
    if (!allDay && (!startTime || !endTime)) { toast.error("Orario inizio e fine obbligatori"); return; }

    setSaving(true);
    try {
      const url = existingId
        ? `/api/teacher/unavailability/${existingId}`
        : "/api/teacher/unavailability";
      const method = existingId ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        allDay,
        reason: reason.trim() || undefined,
      };

      if (existingId) {
        body.date = startDate;
        if (!allDay) { body.startTime = startTime; body.endTime = endTime; }
      } else {
        body.startDate = startDate;
        if (endDate) body.endDate = endDate;
        if (!allDay) { body.startTime = startTime; body.endTime = endTime; }
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Errore salvataggio"); return; }

      toast.success(existingId ? "Indisponibilita aggiornata" : "Indisponibilita aggiunta");
      onSaved();
      onClose();
    } catch {
      toast.error("Errore di connessione");
    } finally {
      setSaving(false);
    }
  }, [existingId, startDate, endDate, allDay, startTime, endTime, reason, onSaved, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="modal-panel border bg-white shadow-xl sm:max-w-md">
        <div className="modal-header flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {existingId ? "Modifica indisponibilita" : "Aggiungi indisponibilita"}
          </h2>
          <button type="button" onClick={onClose} disabled={saving} className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="modal-body modal-scroll space-y-4">
          {loadingExisting ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* All day toggle */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Tipo</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input type="radio" checked={allDay} onChange={() => setAllDay(true)} /> Giornata intera
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input type="radio" checked={!allDay} onChange={() => setAllDay(false)} /> Fascia oraria
                  </label>
                </div>
              </div>

              {/* Dates */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Data inizio <span className="text-red-400">*</span></span>
                  <input type="date" className="rounded-md border bg-background px-3 py-2 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </label>
                {!existingId && (
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Data fine</span>
                    <input type="date" className="rounded-md border bg-background px-3 py-2 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
                    <span className="text-xs text-muted-foreground">Vuoto = solo un giorno</span>
                  </label>
                )}
              </div>

              {/* Time range */}
              {!allDay && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Ora inizio <span className="text-red-400">*</span></span>
                    <input type="time" className="rounded-md border bg-background px-3 py-2 text-sm" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Ora fine <span className="text-red-400">*</span></span>
                    <input type="time" className="rounded-md border bg-background px-3 py-2 text-sm" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </label>
                </div>
              )}

              {/* Reason */}
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Motivo</span>
                <input className="rounded-md border bg-background px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="es. Impegno personale" />
              </label>

              {/* Conflict warning */}
              {conflicts.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-amber-800 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    Attenzione: lezioni in conflitto
                  </div>
                  <ul className="space-y-0.5 text-xs text-amber-700">
                    {conflicts.map((c, i) => (
                      <li key={i}>
                        {c.date} — {c.lessonTitle} ({c.startTime || "?"}-{c.endTime || "?"})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="inline-flex min-h-[44px] items-center justify-center rounded-md border px-4 py-2 text-sm">
            Annulla
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !startDate} className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</> : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}
