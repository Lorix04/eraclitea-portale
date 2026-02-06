"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Mail, Search, X } from "lucide-react";
import EmployeeTable from "@/components/EmployeeTable";
import { useEmployees } from "@/hooks/useEmployees";
import { useDebounce } from "@/hooks/useDebounce";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { toast } from "sonner";

type ClientOption = { id: string; ragioneSociale: string };

function buildQuery(params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  return searchParams.toString();
}

export default function AdminDipendentiPage() {
  const [search, setSearch] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [clientId, setClientId] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [hasCourses, setHasCourses] = useState("all");
  const [page, setPage] = useState(1);
  const [clients, setClients] = useState<ClientOption[]>([]);

  const debouncedSearch = useDebounce(search, 300);
  const debouncedSearchEmail = useDebounce(searchEmail, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedSearchEmail, clientId, sortBy, sortOrder, hasCourses]);

  const { data, isLoading, refetch } = useEmployees({
    search: debouncedSearch,
    searchEmail: debouncedSearchEmail,
    clientId: clientId || undefined,
    sortBy,
    sortOrder,
    hasCourses: hasCourses as "all" | "with" | "without",
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

  useEffect(() => {
    const loadClients = async () => {
      const res = await fetch("/api/admin/clienti");
      if (!res.ok) {
        return;
      }
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      const items = json.data ?? [];
      setClients(
        items.map((client: { id: string; ragioneSociale: string }) => ({
          id: client.id,
          ragioneSociale: client.ragioneSociale,
        }))
      );
    };
    loadClients();
  }, []);

  const totalPages =
    data?.totalPages ?? Math.max(1, Math.ceil((data?.total ?? 0) / 20));

  const exportUrl = useMemo(
    () =>
      `/api/dipendenti/export?${buildQuery({
        search: debouncedSearch,
        searchEmail: debouncedSearchEmail,
        clientId,
        sortBy,
        sortOrder,
        hasCourses,
      })}`,
    [debouncedSearch, debouncedSearchEmail, clientId, sortBy, sortOrder, hasCourses]
  );

  const resetFilters = () => {
    setSearch("");
    setSearchEmail("");
    setClientId("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setHasCourses("all");
    setPage(1);
  };

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
            Gestisci l&apos;elenco dipendenti e le iscrizioni ai corsi.
          </p>
        </div>
        <Link
          href={exportUrl}
          className="rounded-md border px-4 py-2 text-sm"
        >
          Esporta CSV
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border bg-background px-3 py-2 pl-9 text-sm"
              placeholder="Cerca nome, cognome o CF..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Cerca nome, cognome o codice fiscale"
            />
          </div>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            aria-label="Filtro cliente"
          >
            <option value="">Tutti i clienti</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.ragioneSociale}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={hasCourses}
            onChange={(event) => setHasCourses(event.target.value)}
            aria-label="Filtro corsi"
          >
            <option value="all">Tutti</option>
            <option value="with">Con corsi</option>
            <option value="without">Senza corsi</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-56">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border bg-background px-3 py-2 pl-9 text-sm"
              placeholder="Cerca per email..."
              value={searchEmail}
              onChange={(event) => setSearchEmail(event.target.value)}
              aria-label="Cerca per email"
            />
          </div>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={`${sortBy}-${sortOrder}`}
            onChange={(event) => {
              const [field, order] = event.target.value.split("-");
              setSortBy(field);
              setSortOrder(order as "asc" | "desc");
            }}
            aria-label="Ordinamento dipendenti"
          >
            <option value="createdAt-desc">Piu recenti</option>
            <option value="createdAt-asc">Piu antichi</option>
            <option value="cognome-asc">Cognome A-Z</option>
            <option value="cognome-desc">Cognome Z-A</option>
            <option value="nome-asc">Nome A-Z</option>
            <option value="nome-desc">Nome Z-A</option>
            <option value="coursesCount-desc">Piu corsi</option>
            <option value="coursesCount-asc">Meno corsi</option>
          </select>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {data?.total ?? 0} dipendenti
            </span>
            <button
              type="button"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm text-muted-foreground"
              onClick={resetFilters}
            >
              <X className="mr-1 h-4 w-4" />
              Resetta
            </button>
          </div>
        </div>
      </div>

      <EmployeeTable
        employees={data?.data ?? []}
        showClient
        basePath="/admin/dipendenti"
        isLoading={isLoading}
        onDelete={handleDeleteClick}
      />

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Pagina {page} di {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Precedente
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Successiva
          </button>
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
            ? `Questo dipendente ha ${employeeToDelete.registrationsCount} iscrizioni a corsi e ${employeeToDelete.certificatesCount} attestati. Tutti i dati associati verranno eliminati permanentemente.`
            : "Questa azione non può essere annullata."
        }
      />
    </div>
  );
}
