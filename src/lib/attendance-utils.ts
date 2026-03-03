export type AttendanceStatus = "PRESENT" | "ABSENT" | "ABSENT_JUSTIFIED";

export type PresenceRequirementType = "percentage" | "days" | "hours";

export type NormalizedPresenceRequirement = {
  type: PresenceRequirementType | null;
  value: number | null;
};

export type AttendanceInput = {
  lessonId: string;
  employeeId: string;
  status: AttendanceStatus;
  hoursAttended?: number | null;
};

export type LessonInput = {
  id: string;
  durationHours: number;
};

export type EmployeeInput = {
  id: string;
  nome: string;
  cognome: string;
};

export type EmployeeAttendanceStats = {
  employeeId: string;
  employeeName: string;
  totalLessons: number;
  present: number;
  absent: number;
  justified: number;
  attendedLessons: number;
  percentage: number;
  totalHours: number;
  attendedHours: number;
  belowMinimum: boolean;
};

export function normalizePresenceRequirement(
  type: string | null | undefined,
  value: number | null | undefined
): NormalizedPresenceRequirement {
  if (
    (type === "percentage" || type === "days" || type === "hours") &&
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return { type, value };
  }
  return { type: null, value: null };
}

export function getEffectiveHours(
  attendance: { status: AttendanceStatus; hoursAttended?: number | null },
  lessonDurationHours: number
): number {
  const safeDuration =
    typeof lessonDurationHours === "number" && Number.isFinite(lessonDurationHours)
      ? Math.max(lessonDurationHours, 0)
      : 0;

  if (typeof attendance.hoursAttended === "number" && Number.isFinite(attendance.hoursAttended)) {
    return Math.min(Math.max(attendance.hoursAttended, 0), safeDuration);
  }

  if (attendance.status === "PRESENT" || attendance.status === "ABSENT_JUSTIFIED") {
    return safeDuration;
  }

  return 0;
}

export function isBelowPresenceMinimum(
  requirementType: PresenceRequirementType | null,
  requirementValue: number | null,
  metrics: {
    percentage: number;
    attendedLessons: number;
    attendedHours: number;
  }
): boolean {
  if (!requirementType || requirementValue === null) {
    return false;
  }

  if (requirementType === "percentage") {
    return metrics.percentage < requirementValue;
  }

  if (requirementType === "hours") {
    return metrics.attendedHours < requirementValue;
  }

  return metrics.attendedLessons < requirementValue;
}

export function calculateAttendanceStats(params: {
  employees: EmployeeInput[];
  lessons: LessonInput[];
  attendances: AttendanceInput[];
  presenzaMinimaType: string | null | undefined;
  presenzaMinimaValue: number | null | undefined;
}): {
  totalLessons: number;
  totalHours: number;
  presenzaMinimaType: PresenceRequirementType | null;
  presenzaMinimaValue: number | null;
  stats: EmployeeAttendanceStats[];
} {
  const totalLessons = params.lessons.length;
  const totalHours = params.lessons.reduce(
    (sum, lesson) => sum + (Number.isFinite(lesson.durationHours) ? lesson.durationHours : 0),
    0
  );
  const requirement = normalizePresenceRequirement(
    params.presenzaMinimaType,
    params.presenzaMinimaValue
  );

  const attendanceMap = new Map<string, AttendanceInput>();
  for (const attendance of params.attendances) {
    attendanceMap.set(`${attendance.lessonId}:${attendance.employeeId}`, attendance);
  }

  const stats = params.employees.map((employee) => {
    let present = 0;
    let justified = 0;
    let absent = 0;
    let attendedHours = 0;

    for (const lesson of params.lessons) {
      const entry = attendanceMap.get(`${lesson.id}:${employee.id}`);
      const status = entry?.status ?? "ABSENT";

      if (status === "PRESENT") {
        present += 1;
      } else if (status === "ABSENT_JUSTIFIED") {
        justified += 1;
      } else {
        absent += 1;
      }

      attendedHours += getEffectiveHours(
        {
          status,
          hoursAttended: entry?.hoursAttended ?? null,
        },
        lesson.durationHours
      );
    }

    const attendedLessons = present + justified;
    const percentage =
      totalHours > 0 ? Number(((attendedHours / totalHours) * 100).toFixed(1)) : 0;

    return {
      employeeId: employee.id,
      employeeName: `${employee.cognome} ${employee.nome}`,
      totalLessons,
      present,
      absent,
      justified,
      attendedLessons,
      percentage,
      totalHours,
      attendedHours: Number(attendedHours.toFixed(1)),
      belowMinimum: isBelowPresenceMinimum(requirement.type, requirement.value, {
        percentage,
        attendedLessons,
        attendedHours,
      }),
    };
  });

  return {
    totalLessons,
    totalHours: Number(totalHours.toFixed(1)),
    presenzaMinimaType: requirement.type,
    presenzaMinimaValue: requirement.value,
    stats,
  };
}

export function formatPresenceRequirementLabel(
  type: PresenceRequirementType | null | undefined,
  value: number | null | undefined
) {
  if (!type || typeof value !== "number") {
    return null;
  }
  if (type === "percentage") {
    return `${value}%`;
  }
  if (type === "hours") {
    return `${value}h`;
  }
  return `${value} lezioni`;
}
