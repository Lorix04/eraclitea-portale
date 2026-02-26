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
  minRequirementType?: "percentage" | "days" | null;
  minRequirementValue?: number | null;
}

export function AttendanceStats({
  stats,
  minRequirementType = null,
  minRequirementValue = null,
}: AttendanceStatsProps) {
  if (!stats.length) {
    return null;
  }

  const hasRequirement =
    (minRequirementType === "percentage" || minRequirementType === "days") &&
    typeof minRequirementValue === "number";
  const requirementLabel = hasRequirement
    ? minRequirementType === "percentage"
      ? `${minRequirementValue}%`
      : `${minRequirementValue} giorni`
    : null;
  const below = hasRequirement ? stats.filter((item) => item.belowMinimum) : [];
  const met = hasRequirement ? stats.filter((item) => !item.belowMinimum) : [];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-4 text-sm">
        <p className="font-medium">Riepilogo presenze</p>
        {hasRequirement ? (
          <p className="text-muted-foreground">
            Presenza minima richiesta: {requirementLabel}.
          </p>
        ) : (
          <p className="text-muted-foreground">
            Nessun requisito di presenza minima impostato.
          </p>
        )}
      </div>

      {hasRequirement ? (
        <>
          {below.length > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {below.length} dipendenti non raggiungono il minimo richiesto ({requirementLabel}).
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Tutti i dipendenti raggiungono il minimo richiesto ({requirementLabel}).
            </div>
          )}

          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-2">Dipendente</th>
                  <th className="px-4 py-2">Presenze</th>
                  <th className="px-4 py-2">Percentuale</th>
                  <th className="px-4 py-2">Esito</th>
                </tr>
              </thead>
              <tbody>
                {[...met, ...below].map((item) => {
                  const attendedLessons = item.present + item.justified;
                  return (
                    <tr
                      key={item.employeeId}
                      className={`border-t ${
                        item.belowMinimum ? "bg-red-50/60" : "bg-emerald-50/60"
                      }`}
                    >
                      <td className="px-4 py-2 font-medium">{item.employeeName}</td>
                      <td className="px-4 py-2">
                        {attendedLessons}/{item.totalLessons}
                      </td>
                      <td className="px-4 py-2">{item.percentage}%</td>
                      <td className="px-4 py-2">
                        {item.belowMinimum ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                            Non raggiunto
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                            Raggiunto
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
