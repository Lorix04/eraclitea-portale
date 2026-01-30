import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useCourses(tab?: string) {
  return useQuery({
    queryKey: ["courses", tab],
    queryFn: async () => {
      const params = tab ? `?tab=${tab}` : "";
      const res = await fetch(`/api/corsi/cliente${params}`);
      if (!res.ok) {
        throw new Error("Failed to fetch courses");
      }
      return res.json();
    },
  });
}

export function usePublishCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const res = await fetch(`/api/corsi/${courseId}/pubblica`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to publish");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
