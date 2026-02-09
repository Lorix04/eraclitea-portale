import { useQuery } from "@tanstack/react-query";

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

// publish handled at edition level in Phase 2
