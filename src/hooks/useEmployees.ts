import { useQuery } from "@tanstack/react-query";

type UseEmployeesParams = {
  search?: string;
  clientId?: string;
  searchEmail?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  hasCourses?: "all" | "with" | "without";
  page?: number;
  limit?: number;
};

type EmployeeRow = {
  id: string;
  clientId: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  dataNascita?: string | Date | null;
  luogoNascita?: string | null;
  email?: string | null;
  mansione?: string | null;
  note?: string | null;
  client?: { id: string; ragioneSociale: string };
  _count?: { registrations?: number; certificates?: number };
  coursesCompleted?: number;
};

type EmployeesResponse = {
  data: EmployeeRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function useEmployees(params: UseEmployeesParams) {
  return useQuery<EmployeesResponse>({
    queryKey: ["employees", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set("search", params.search);
      if (params.clientId) searchParams.set("clientId", params.clientId);
      if (params.searchEmail) searchParams.set("searchEmail", params.searchEmail);
      if (params.sortBy) searchParams.set("sortBy", params.sortBy);
      if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
      if (params.hasCourses) searchParams.set("hasCourses", params.hasCourses);
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      const res = await fetch(`/api/dipendenti?${searchParams.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch employees");
      }
      return res.json();
    },
    placeholderData: (prev) => prev,
  });
}
