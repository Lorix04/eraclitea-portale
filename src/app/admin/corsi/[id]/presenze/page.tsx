"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Save } from "lucide-react";
import { toast } from "sonner";
import { AttendanceMatrix } from "@/components/AttendanceMatrix";
import { AttendanceStats } from "@/components/AttendanceStats";
import { useAttendance } from "@/hooks/useAttendance";
import { AttendanceStatus } from "@/types";

type AttendanceEntry = {
  lessonId: string;
  employeeId: string;
  status: AttendanceStatus;
  notes?: string;
};

export default function AdminCourseAttendancePage({
  params,
}: {
  params: { id: string };
}) {
  const { data, isLoading, saveAttendances } = useAttendance(params.id);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceEntry>>(
    new Map()
  );
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, AttendanceEntry>>(
    new Map()
  );

  useEffect(() => {
    if (!data) return;
    const map = new Map<string, AttendanceEntry>();
    data.attendances.forEach((entry) => {
      map.set(`${entry.lessonId}:${entry.employeeId}`, {
        lessonId: entry.lessonId,
        employeeId: entry.employeeId,
        status: entry.status,
        notes: entry.notes,
      });
    });
    setAttendanceMap(map);
    setPendingUpdates(new Map());
  }, [data]);

  const handleUpdate = (
    lessonId: string,
    employeeId: string,
    status: AttendanceStatus,
    notes?: string
  ) => {
    const key = `${lessonId}:${employeeId}`;
    setAttendanceMap((prev) => {
      const next = new Map(prev);
      next.set(key, { lessonId, employeeId, status, notes });
      return next;
    });
    setPendingUpdates((prev) => {
      const next = new Map(prev);
      next.set(key, { lessonId, employeeId, status, notes });
      return next;
    });
  };

  const handleSave = async () => {
    if (pendingUpdates.size === 0) return;
    const payload = Array.from(pendingUpdates.values());
    try {
      await saveAttendances.mutateAsync(payload);
      toast.success("Presenze salvate");
      setPendingUpdates(new Map());
    } catch {
      toast.error("Errore durante il salvataggio");
    }
  };

  const handleExport = async (format: "csv" | "pdf") => {
    const res = await fetch(
      `/api/corsi/${params.id}/presenze/export?format=${format}`
    );
    if (!res.ok) {
      toast.error("Errore export presenze");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `presenze_${params.id}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const matrixAttendances = useMemo(() => {
    return Array.from(attendanceMap.values());
  }, [attendanceMap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            Presenze {data?.course?.title ? `- ${data.course.title}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Registra le presenze dei dipendenti per ciascuna lezione.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/corsi/${params.id}/edit`}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Torna al corso
          </Link>
          <button
            type="button"
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
            onClick={() => handleExport("csv")}
          >
            <Download className="mr-2 h-4 w-4" />
            Esporta CSV
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
            onClick={() => handleExport("pdf")}
          >
            <Download className="mr-2 h-4 w-4" />
            Esporta PDF
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            onClick={handleSave}
            disabled={pendingUpdates.size === 0 || saveAttendances.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveAttendances.isPending ? "Salvataggio..." : "Salva modifiche"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento presenze...</p>
      ) : data ? (
        <div className="space-y-4">
          <AttendanceMatrix
            courseId={params.id}
            lessons={data.lessons}
            employees={data.employees}
            attendances={matrixAttendances}
            stats={data.stats}
            onUpdate={handleUpdate}
          />
          <p className="text-xs text-muted-foreground">
            Legenda: P = Presente, A = Assente, G = Assente giustificato.
          </p>
          <AttendanceStats stats={data.stats} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nessun dato disponibile.</p>
      )}
    </div>
  );
}
