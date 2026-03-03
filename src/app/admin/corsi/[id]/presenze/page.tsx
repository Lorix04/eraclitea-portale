"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { AttendanceMatrix } from "@/components/AttendanceMatrix";
import { AttendanceStats } from "@/components/AttendanceStats";
import { useAttendance } from "@/hooks/useAttendance";
import { AttendanceStatus } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { calculateAttendanceStats } from "@/lib/attendance-utils";

type AttendanceEntry = {
  lessonId: string;
  employeeId: string;
  status: AttendanceStatus;
  hoursAttended?: number | null;
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
  const [employeeFilter, setEmployeeFilter] = useState("");

  useEffect(() => {
    if (!data) return;
    const map = new Map<string, AttendanceEntry>();
    data.attendances.forEach((entry) => {
      map.set(`${entry.lessonId}:${entry.employeeId}`, {
        lessonId: entry.lessonId,
        employeeId: entry.employeeId,
        status: entry.status,
        hoursAttended: entry.hoursAttended ?? null,
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
    notes?: string,
    hoursAttended?: number | null
  ) => {
    const key = `${lessonId}:${employeeId}`;
    setAttendanceMap((prev) => {
      const next = new Map(prev);
      next.set(key, { lessonId, employeeId, status, notes, hoursAttended });
      return next;
    });
    setPendingUpdates((prev) => {
      const next = new Map(prev);
      next.set(key, { lessonId, employeeId, status, notes, hoursAttended });
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

  const localStats = useMemo(() => {
    if (!data) return null;
    return calculateAttendanceStats({
      employees: data.employees.map((employee) => ({
        id: employee.id,
        nome: employee.nome,
        cognome: employee.cognome,
      })),
      lessons: data.lessons.map((lesson) => ({
        id: lesson.id,
        durationHours: lesson.durationHours ?? 0,
      })),
      attendances: matrixAttendances.map((entry) => ({
        lessonId: entry.lessonId,
        employeeId: entry.employeeId,
        status: entry.status,
        hoursAttended: entry.hoursAttended ?? null,
      })),
      presenzaMinimaType: data.presenzaMinimaType,
      presenzaMinimaValue: data.presenzaMinimaValue,
    });
  }, [data, matrixAttendances]);

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
            href={
              data?.course?.id
                ? `/admin/corsi/${data.course.id}/edizioni/${params.id}`
                : "/admin/corsi"
            }
            className="rounded-md border px-3 py-2 text-sm"
          >
            Torna all&apos;edizione
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
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              placeholder="Cerca dipendente..."
              className="h-10 rounded-md border bg-background pl-9 pr-3 text-sm"
            />
          </div>
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
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-32 w-full" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          <AttendanceMatrix
            courseEditionId={params.id}
            lessons={data.lessons}
            employees={data.employees}
            attendances={matrixAttendances}
            onUpdate={handleUpdate}
            isAdmin
            minRequirementType={data.presenzaMinimaType}
            minRequirementValue={data.presenzaMinimaValue}
            employeeFilter={employeeFilter}
            onEmployeeFilterChange={setEmployeeFilter}
          />
          <AttendanceStats
            stats={localStats?.stats ?? data.stats}
            minRequirementType={data.presenzaMinimaType}
            minRequirementValue={data.presenzaMinimaValue}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nessun dato disponibile.</p>
      )}
    </div>
  );
}
