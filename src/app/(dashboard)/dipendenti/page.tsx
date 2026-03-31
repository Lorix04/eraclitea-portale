"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown, Download, Eye, Plus, Search, Trash2, Upload } from "lucide-react";
import ActionMenu from "@/components/ui/ActionMenu";
import MobileFilterPanel from "@/components/ui/MobileFilterPanel";
import EmployeeTable from "@/components/EmployeeTable";
import { useEmployees } from "@/hooks/useEmployees";
import { useDebounce } from "@/hooks/useDebounce";
import { BrandedButton } from "@/components/BrandedButton";
import AddEmployeeModal from "@/components/AddEmployeeModal";
import ImportEmployeesModal from "@/components/ImportEmployeesModal";
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
  const initialSortOrder = searchParams.get("sortOrder") ?? "asc";
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
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
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
    if (sortOrder && sortOrder !== "asc") params.set("sortOrder", sortOrder);
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
      const cognomeA = (a.cognome ?? "").trim();
      const cognomeB = (b.cognome ?? "").trim();
      const nomeA = (a.nome ?? "").trim();
      const nomeB = (b.nome ?? "").trim();

      const byCognome = cognomeA.localeCompare(cognomeB, "it", {
        sensitivity: "base",
      });
      if (byCognome !== 0) {
        return sortOrder === "asc" ? byCognome : -byCognome;
      }

      const byNome = nomeA.localeCompare(nomeB, "it", {
        sensitivity: "base",
      });
      return sortOrder === "asc" ? byNome : -byNome;
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

  const buildExportUrl = (fileFormat: string) => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    params.set("includeCustom", "true");
    params.set("fileFormat", fileFormat);
    return `/api/dipendenti/export?${params.toString()}`;
  };

  const resetFilters = () => {
    setSearch("");
    setEditionId("");
    setCertStatus("all");
    setSortOrder("asc");
    setPage(1);
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((p) => !p)}
              className="btn-brand-outline inline-flex min-h-[44px] items-center gap-1 rounded-md px-4 py-2 text-sm"
            >
              <Download className="h-4 w-4" />
              Esporta
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border bg-card shadow-lg">
                  <a href={buildExportUrl("xlsx")} className="block px-4 py-3 text-sm hover:bg-muted/50" onClick={() => setExportMenuOpen(false)}>
                    Excel (.xlsx)
                  </a>
                  <a href={buildExportUrl("csv")} className="block px-4 py-3 text-sm hover:bg-muted/50" onClick={() => setExportMenuOpen(false)}>
                    CSV (.csv)
                  </a>
                </div>
              </>
            )}
          </div>
          <BrandedButton
            variant="outline"
            size="sm"
            onClick={() => {
              if (!sessionClientId) {
                toast.error("Cliente non disponibile");
                return;
              }
              setImportModalOpen(true);
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            Importa CSV/Excel
          </BrandedButton>
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

      <MobileFilterPanel
        searchBar={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full min-h-[44px] rounded-md border bg-background px-3 py-2 pl-9 text-sm"
              placeholder="Cerca nome, cognome o CF"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        }
        activeFiltersCount={
          (editionId ? 1 : 0) +
          (certStatus !== "all" ? 1 : 0) +
          (sortOrder !== "asc" ? 1 : 0)
        }
        onReset={resetFilters}
        resultCount={`${totalCount} dipendenti trovati`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="w-full min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm md:w-auto"
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
            className="w-full min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm md:w-auto"
            value={certStatus}
            onChange={(event) => setCertStatus(event.target.value)}
            aria-label="Filtro attestati"
          >
            <option value="all">Tutti gli attestati</option>
            <option value="with">Con attestato</option>
            <option value="without">Senza attestato</option>
          </select>
          <select
            className="w-full min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm md:w-auto"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")}
            aria-label="Ordinamento dipendenti"
          >
            <option value="asc">Nome A-Z</option>
            <option value="desc">Nome Z-A</option>
          </select>
        </div>
      </MobileFilterPanel>

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
        renderActions={(employee) => {
          const regCount = employee._count?.registrations ?? 0;
          const certCount = employee._count?.certificates ?? 0;
          const hasData = regCount > 0 || certCount > 0;
          return (
            <ActionMenu
              primaryAction={{
                key: "detail",
                label: "Dettaglio",
                icon: Eye,
                variant: "info",
                href: `/dipendenti/${employee.id}`,
                shortcutKey: "o",
              }}
              secondaryActions={[
                {
                  key: "delete",
                  label: "Elimina",
                  icon: Trash2,
                  variant: "danger",
                  requireConfirm: true,
                  confirmMessage: hasData
                    ? `${employee.nome} ${employee.cognome} ha ${regCount} iscrizioni e ${certCount} attestati. Eliminare?`
                    : `Eliminare ${employee.nome} ${employee.cognome}?`,
                  onClick: async () => {
                    const res = await fetch(`/api/dipendenti/${employee.id}`, { method: "DELETE" });
                    if (res.ok) {
                      toast.success("Dipendente eliminato con successo");
                      refetch();
                    } else {
                      const d = await res.json().catch(() => ({}));
                      toast.error(d?.error ?? "Errore durante l'eliminazione");
                    }
                  },
                  shortcutKey: "Delete",
                  shortcutLabel: "Del",
                },
              ]}
            />
          );
        }}
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

      {sessionClientId ? (
        <ImportEmployeesModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          clientId={sessionClientId}
          onImportComplete={() => {
            refetch();
          }}
        />
      ) : null}
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
