"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import EmployeeTable from "@/components/EmployeeTable";
import { useEmployees } from "@/hooks/useEmployees";
import { useDebounce } from "@/hooks/useDebounce";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

type ClientOption = { id: string; ragioneSociale: string };

type EditionOption = {
  id: string;
  editionNumber?: number | null;
  course?: { title?: string | null } | null;
  client?: { id?: string | null; ragioneSociale?: string | null } | null;
};

type EmployeeRow = {
  id: string;
  clientId: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  createdAt?: string | Date;
  client?: { id: string; ragioneSociale: string };
  _count?: { registrations?: number; certificates?: number };
  registrations?: { courseEditionId: string }[];
};

const PAGE_SIZE = 20;

function buildQuery(params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  return searchParams.toString();
}

function AdminDipendentiContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialSearch = searchParams.get("search") ?? "";
  const initialClientId = searchParams.get("clientId") ?? "";
  const initialEditionId = searchParams.get("editionId") ?? "";
  const initialCertStatus = searchParams.get("certStatus") ?? "all";
  const initialSortOrder = searchParams.get("sortOrder") ?? "desc";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const [search, setSearch] = useState(initialSearch);
  const [clientId, setClientId] = useState(initialClientId);
  const [editionId, setEditionId] = useState(initialEditionId);
  const [certStatus, setCertStatus] = useState(initialCertStatus);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    initialSortOrder === "asc" ? "asc" : "desc"
  );
  const [page, setPage] = useState(initialPage);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [editions, setEditions] = useState<EditionOption[]>([]);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, clientId, editionId, certStatus, sortOrder]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (clientId) params.set("clientId", clientId);
    if (editionId) params.set("editionId", editionId);
    if (certStatus && certStatus !== "all") params.set("certStatus", certStatus);
    if (sortOrder && sortOrder !== "desc") params.set("sortOrder", sortOrder);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, clientId, editionId, certStatus, sortOrder, page, router, pathname]);

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

  useEffect(() => {
    const loadEditions = async () => {
      const res = await fetch("/api/edizioni?limit=500");
      if (!res.ok) {
        setEditions([]);
        return;
      }
      const json = await res.json();
      setEditions(json.data ?? []);
    };
    loadEditions();
  }, []);

  const editionOptions = useMemo(() => {
    if (!clientId) return editions;
    return editions.filter((edition) => edition.client?.id === clientId);
  }, [editions, clientId]);

  useEffect(() => {
    if (editionId && !editionOptions.some((edition) => edition.id === editionId)) {
      setEditionId("");
    }
  }, [editionId, editionOptions]);

  const { data, isLoading, refetch } = useEmployees({
    page: 1,
    limit: 1000,
    includeRegistrations: true,
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

  const allEmployees = useMemo<EmployeeRow[]>(() => data?.data ?? [], [data]);

  const filteredEmployees = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    let items = allEmployees;

    if (term) {
      items = items.filter((employee) => {
        const nome = employee.nome?.toLowerCase() ?? "";
        const cognome = employee.cognome?.toLowerCase() ?? "";
        const cf = employee.codiceFiscale?.toLowerCase() ?? "";
        return (
          nome.includes(term) ||
          cognome.includes(term) ||
          cf.includes(term)
        );
      });
    }

    if (clientId) {
      items = items.filter((employee) => employee.clientId === clientId);
    }

    if (editionId) {
      items = items.filter((employee) =>
        (employee.registrations ?? []).some(
          (reg) => reg.courseEditionId === editionId
        )
      );
    }

    if (certStatus === "with") {
      items = items.filter((employee) => (employee._count?.certificates ?? 0) > 0);
    }
    if (certStatus === "without") {
      items = items.filter((employee) => (employee._count?.certificates ?? 0) === 0);
    }

    const sorted = [...items].sort((a, b) => {
      const dateA = new Date(a.createdAt ?? 0).getTime();
      const dateB = new Date(b.createdAt ?? 0).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return sorted;
  }, [allEmployees, debouncedSearch, clientId, editionId, certStatus, sortOrder]);

  const totalCount = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedEmployees = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, currentPage]);

  const exportUrl = useMemo(
    () =>
      `/api/dipendenti/export?${buildQuery({
        search: debouncedSearch,
        clientId,
        sortOrder,
      })}`,
    [debouncedSearch, clientId, sortOrder]
  );

  const resetFilters = () => {
    setSearch("");
    setClientId("");
    setEditionId("");
    setCertStatus("all");
    setSortOrder("desc");
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

  const editionLabel = (edition: EditionOption) => {
    const title = edition.course?.title ?? "Corso";
    const number = edition.editionNumber ? `Ed. #${edition.editionNumber}` : "Edizione";
    const client = edition.client?.ragioneSociale ? ` - ${edition.client.ragioneSociale}` : "";
    return `${title} - ${number}${client}`;
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
        <Link href={exportUrl} className="rounded-md border px-4 py-2 text-sm">
          Esporta CSV
        </Link>
      </div>

      <div className="space-y-3">
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
            value={editionId}
            onChange={(event) => setEditionId(event.target.value)}
            aria-label="Filtro edizione"
          >
            <option value="">Tutte le edizioni</option>
            {editionOptions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {editionLabel(edition)}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={certStatus}
            onChange={(event) => setCertStatus(event.target.value)}
            aria-label="Filtro attestati"
          >
            <option value="all">Tutti gli attestati</option>
            <option value="with">Con attestato</option>
            <option value="without">Senza attestato</option>
          </select>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")}
            aria-label="Ordinamento dipendenti"
          >
            <option value="desc">Piu recenti</option>
            <option value="asc">Piu vecchi</option>
          </select>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {totalCount} dipendenti trovati
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
        employees={pagedEmployees}
        showClient
        basePath="/admin/dipendenti"
        isLoading={isLoading}
        onDelete={handleDeleteClick}
      />

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Pagina {currentPage} di {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1"
            disabled={currentPage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Precedente
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1"
            disabled={currentPage >= totalPages}
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
            : "Questa azione non puo essere annullata."
        }
      />
    </div>
  );
}

export default function AdminDipendentiPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      }
    >
      <AdminDipendentiContent />
    </Suspense>
  );
}
