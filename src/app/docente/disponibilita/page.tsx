"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TeacherCalendar from "@/components/teacher/TeacherCalendar";
import UnavailabilityModal from "@/components/teacher/UnavailabilityModal";
import { formatItalianDate } from "@/lib/date-utils";

type Unavailability = {
  id: string;
  date: string;
  reason: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
};

export default function TeacherDisponibilitaPage() {
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const calendarQuery = useQuery({
    queryKey: ["teacher-calendar-avail", calMonth, calYear],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/calendar?month=${calMonth}&year=${calYear}`);
      if (!res.ok) throw new Error("Errore calendario");
      return (await res.json()).days as any[];
    },
    staleTime: 20_000,
  });

  const unavailQuery = useQuery({
    queryKey: ["teacher-unavailability", calMonth, calYear],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/unavailability?month=${calMonth}&year=${calYear}`);
      if (!res.ok) throw new Error("Errore indisponibilita");
      return (await res.json()).data as Unavailability[];
    },
    staleTime: 20_000,
  });

  const unavailabilities = unavailQuery.data ?? [];

  const handleDayClick = (date: string, status: string) => {
    if (status === "free") {
      setEditingId(null);
      setDefaultDate(date);
      setModalOpen(true);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setDefaultDate("");
    setModalOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setDefaultDate("");
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/teacher/unavailability/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "Errore eliminazione");
        return;
      }
      toast.success("Indisponibilita rimossa");
      await Promise.all([calendarQuery.refetch(), unavailQuery.refetch()]);
    } catch {
      toast.error("Errore di connessione");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    void calendarQuery.refetch();
    void unavailQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <CalendarOff className="h-5 w-5" />
            Disponibilita
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestisci i tuoi periodi di indisponibilita. Clicca su un giorno libero per aggiungere.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi
        </button>
      </div>

      <TeacherCalendar
        days={calendarQuery.data ?? []}
        month={calMonth}
        year={calYear}
        onMonthChange={(m, y) => { setCalMonth(m); setCalYear(y); }}
        onDayClick={handleDayClick}
        loading={calendarQuery.isLoading}
      />

      {/* List */}
      <div>
        <h2 className="text-sm font-semibold mb-3">
          Indisponibilita registrate ({unavailabilities.length})
        </h2>

        {unavailQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted" />)}
          </div>
        ) : unavailabilities.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            Nessuna indisponibilita registrata per questo mese.
          </div>
        ) : (
          <div className="space-y-2">
            {unavailabilities.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="text-sm">
                  <p className="font-medium">
                    {formatItalianDate(u.date)}
                    {!u.allDay && u.startTime && u.endTime && (
                      <span className="ml-2 text-muted-foreground">
                        {u.startTime} - {u.endTime}
                      </span>
                    )}
                    {u.allDay && (
                      <span className="ml-2 text-xs text-muted-foreground">Tutto il giorno</span>
                    )}
                  </p>
                  {u.reason && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Motivo: {u.reason}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleEdit(u.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(u.id)}
                    disabled={deletingId === u.id}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-xs text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <UnavailabilityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        existingId={editingId}
        defaultDate={defaultDate}
      />
    </div>
  );
}
