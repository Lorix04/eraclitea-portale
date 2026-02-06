"use client";

import { useEffect, useMemo, useState } from "react";
import EmployeeTable from "@/components/EmployeeTable";
import { useEmployees } from "@/hooks/useEmployees";
import { useDebounce } from "@/hooks/useDebounce";
import { BrandedButton } from "@/components/BrandedButton";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { toast } from "sonner";

function buildQuery(params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  return searchParams.toString();
}

export default function ClientDipendentiPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, refetch } = useEmployees({
    search: debouncedSearch,
    page,
    limit: 20,
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{
    id: string;
    nome: string;
    cognome: string;
    registrationsCount: number;
    certificatesCount: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages =
    data?.totalPages ?? Math.max(1, Math.ceil((data?.total ?? 0) / 20));

  const exportUrl = useMemo(
    () => `/api/dipendenti/export?${buildQuery({ search: debouncedSearch })}`,
    [debouncedSearch]
  );

  const handleDeleteClick = (employee: {
    id: string;
    nome: string;
    cognome: string;
    _count?: { registrations?: number; certificates?: number };
  }) => {
    setEmployeeToDelete({
      id: employee.id,
      nome: employee.nome,
      cognome: employee.cognome,
      registrationsCount: employee._count?.registrations ?? 0,
      certificatesCount: employee._count?.certificates ?? 0,
    });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/dipendenti/${employeeToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Dipendente eliminato con successo");
        setDeleteModalOpen(false);
        setEmployeeToDelete(null);
        refetch();
      } else {
        const dataRes = await res.json().catch(() => ({}));
        toast.error(dataRes?.error ?? "Errore durante l'eliminazione");
      }
    } catch (error) {
      console.error("Errore eliminazione dipendente:", error);
      toast.error("Errore durante l'eliminazione del dipendente");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Dipendenti</h1>
          <p className="text-sm text-muted-foreground">
            Consulta i dipendenti associati ai tuoi corsi.
          </p>
        </div>
        <a href={exportUrl} className="btn-brand-outline rounded-md px-4 py-2 text-sm">
          Esporta CSV
        </a>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-64"
          placeholder="Cerca nome, cognome o CF"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <EmployeeTable
        employees={data?.data ?? []}
        basePath="/dipendenti"
        isLoading={isLoading}
        useBranding
        onDelete={handleDeleteClick}
      />

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Pagina {page} di {totalPages}
        </span>
        <div className="flex gap-2">
          <BrandedButton
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Precedente
          </BrandedButton>
          <BrandedButton
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Successiva
          </BrandedButton>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Elimina dipendente"
        description="Sei sicuro di voler eliminare questo dipendente?"
        itemName={
          employeeToDelete
            ? `${employeeToDelete.nome} ${employeeToDelete.cognome}`
            : undefined
        }
        isDeleting={isDeleting}
        warningMessage={
          employeeToDelete &&
          (employeeToDelete.registrationsCount > 0 ||
            employeeToDelete.certificatesCount > 0)
            ? `Questo dipendente ha ${employeeToDelete.registrationsCount} iscrizioni a corsi e ${employeeToDelete.certificatesCount} attestati. Tutti i dati associati verranno eliminati.`
            : "Questa azione non può essere annullata."
        }
      />
    </div>
  );
}
