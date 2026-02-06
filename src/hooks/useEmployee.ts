import { useQuery } from "@tanstack/react-query";

type EmployeeDetail = {
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
  registrations?: Array<{
    id: string;
    status: "INSERTED" | "CONFIRMED" | "TRAINED";
    insertedAt: string | Date;
    course: { id: string; title: string; dateStart?: string | Date | null; dateEnd?: string | Date | null };
  }>;
  certificates?: Array<{
    id: string;
    achievedAt?: string | Date | null;
    expiresAt?: string | Date | null;
    uploadedAt?: string | Date | null;
    course?: { id: string; title: string } | null;
  }>;
};

type EmployeeDetailResponse = {
  data: EmployeeDetail;
};

export function useEmployee(id?: string) {
  return useQuery<EmployeeDetailResponse>({
    queryKey: ["employee", id],
    queryFn: async () => {
      const res = await fetch(`/api/dipendenti/${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch employee");
      }
      return res.json();
    },
    enabled: Boolean(id),
  });
}
