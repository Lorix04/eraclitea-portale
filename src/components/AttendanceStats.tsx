"use client";

import { Check, X } from "lucide-react";
import { formatPresenceRequirementLabel } from "@/lib/attendance-utils";
import { cn } from "@/lib/utils";

interface AttendanceStatsProps {
  stats: {
    employeeId: string;
    employeeName: string;
    totalLessons: number;
    present: number;
    absent: number;
    justified: number;
    attendedLessons?: number;
    percentage: number;
    totalHours: number;
    attendedHours: number;
    belowMinimum: boolean;
  }[];
  minRequirementType?: "percentage" | "days" | "hours" | null;
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
    (minRequirementType === "percentage" ||
      minRequirementType === "days" ||
      minRequirementType === "hours") &&
    typeof minRequirementValue === "number";
  const requirementLabel =
    formatPresenceRequirementLabel(minRequirementType, minRequirementValue) ?? null;

  const totalLessons = stats[0]?.totalLessons ?? 0;
  const totalHours = stats[0]?.totalHours ?? 0;
  const participants = stats.length;

  const averagePercentage =
    participants > 0
      ? Number(
          (
            stats.reduce((sum, item) => sum + (item.percentage ?? 0), 0) / participants
          ).toFixed(1)
        )
      : 0;

  const aboveThreshold = hasRequirement
    ? stats.filter((item) => !item.belowMinimum).length
    : participants;
  const belowThreshold = hasRequirement
    ? stats.filter((item) => item.belowMinimum).length
    : 0;

  const averageProgressClass = hasRequirement
    ? averagePercentage < (minRequirementValue ?? 0)
      ? "bg-red-500"
      : "bg-emerald-500"
    : "bg-emerald-500";

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold">📊 Riepilogo presenze</h3>

      <p className="mt-3 text-sm text-muted-foreground">
        Lezioni: {totalLessons} · Ore totali: {totalHours}h · Partecipanti: {participants}
      </p>

      <p className="mt-2 text-sm text-muted-foreground">
        {hasRequirement && requirementLabel
          ? `Presenza minima richiesta: ${requirementLabel}${
              minRequirementType === "percentage" ? " delle ore" : ""
            }`
          : "Nessun requisito di presenza minima impostato"}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className={cn("h-2 rounded-full", averageProgressClass)}
            style={{ width: `${Math.max(0, Math.min(100, averagePercentage))}%` }}
          />
        </div>
        <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
          Media partecipanti: {averagePercentage}%
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="inline-flex items-center gap-1 text-emerald-700">
          <Check className="h-4 w-4" />
          Sopra soglia: {aboveThreshold} dipendenti
        </div>
        <div className="inline-flex items-center gap-1 text-red-700">
          <X className="h-4 w-4" />
          Sotto soglia: {belowThreshold} dipendenti
        </div>
      </div>
    </div>
  );
}
