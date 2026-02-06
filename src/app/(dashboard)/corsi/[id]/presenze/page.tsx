"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { AttendanceMatrix } from "@/components/AttendanceMatrix";
import { AttendanceStats } from "@/components/AttendanceStats";
import { useAttendance } from "@/hooks/useAttendance";

export default function CourseAttendanceClientPage({
  params,
}: {
  params: { id: string };
}) {
  const { data, isLoading } = useAttendance(params.id);

  const handleDownload = async () => {
    const res = await fetch(
      `/api/corsi/${params.id}/presenze/export?format=pdf`
    );
    if (!res.ok) {
      toast.error("Errore download presenze");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `presenze_${params.id}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Presenze corso</h1>
          <p className="text-sm text-muted-foreground">
            Visualizza le presenze dei tuoi dipendenti.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
          onClick={handleDownload}
        >
          <Download className="mr-2 h-4 w-4" />
          Scarica PDF
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento presenze...</p>
      ) : data ? (
        <div className="space-y-4">
          <AttendanceMatrix
            courseId={params.id}
            lessons={data.lessons}
            employees={data.employees}
            attendances={data.attendances}
            stats={data.stats}
            readonly
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
