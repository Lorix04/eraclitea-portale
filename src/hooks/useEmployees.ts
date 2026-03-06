import { useQuery } from "@tanstack/react-query";
import { getArrayData } from "@/lib/api-response";
import { fetchWithRetry } from "@/lib/fetch-with-retry";

type UseEmployeesParams = {
  search?: string;
  clientId?: string;
  excludeEditionId?: string;
  searchEmail?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  hasCourses?: "all" | "with" | "without";
  page?: number;
  limit?: number;
  includeRegistrations?: boolean;
  enabled?: boolean;
};

type EmployeeRow = {
  id: string;
  clientId: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  sesso?: string | null;
  dataNascita?: string | Date | null;
  luogoNascita?: string | null;
  email?: string | null;
  telefono?: string | null;
  cellulare?: string | null;
  indirizzo?: string | null;
  comuneResidenza?: string | null;
  cap?: string | null;
  provincia?: string | null;
  regione?: string | null;
  emailAziendale?: string | null;
  partitaIva?: string | null;
  iban?: string | null;
  pec?: string | null;
  mansione?: string | null;
  note?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  client?: { id: string; ragioneSociale: string };
  _count?: { registrations?: number; certificates?: number };
  coursesCompleted?: number;
  registrations?: { courseEditionId: string }[];
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
      if (params.excludeEditionId) {
        searchParams.set("excludeEditionId", params.excludeEditionId);
      }
      if (params.searchEmail) searchParams.set("searchEmail", params.searchEmail);
      if (params.sortBy) searchParams.set("sortBy", params.sortBy);
      if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
      if (params.hasCourses) searchParams.set("hasCourses", params.hasCourses);
      if (params.includeRegistrations) {
        searchParams.set("includeRegistrations", "true");
      }
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      const res = await fetchWithRetry(`/api/dipendenti?${searchParams.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch employees");
      }
      const payload = (await res.json()) as Partial<EmployeesResponse>;
      return {
        data: getArrayData<EmployeeRow>(payload),
        total: typeof payload.total === "number" ? payload.total : 0,
        page: typeof payload.page === "number" ? payload.page : params.page ?? 1,
        limit:
          typeof payload.limit === "number" ? payload.limit : params.limit ?? 20,
        totalPages:
          typeof payload.totalPages === "number" ? payload.totalPages : 1,
      } satisfies EmployeesResponse;
    },
    enabled: params.enabled ?? true,
    placeholderData: (prev) => prev,
    retry: false,
  });
}
