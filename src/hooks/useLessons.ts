import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lesson, LessonFormData } from "@/types";

type LessonRow = Lesson & {
  attendanceCounts?: {
    present: number;
    absent: number;
    justified: number;
  };
};

type LessonsResponse = {
  data: LessonRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totalEmployees: number;
};

export function useLessons(courseId: string, page = 1, limit = 20) {
  const queryClient = useQueryClient();

  const query = useQuery<LessonsResponse>({
    queryKey: ["lessons", courseId, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/corsi/${courseId}/lezioni?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch lessons");
      }
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const createLesson = useMutation({
    mutationFn: async (data: LessonFormData) => {
      const res = await fetch(`/api/corsi/${courseId}/lezioni`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to create lesson");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
    },
  });

  const updateLesson = useMutation({
    mutationFn: async (payload: { lessonId: string; data: Partial<LessonFormData> }) => {
      const res = await fetch(
        `/api/corsi/${courseId}/lezioni/${payload.lessonId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload.data),
        }
      );
      if (!res.ok) {
        throw new Error("Failed to update lesson");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
    },
  });

  const deleteLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      const res = await fetch(`/api/corsi/${courseId}/lezioni/${lessonId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete lesson");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
    },
  });

  return {
    ...query,
    createLesson,
    updateLesson,
    deleteLesson,
  };
}
