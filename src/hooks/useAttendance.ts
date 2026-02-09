import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AttendanceUpdate } from "@/types";

type AttendanceResponse = {
  course: { id: string; title: string };
  lessons: Array<{
    id: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    durationHours: number;
    title?: string | null;
  }>;
  employees: Array<{
    id: string;
    nome: string;
    cognome: string;
    codiceFiscale: string;
  }>;
  attendances: Array<{
    id: string;
    lessonId: string;
    employeeId: string;
    status: "PRESENT" | "ABSENT" | "ABSENT_JUSTIFIED";
    notes?: string;
    recordedBy?: string;
    recordedAt?: string;
  }>;
  stats: Array<{
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
  }>;
  totalLessons: number;
  totalHours: number;
};

export function useAttendance(courseEditionId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<AttendanceResponse>({
    queryKey: ["attendance", courseEditionId],
    queryFn: async () => {
      const res = await fetch(`/api/corsi/${courseEditionId}/presenze`);
      if (!res.ok) {
        throw new Error("Failed to fetch attendance");
      }
      return res.json();
    },
  });

  const saveAttendances = useMutation({
    mutationFn: async (updates: AttendanceUpdate[]) => {
      const res = await fetch(`/api/corsi/${courseEditionId}/presenze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendances: updates }),
      });
      if (!res.ok) {
        throw new Error("Failed to save attendance");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", courseEditionId] });
    },
  });

  return {
    ...query,
    saveAttendances,
  };
}
