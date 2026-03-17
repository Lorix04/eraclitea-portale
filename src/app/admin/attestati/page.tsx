"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Pencil, Plus, Search, Trash2, User } from "lucide-react";
import MobileFilterPanel from "@/components/ui/MobileFilterPanel";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { formatItalianDate } from "@/lib/date-utils";
import { getArrayData } from "@/lib/api-response";
import { EditCertificateModal } from "@/components/admin/EditCertificateModal";
import ActionMenu from "@/components/ui/ActionMenu";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import ResponsiveTable, { type Column } from "@/components/ui/ResponsiveTable";
import ErrorMessage from "@/components/ui/ErrorMessage";

type CertificateRow = {
  id: string;
  filePath: string;
  achievedAt?: string | null;
  expiresAt?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
  employeeId: string;
  employee?: { nome: string; cognome: string };
  client?: { id?: string; ragioneSociale: string };
  courseEdition?: {
    id: string;
    editionNumber?: number | null;
    course?: { id?: string; title: string } | null;
  } | null;
};

type ClientOption = {
  id: string;
  ragioneSociale: string;
};

type CourseOption = {
  id: string;
  title: string;
};

type EmployeeOption = {
  id: string;
  nome: string;
  cognome: string;
};

type EditionOption = {
  id: string;
  editionNumber?: number | null;
  course?: { title?: string | null } | null;
  client?: { ragioneSociale?: string | null } | null;
};

type ApiResponse = {
  data: CertificateRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function getFileName(filePath: string) {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}

function getEditionLabel(edition: EditionOption, includeClient: boolean) {
  const title = edition.course?.title ?? "Corso";
  const editionNumber = edition.editionNumber
    ? `Ed. #${edition.editionNumber}`
    : "Edizione";
  const clientLabel = edition.client?.ragioneSociale
    ? ` · ${edition.client.ragioneSociale}`
    : "";
  return `${title} (${editionNumber})${includeClient ? clientLabel : ""}`;
}

function getExpiryBadge(expiresAt?: string | null) {
  if (!expiresAt) {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
        N/D
      </span>
    );
  }

  const now = new Date();
  const exp = new Date(expiresAt);
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
        Scaduto
      </span>
    );
  }

  if (daysLeft <= 30) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
        Scade tra {daysLeft}gg
      </span>
    );
  }

  if (daysLeft <= 90) {
    return (
      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
        In scadenza
      </span>
    );
  }

  return (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
      Valido
    </span>
  );
}

export default function AdminAttestatiPage() {
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [clientId, setClientId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [courseEditionId, setCourseEditionId] = useState<string | null>(null);
  const [expiryStatus, setExpiryStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [searchEmployee, setSearchEmployee] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [period, setPeriod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const debouncedSearchEmployee = useDebounce(searchEmployee, 300);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [editions, setEditions] = useState<EditionOption[]>([]);
  const [editCertificateId, setEditCertificateId] = useState<string | null>(null);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (clientId) params.set("clientId", clientId);
    if (courseId) params.set("courseId", courseId);
    if (employeeId) params.set("employeeId", employeeId);
    if (courseEditionId) params.set("courseEditionId", courseEditionId);
    if (expiryStatus !== "all") params.set("expiryStatus", expiryStatus);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (debouncedSearchEmployee) {
      params.set("searchEmployee", debouncedSearchEmployee);
    }
    params.set("sortOrder", sortOrder);
    if (period !== "all") params.set("period", period);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    try {
      const res = await fetchWithRetry(`/api/attestati?${params.toString()}`);
      if (!res.ok) {
        setError("Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.");
        setCertificates([]);
        setTotalPages(1);
        setTotal(0);
        return;
      }
      const data: ApiResponse = await res.json();
      setCertificates(getArrayData<CertificateRow>(data));
      setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 1);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch {
      setError("Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.");
      setCertificates([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    clientId,
    courseId,
    employeeId,
    courseEditionId,
    expiryStatus,
    debouncedSearch,
    debouncedSearchEmployee,
    sortOrder,
    period,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  useEffect(() => {
    fetchWithRetry("/api/clienti")
      .then((res) => res.json())
      .then((data) => setClients(getArrayData<ClientOption>(data)))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    fetchWithRetry("/api/corsi")
      .then((res) => res.json())
      .then((data) => setCourses(getArrayData<CourseOption>(data)))
      .catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    const url = clientId
      ? `/api/edizioni?clientId=${clientId}&limit=500`
      : "/api/edizioni?limit=500";
    fetchWithRetry(url)
      .then((res) => res.json())
      .then((data) => setEditions(getArrayData<EditionOption>(data)))
      .catch(() => setEditions([]));
  }, [clientId]);

  useEffect(() => {
    if (!clientId) {
      setEmployees([]);
      setEmployeeId(null);
      return;
    }
    fetchWithRetry(`/api/dipendenti?clientId=${clientId}&limit=500`)
      .then((res) => res.json())
      .then((data) => setEmployees(getArrayData<EmployeeOption>(data)))
      .catch(() => setEmployees([]));
  }, [clientId]);

  const handleDownload = async (id: string, fileName?: string) => {
    const res = await fetch(`/api/attestati/${id}/download`);
    if (!res.ok) {
      toast.error("Errore durante il download");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "attestato.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      const res = await fetch(`/api/attestati/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Attestato eliminato");
        fetchCertificates();
      } else {
        const dataRes = await res.json().catch(() => ({}));
        toast.error(dataRes?.error ?? "Errore durante l'eliminazione");
      }
    } catch (error) {
      console.error("Errore eliminazione attestato:", error);
      toast.error("Errore durante l'eliminazione dell'attestato");
    }
  };

  const handleDownloadAll = async () => {
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", clientId);
    if (employeeId) params.set("employeeId", employeeId);
    if (courseEditionId) params.set("courseEditionId", courseEditionId);

    const res = await fetch(`/api/attestati/download-all?${params.toString()}`);
    if (!res.ok) {
      toast.error("Errore durante il download ZIP");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attestati_${new Date().toISOString().split("T")[0]}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resultLabel = useMemo(
    () => `${total} attestati trovati`,
    [total]
  );

  const resetFilters = () => {
    setClientId(null);
    setCourseId(null);
    setEmployeeId(null);
    setCourseEditionId(null);
    setExpiryStatus("all");
    setSearch("");
    setSearchEmployee("");
    setSortOrder("desc");
    setPeriod("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Attestati</h1>
          <p className="text-muted-foreground">Gestione attestati caricati</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center rounded-md border px-3 py-2 text-sm"
            onClick={handleDownloadAll}
          >
            <Download className="mr-2 h-4 w-4" />
            Scarica tutti (ZIP)
          </button>
          <Link
            href="/admin/attestati/upload"
            className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
          >
            <Plus className="mr-2 h-4 w-4" />
            Carica attestato
          </Link>
        </div>
      </div>

      {error ? (
        <ErrorMessage message={error} onRetry={() => void fetchCertificates()} />
      ) : null}

      <MobileFilterPanel
        searchBar={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Cerca per nome file..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm md:w-[200px]"
              aria-label="Cerca per nome file"
            />
          </div>
        }
        activeFiltersCount={
          (clientId ? 1 : 0) +
          (courseId ? 1 : 0) +
          (employeeId ? 1 : 0) +
          (courseEditionId ? 1 : 0) +
          (sortOrder !== "desc" ? 1 : 0) +
          (expiryStatus !== "all" ? 1 : 0) +
          (searchEmployee ? 1 : 0) +
          (period !== "all" ? 1 : 0) +
          (dateFrom ? 1 : 0) +
          (dateTo ? 1 : 0)
        }
        onReset={resetFilters}
        resultCount={resultLabel}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-4">
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm lg:w-[180px]"
            value={clientId ?? "all"}
            onChange={(event) => {
              const value = event.target.value;
              setClientId(value === "all" ? null : value);
              setPage(1);
            }}
          >
            <option value="all">Tutti i clienti</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.ragioneSociale}
              </option>
            ))}
          </select>

          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm lg:w-[200px]"
            value={courseId ?? "all"}
            onChange={(event) => {
              const value = event.target.value;
              setCourseId(value === "all" ? null : value);
              setPage(1);
            }}
          >
            <option value="all">Tutti i corsi</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>

          {clientId ? (
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm lg:w-[180px]"
              value={employeeId ?? "all"}
              onChange={(event) => {
                const value = event.target.value;
                setEmployeeId(value === "all" ? null : value);
                setPage(1);
              }}
            >
              <option value="all">Tutti i dipendenti</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.nome} {employee.cognome}
                </option>
              ))}
            </select>
          ) : null}

          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm lg:w-[180px]"
            value={courseEditionId ?? "all"}
            onChange={(event) => {
              const value = event.target.value;
              setCourseEditionId(value === "all" ? null : value);
              setPage(1);
            }}
          >
            <option value="all">Tutte le edizioni</option>
            <option value="external">Solo esterni</option>
            {editions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {getEditionLabel(edition, !clientId)}
              </option>
            ))}
          </select>

          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm lg:w-[180px]"
            value={expiryStatus}
            onChange={(event) => {
              setExpiryStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tutti gli stati scadenza</option>
            <option value="valid">Validi</option>
            <option value="expiring">In scadenza (&lt; 90gg)</option>
            <option value="expired">Scaduti</option>
          </select>

          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm lg:w-[180px]"
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value as "asc" | "desc");
              setPage(1);
            }}
          >
            <option value="desc">Piu recenti prima</option>
            <option value="asc">Piu antichi prima</option>
          </select>

          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Cerca per dipendente..."
              value={searchEmployee}
              onChange={(event) => {
                setSearchEmployee(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm lg:w-[200px]"
              aria-label="Cerca per dipendente"
            />
          </div>

          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm lg:w-[160px]"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tutti i periodi</option>
            <option value="today">Oggi</option>
            <option value="week">Ultima settimana</option>
            <option value="month">Ultimo mese</option>
            <option value="year">Ultimo anno</option>
          </select>

          <div className="flex w-full items-center gap-2 lg:w-auto">
            <span className="text-sm text-muted-foreground">Da:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPeriod("all");
                setPage(1);
              }}
              className="w-full rounded-md border bg-background px-2 py-2 text-sm lg:w-[150px] lg:px-3"
              aria-label="Data da"
            />
          </div>
          <div className="flex w-full items-center gap-2 lg:w-auto">
            <span className="text-sm text-muted-foreground">A:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPeriod("all");
                setPage(1);
              }}
              className="w-full rounded-md border bg-background px-2 py-2 text-sm lg:w-[150px] lg:px-3"
              aria-label="Data a"
            />
          </div>
        </div>
      </MobileFilterPanel>

      <ResponsiveTable<CertificateRow>
        columns={[
          {
            key: "employee",
            header: "Dipendente",
            isPrimary: true,
            render: (cert) => (
              <Link
                href={`/admin/dipendenti/${cert.employeeId}`}
                className="text-primary hover:underline"
              >
                {cert.employee?.nome} {cert.employee?.cognome}
              </Link>
            ),
          },
          {
            key: "fileName",
            header: "Nome File",
            isSecondary: true,
            render: (cert) => {
              const name = cert.filePath ? getFileName(cert.filePath) : "Attestato";
              return (
                <span className="max-w-[280px] truncate" title={name}>
                  {name}
                </span>
              );
            },
          },
          {
            key: "client",
            header: "Cliente",
            hideOnCard: true,
            render: (cert) => cert.client?.ragioneSociale || "-",
          },
          {
            key: "course",
            header: "Corso",
            render: (cert) =>
              cert.courseEdition ? (
                <span>{getEditionLabel(cert.courseEdition, true)}</span>
              ) : (
                <span className="italic text-muted-foreground">Esterno</span>
              ),
          },
          {
            key: "achievedAt",
            header: "Data Rilascio",
            render: (cert) =>
              cert.achievedAt ? formatItalianDate(cert.achievedAt) : "-",
          },
          {
            key: "expiresAt",
            header: "Data Scadenza",
            render: (cert) =>
              cert.expiresAt ? formatItalianDate(cert.expiresAt) : "-",
          },
          {
            key: "status",
            header: "Stato",
            isBadge: true,
            render: (cert) => getExpiryBadge(cert.expiresAt),
          },
          {
            key: "uploadedAt",
            header: "Caricato",
            hideOnCard: true,
            render: (cert) => {
              const uploaded = cert.uploadedAt || cert.createdAt || null;
              return uploaded ? formatItalianDate(uploaded) : "-";
            },
          },
        ] satisfies Column<CertificateRow>[]}
        data={certificates}
        keyExtractor={(cert) => cert.id}
        loading={loading}
        skeletonCount={6}
        emptyMessage="Nessun attestato trovato"
        actions={(cert) => {
          const fileName = cert.filePath ? getFileName(cert.filePath) : "Attestato";
          return (
            <ActionMenu
              primaryAction={{
                key: "download",
                label: "Download",
                icon: Download,
                variant: "info",
                onClick: () => handleDownload(cert.id, fileName),
                shortcutKey: "d",
              }}
              secondaryActions={[
                {
                  key: "edit",
                  label: "Modifica",
                  icon: Pencil,
                  variant: "default",
                  onClick: () => setEditCertificateId(cert.id),
                  shortcutKey: "e",
                },
                {
                  key: "delete",
                  label: "Elimina",
                  icon: Trash2,
                  variant: "danger",
                  requireConfirm: true,
                  confirmMessage: `Eliminare "${fileName}"?`,
                  onClick: () => handleDeleteConfirm(cert.id),
                  shortcutKey: "Delete",
                  shortcutLabel: "Del",
                },
              ]}
              size="sm"
            />
          );
        }}
      />

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} di {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="min-h-[44px] rounded-md border px-3 py-1 text-sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Precedente
            </button>
            <button
              type="button"
              className="min-h-[44px] rounded-md border px-3 py-1 text-sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              Successiva
            </button>
          </div>
        </div>
      ) : null}

      <EditCertificateModal
        open={Boolean(editCertificateId)}
        certificateId={editCertificateId}
        onClose={() => setEditCertificateId(null)}
        onSaved={() => {
          setEditCertificateId(null);
          fetchCertificates();
        }}
      />
    </div>
  );
}


