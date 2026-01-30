import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

type Employee = {
  id?: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  dataNascita?: string;
  luogoNascita?: string;
  email?: string;
  mansione?: string;
  note?: string;
};

export function useSaveRegistrations(courseId?: string) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const mutation = useMutation({
    mutationFn: async (employees: Employee[]) => {
      const res = await fetch("/api/anagrafiche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, employees }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Errore durante il salvataggio");
      }
      return res.json();
    },
    onSuccess: () => {
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ["registrations", courseId] });
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? `Salvataggio fallito: ${err.message}` : "Salvataggio fallito"
      );
    },
  });

  const debouncedSave = useCallback(
    (employees: Employee[]) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        mutation.mutate(employees);
      }, 1000);
    },
    [mutation]
  );

  const saveNow = useCallback(
    (employees: Employee[]) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      mutation.mutate(employees);
    },
    [mutation]
  );

  return {
    debouncedSave,
    saveNow,
    isSaving: mutation.isPending,
    lastSaved: mutation.data?.savedAt ?? null,
  };
}
