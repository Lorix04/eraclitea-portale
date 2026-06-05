"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Download, Eye, Search, Trash2, Upload, UserPlus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ActionMenu from "@/components/ui/ActionMenu";
import { usePermissions } from "@/hooks/usePermissions";
import EmployeeTable, { type EmployeeColumn } from "@/components/EmployeeTable";
import TableColumnCustomizer from "@/components/TableColumnCustomizer";
import { useTablePreferences } from "@/hooks/useTablePreferences";
import { useEmployees } from "@/hooks/useEmployees";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import AddEmployeeModal from "@/components/AddEmployeeModal";
import ImportEmployeesModal from "@/components/ImportEmployeesModal";
import { getArrayData } from "@/lib/api-response";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import ErrorMessage from "@/components/ui/ErrorMessage";
import MobileFilterPanel from "@/components/ui/MobileFilterPanel";

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
  email?: string | null;
  telefono?: string | null;
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
  const { can } = usePermissions();
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
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const clientPickerRef = useRef<HTMLDivElement | null>(null);

  // Close the client picker when clicking outside
  useEffect(() => {
    if (!clientPickerOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (
        clientPickerRef.current &&
        !clientPickerRef.current.contains(event.target as Node)
      ) {
        setClientPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [clientPickerOpen]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId]
  );

  const filteredClientOptions = useMemo(() => {
    const q = clientSearchTerm.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      c.ragioneSociale.toLowerCase().includes(q)
    );
  }, [clients, clientSearchTerm]);

  const debouncedSearch = useDebounce(search, 300);

  // Check if selected client has custom fields
  const { data: cfStatus } = useQuery({
    queryKey: ["custom-fields-status", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/custom-fields?clientId=${clientId}`);
      if (!res.ok) return { enabled: false };
      return res.json();
    },
    enabled: !!clientId,
  });
  const clientHasCustom = !!clientId && cfStatus?.enabled;

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
      try {
        const res = await fetchWithRetry("/api/admin/clienti");
        if (!res.ok) {
          return;
        }
        const text = await res.text();
        const json = text ? JSON.parse(text) : {};
        const items = getArrayData<{ id: string; ragioneSociale: string }>(json);
        setClients(
          items.map((client: { id: string; ragioneSociale: string }) => ({
            id: client.id,
            ragioneSociale: client.ragioneSociale,
          }))
        );
      } catch {
        setClients([]);
      }
    };
    void loadClients();
  }, []);

  useEffect(() => {
    const loadEditions = async () => {
      try {
        const res = await fetchWithRetry("/api/edizioni?limit=500");
        if (!res.ok) {
          setEditions([]);
          return;
        }
        const json = await res.json();
        setEditions(getArrayData<EditionOption>(json));
      } catch {
        setEditions([]);
      }
    };
    void loadEditions();
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

  const { data, isLoading, error, refetch } = useEmployees({
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

  const buildExportUrl = (opts: { includeCustom?: boolean; fileFormat?: string }) => {
    const params: Record<string, string> = { search: debouncedSearch, clientId, sortOrder };
    if (opts.includeCustom) params.includeCustom = "true";
    if (opts.fileFormat) params.fileFormat = opts.fileFormat;
    return `/api/dipendenti/export?${buildQuery(params)}`;
  };

  const resetFilters = () => {
    setSearch("");
    setClientId("");
    setEditionId("");
    setCertStatus("all");
    setSortOrder("desc");
    setPage(1);
  };

  const editionLabel = (edition: EditionOption) => {
    const title = edition.course?.title ?? "Corso";
    const number = edition.editionNumber ? `Ed. #${edition.editionNumber}` : "Edizione";
    const client = edition.client?.ragioneSociale ? ` - ${edition.client.ragioneSociale}` : "";
    return `${title} - ${number}${client}`;
  };

  // Customizable column registry (default order). "Azioni" excluded — fixed/last.
  const employeeColumns = useMemo<EmployeeColumn<EmployeeRow>[]>(
    () => [
      {
        key: "nome",
        label: "Nome",
        header: "Nome",
        isPrimary: true,
        className: "px-4 py-3 font-medium",
        render: (e) => e.nome,
      },
      {
        key: "cognome",
        label: "Cognome",
        header: "Cognome",
        isSecondary: true,
        render: (e) => e.cognome,
      },
      {
        key: "codiceFiscale",
        label: "Codice Fiscale",
        header: "Codice Fiscale",
        className: "max-w-[180px] truncate px-4 py-3",
        render: (e) => e.codiceFiscale,
      },
      {
        key: "email",
        label: "Email",
        header: "Email",
        className: "max-w-[220px] truncate px-4 py-3",
        render: (e) => e.email || "-",
      },
      {
        key: "telefono",
        label: "Telefono",
        header: "Telefono",
        className: "max-w-[160px] truncate px-4 py-3",
        render: (e) => e.telefono || "-",
      },
      {
        key: "cliente",
        label: "Cliente",
        header: "Cliente",
        render: (e) => e.client?.ragioneSociale || "-",
      },
      {
        key: "corsi",
        label: "Corsi",
        header: "Corsi",
        render: (e) => e._count?.registrations ?? 0,
      },
    ],
    []
  );

  const {
    orderedVisibleColumns,
    allColumns,
    isHidden,
    setVisibility,
    reorder,
    reset: resetColumns,
  } = useTablePreferences<EmployeeColumn<EmployeeRow>>({
    tableKey: "admin.dipendenti",
    columns: employeeColumns,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Dipendenti</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci l&apos;elenco dipendenti e le iscrizioni ai corsi.
          </p>
        </div>
        {clientHasCustom ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((p) => !p)}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-md border px-4 py-2 text-sm"
            >
              <Download className="h-4 w-4" />
              Esporta
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-1 w-72 rounded-lg border bg-card shadow-lg">
                  <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">Formato standard</p>
                  <a href={buildExportUrl({ fileFormat: "xlsx" })} className="block px-4 py-2 text-sm hover:bg-muted/50" onClick={() => setExportMenuOpen(false)}>
                    Excel (.xlsx)
                  </a>
                  <a href={buildExportUrl({ fileFormat: "csv" })} className="block px-4 py-2 text-sm hover:bg-muted/50 border-b" onClick={() => setExportMenuOpen(false)}>
                    CSV (.csv)
                  </a>
                  <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">Formato cliente</p>
                  <a href={buildExportUrl({ includeCustom: true, fileFormat: "xlsx" })} className="block px-4 py-2 text-sm hover:bg-muted/50" onClick={() => setExportMenuOpen(false)}>
                    Excel (.xlsx)
                  </a>
                  <a href={buildExportUrl({ includeCustom: true, fileFormat: "csv" })} className="block px-4 py-2 text-sm hover:bg-muted/50" onClick={() => setExportMenuOpen(false)}>
                    CSV (.csv)
                  </a>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((p) => !p)}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-md border px-4 py-2 text-sm"
            >
              <Download className="h-4 w-4" />
              Esporta
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-1 w-56 rounded-lg border bg-card shadow-lg">
                  <a href={buildExportUrl({ fileFormat: "xlsx" })} className="block px-4 py-3 text-sm hover:bg-muted/50" onClick={() => setExportMenuOpen(false)}>
                    <p className="font-medium">Excel (.xlsx)</p>
                  </a>
                  <a href={buildExportUrl({ fileFormat: "csv" })} className="block px-4 py-3 text-sm hover:bg-muted/50" onClick={() => setExportMenuOpen(false)}>
                    <p className="font-medium">CSV (.csv)</p>
                  </a>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <MobileFilterPanel
        searchBar={
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border bg-background px-3 py-2 pl-9 text-sm"
              placeholder="Cerca nome, cognome o CF..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Cerca nome, cognome o codice fiscale"
            />
          </div>
        }
        activeFiltersCount={
          [clientId !== "", editionId !== "", certStatus !== "all", sortOrder !== "desc"].filter(Boolean).length
        }
        onReset={resetFilters}
        resultCount={<>{totalCount} dipendenti trovati</>}
        trailingControl={
          <TableColumnCustomizer
            columns={allColumns.map((c) => ({ key: c.key, label: c.label }))}
            isHidden={isHidden}
            setVisibility={setVisibility}
            reorder={reorder}
            reset={resetColumns}
          />
        }
        actions={
          <>
            {can("dipendenti", "import") ? (
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center rounded-md border px-3 py-2 text-sm"
                onClick={() => {
                  if (!clientId) {
                    toast.error("Seleziona un cliente specifico prima di importare");
                    return;
                  }
                  setImportModalOpen(true);
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importa CSV/Excel
              </button>
            ) : null}
            {can("dipendenti", "create") ? (
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                onClick={() => setAddModalOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Aggiungi dipendente
              </button>
            ) : null}
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:flex md:flex-wrap md:items-center">
          <div
            ref={clientPickerRef}
            className="relative w-full md:w-64"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm min-h-[40px]"
              onClick={() => setClientPickerOpen((prev) => !prev)}
              aria-label="Filtro cliente"
              aria-haspopup="listbox"
              aria-expanded={clientPickerOpen}
            >
              <span className={selectedClient ? "truncate" : "truncate text-muted-foreground"}>
                {selectedClient ? selectedClient.ragioneSociale : "Tutti i clienti"}
              </span>
              <ChevronDown
                className={`ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                  clientPickerOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {selectedClient ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setClientId("");
                  setClientSearchTerm("");
                }}
                className="absolute right-8 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Rimuovi filtro cliente"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {clientPickerOpen ? (
              <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-card shadow-lg">
                <div className="border-b p-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      placeholder="Cerca cliente..."
                      className="w-full rounded-md border bg-background py-2 pl-8 pr-3 text-sm"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto py-1" role="listbox">
                  <button
                    type="button"
                    onClick={() => {
                      setClientId("");
                      setClientPickerOpen(false);
                      setClientSearchTerm("");
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                    role="option"
                    aria-selected={!clientId}
                  >
                    <span className="text-muted-foreground">Tutti i clienti</span>
                    {!clientId ? <Check className="ml-2 h-4 w-4 text-primary" /> : null}
                  </button>
                  {filteredClientOptions.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      Nessun cliente trovato
                    </p>
                  ) : (
                    filteredClientOptions.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setClientId(client.id);
                          setClientPickerOpen(false);
                          setClientSearchTerm("");
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                        role="option"
                        aria-selected={clientId === client.id}
                      >
                        <span className="truncate">{client.ragioneSociale}</span>
                        {clientId === client.id ? (
                          <Check className="ml-2 h-4 w-4 text-primary" />
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <select
            className="w-full md:w-auto rounded-md border bg-background px-3 py-2 text-sm"
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
            className="w-full md:w-auto rounded-md border bg-background px-3 py-2 text-sm"
            value={certStatus}
            onChange={(event) => setCertStatus(event.target.value)}
            aria-label="Filtro attestati"
          >
            <option value="all">Tutti gli attestati</option>
            <option value="with">Con attestato</option>
            <option value="without">Senza attestato</option>
          </select>
          <select
            className="w-full md:w-auto rounded-md border bg-background px-3 py-2 text-sm"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")}
            aria-label="Ordinamento dipendenti"
          >
            <option value="desc">Piu recenti</option>
            <option value="asc">Piu vecchi</option>
          </select>
        </div>
      </MobileFilterPanel>

      {error ? (
        <ErrorMessage
          message="Si e verificato un errore nel caricamento dei dati. Riprova piu tardi."
          onRetry={() => void refetch()}
        />
      ) : null}

      <EmployeeTable<EmployeeRow>
        employees={pagedEmployees}
        columns={orderedVisibleColumns}
        basePath="/admin/dipendenti"
        isLoading={isLoading}
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
                href: `/admin/dipendenti/${employee.id}`,
                shortcutKey: "o",
              }}
              secondaryActions={[
                ...(can("dipendenti", "delete") ? [{
                  key: "delete",
                  label: "Elimina",
                  icon: Trash2,
                  variant: "danger" as const,
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
                }] : []),
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
          <button
            type="button"
            className="min-h-[44px] rounded-md border px-3 py-1"
            disabled={currentPage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Precedente
          </button>
          <button
            type="button"
            className="min-h-[44px] rounded-md border px-3 py-1"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Successiva
          </button>
        </div>
      </div>


      <AddEmployeeModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={() => {
          refetch();
        }}
      />

      {clientId ? (
        <ImportEmployeesModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          clientId={clientId}
          onImportComplete={() => {
            refetch();
          }}
        />
      ) : null}
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
