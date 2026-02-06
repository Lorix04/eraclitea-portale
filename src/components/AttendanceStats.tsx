"use client";

interface AttendanceStatsProps {
  stats: {
    employeeId: string;
    employeeName: string;
    totalLessons: number;
    present: number;
    absent: number;
    justified: number;
    percentage: number;
    totalHours: number;
    attendedHours: number;
    belowMinimum: boolean;
  }[];
  minPercentage?: number;
}

export function AttendanceStats({
  stats,
  minPercentage = 75,
}: AttendanceStatsProps) {
  if (!stats.length) {
    return null;
  }

  const below = stats.filter((item) => item.belowMinimum);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-4 text-sm">
        <p className="font-medium">Riepilogo presenze</p>
        <p className="text-muted-foreground">
          Presenza minima richiesta: {minPercentage}%.
        </p>
      </div>

      {below.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          ⚠️ {below.length} dipendenti sotto il {minPercentage}% di presenze.
        </div>
      ) : null}
    </div>
  );
}
