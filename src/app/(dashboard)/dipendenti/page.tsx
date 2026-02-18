"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Search, X } from "lucide-react";
import EmployeeTable from "@/components/EmployeeTable";
import { useEmployees } from "@/hooks/useEmployees";
import { useDebounce } from "@/hooks/useDebounce";
import { BrandedButton } from "@/components/BrandedButton";
import AddEmployeeModal from "@/components/AddEmployeeModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

type EditionOption = {
  id: string;
  label: string;
};

type EmployeeRow = {
  id: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  email?: string | null;
  telefono?: string | null;
  createdAt?: string | Date;
  _count?: { registrations?: number; certificates?: number };
  registrations?: { courseEditionId: string }[];
};

const PAGE_SIZE = 20;

function ClientDipendentiContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialSearch = searchParams.get("search") ?? "";
  const initialEdition = searchParams.get("editionId") ?? "";
  const initialCertStatus = searchParams.get("certStatus") ?? "all";
  const initialSortOrder = searchParams.get("sortOrder") ?? "desc";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const [search, setSearch] = useState(initialSearch);
  const [editionId, setEditionId] = useState(initialEdition);
  const [certStatus, setCertStatus] = useState(initialCertStatus);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    initialSortOrder === "asc" ? "asc" : "desc"
  );
  const [page, setPage] = useState(initialPage);
  const [editions, setEditions] = useState<EditionOption[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { data: session } = useSession();
  const sessionClientId = session?.user?.clientId ?? undefined;

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, editionId, certStatus, sortOrder]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (editionId) params.set("editionId", editionId);
    if (certStatus && certStatus !== "all") params.set("certStatus", certStatus);
    if (sortOrder && sortOrder !== "desc") params.set("sortOrder", sortOrder);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, editionId, certStatus, sortOrder, page, router, pathname]);

  useEffect(() => {
    const loadEditions = async () => {
      const res = await fetch("/api/corsi/cliente?tab=tutti&all=true");
      if (!res.ok) {
        setEditions([]);
        return;
      }
      const json = await res.json();
      const data = json.data ?? [];
      const options: EditionOption[] = [];
      data.forEach((course: any) => {
        (course.editions ?? []).forEach((edition: any) => {
          const editionLabel = edition.editionNumber
            ? `Ed. #${edition.editionNumber}`
            : "Edizione";
          options.push({
            id: edition.id,
            label: `${course.title} - ${editionLabel}`,
          });
        });
      });
      setEditions(options);
    };
    loadEditions();
  }, []);

  const { data, isLoading, isError, refetch } = useEmployees({
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
  }, [allEmployees, debouncedSearch, editionId, certStatus, sortOrder]);

  const totalCount = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedEmployees = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, currentPage]);

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    return `/api/dipendenti/export?${params.toString()}`;
  }, [debouncedSearch]);

  const resetFilters = () => {
    setSearch("");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Dipendenti</h1>
          <p className="text-sm text-muted-foreground">
            Consulta i dipendenti associati ai tuoi corsi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={exportUrl}
            className="btn-brand-outline inline-flex min-h-[44px] items-center rounded-md px-4 py-2 text-sm"
          >
            Esporta CSV
          </a>
          <BrandedButton
            size="sm"
            onClick={() => {
              if (!sessionClientId) {
                toast.error("Cliente non disponibile");
                return;
              }
              setAddModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi dipendente
          </BrandedButton>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full min-h-[44px] rounded-md border bg-background px-3 py-2 pl-9 text-sm"
              placeholder="Cerca nome, cognome o CF"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm"
            value={editionId}
            onChange={(event) => setEditionId(event.target.value)}
            aria-label="Filtro edizione"
          >
            <option value="">Tutte le edizioni</option>
            {editions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {edition.label}
              </option>
            ))}
          </select>
          <select
            className="min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm"
            value={certStatus}
            onChange={(event) => setCertStatus(event.target.value)}
            aria-label="Filtro attestati"
          >
            <option value="all">Tutti gli attestati</option>
            <option value="with">Con attestato</option>
            <option value="without">Senza attestato</option>
          </select>
          <select
            className="min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm"
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
              className="inline-flex min-h-[44px] items-center rounded-md border px-3 py-2 text-sm text-muted-foreground"
              onClick={resetFilters}
            >
              <X className="mr-1 h-4 w-4" />
              Resetta
            </button>
          </div>
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.
        </div>
      ) : null}

      <EmployeeTable
        employees={pagedEmployees}
        basePath="/dipendenti"
        isLoading={isLoading}
        useBranding
        onDelete={handleDeleteClick}
      />

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Pagina {currentPage} di {totalPages}
        </span>
        <div className="flex gap-2">
          <BrandedButton
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Precedente
          </BrandedButton>
          <BrandedButton
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
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
            : "Questa azione non puo essere annullata."
        }
      />

      <AddEmployeeModal
        open={addModalOpen}
        clientId={sessionClientId}
        branded
        onClose={() => setAddModalOpen(false)}
        onCreated={() => {
          refetch();
          setAddModalOpen(false);
        }}
      />
    </div>
  );
}

export default function ClientDipendentiPage() {
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
      <ClientDipendentiContent />
    </Suspense>
  );
}
