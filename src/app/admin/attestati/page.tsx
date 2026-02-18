"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Pencil, Plus, Search, Trash2, User, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { formatItalianDate } from "@/lib/date-utils";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EditCertificateModal } from "@/components/admin/EditCertificateModal";

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editCertificateId, setEditCertificateId] = useState<string | null>(null);
  const [certificateToDelete, setCertificateToDelete] = useState<{
    id: string;
    fileName: string;
    employeeName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      const res = await fetch(`/api/attestati?${params.toString()}`);
      if (!res.ok) {
        setError("Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.");
        setCertificates([]);
        setTotalPages(1);
        setTotal(0);
        return;
      }
      const data: ApiResponse = await res.json();
      setCertificates(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
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
    fetch("/api/clienti")
      .then((res) => res.json())
      .then((data) => setClients(data.data || data || []))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    fetch("/api/corsi")
      .then((res) => res.json())
      .then((data) => setCourses(data.data || []))
      .catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    const url = clientId
      ? `/api/edizioni?clientId=${clientId}&limit=500`
      : "/api/edizioni?limit=500";
    fetch(url)
      .then((res) => res.json())
      .then((data) => setEditions(data.data || data || []))
      .catch(() => setEditions([]));
  }, [clientId]);

  useEffect(() => {
    if (!clientId) {
      setEmployees([]);
      setEmployeeId(null);
      return;
    }
    fetch(`/api/dipendenti?clientId=${clientId}&limit=500`)
      .then((res) => res.json())
      .then((data) => setEmployees(data.data || []))
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

  const handleDeleteClick = (certificate: CertificateRow, fileName: string) => {
    setCertificateToDelete({
      id: certificate.id,
      fileName,
      employeeName: certificate.employee
        ? `${certificate.employee.nome} ${certificate.employee.cognome}`
        : "Sconosciuto",
    });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!certificateToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/attestati/${certificateToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Attestato eliminato");
        setDeleteModalOpen(false);
        setCertificateToDelete(null);
        fetchCertificates();
      } else {
        const dataRes = await res.json().catch(() => ({}));
        toast.error(dataRes?.error ?? "Errore durante l'eliminazione");
      }
    } catch (error) {
      console.error("Errore eliminazione attestato:", error);
      toast.error("Errore durante l'eliminazione dell'attestato");
    } finally {
      setIsDeleting(false);
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <select
            className="w-[180px] rounded-md border bg-background px-3 py-2 text-sm"
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
            className="w-[200px] rounded-md border bg-background px-3 py-2 text-sm"
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
              className="w-[180px] rounded-md border bg-background px-3 py-2 text-sm"
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
            className="w-[180px] rounded-md border bg-background px-3 py-2 text-sm"
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
            className="w-[180px] rounded-md border bg-background px-3 py-2 text-sm"
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value as "asc" | "desc");
              setPage(1);
            }}
          >
            <option value="desc">Più recenti prima</option>
            <option value="asc">Più antichi prima</option>
          </select>

          <select
            className="w-[220px] rounded-md border bg-background px-3 py-2 text-sm"
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
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Cerca per nome file..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="w-[200px] rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
              aria-label="Cerca per nome file"
            />
          </div>

          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Cerca per dipendente..."
              value={searchEmployee}
              onChange={(event) => {
                setSearchEmployee(event.target.value);
                setPage(1);
              }}
              className="w-[200px] rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
              aria-label="Cerca per dipendente"
            />
          </div>

          <select
            className="w-[160px] rounded-md border bg-background px-3 py-2 text-sm"
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

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Da:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPeriod("all");
                setPage(1);
              }}
              className="w-[150px] rounded-md border bg-background px-3 py-2 text-sm"
              aria-label="Data da"
            />
            <span className="text-sm text-muted-foreground">A:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPeriod("all");
                setPage(1);
              }}
              className="w-[150px] rounded-md border bg-background px-3 py-2 text-sm"
              aria-label="Data a"
            />
          </div>

          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{resultLabel}</span>
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center rounded-md border px-2 py-1 text-xs"
              onClick={resetFilters}
            >
              <X className="mr-1 h-4 w-4" />
              Resetta
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[1180px] text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Nome File</th>
              <th className="px-4 py-3">Dipendente</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Corso</th>
              <th className="px-4 py-3">Data Rilascio</th>
              <th className="px-4 py-3">Data Scadenza</th>
              <th className="px-4 py-3">Stato</th>
              <th className="px-4 py-3">Caricato</th>
              <th className="px-4 py-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="border-t">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-36" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </td>
                </tr>
              ))
            ) : certificates.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground">
                  Nessun attestato trovato
                </td>
              </tr>
            ) : (
              certificates.map((cert) => {
                const fileName = cert.filePath
                  ? getFileName(cert.filePath)
                  : "Attestato";
                const uploadedAt = cert.uploadedAt || cert.createdAt || null;
                return (
                  <tr key={cert.id} className="border-t">
                    <td className="max-w-[280px] truncate px-4 py-3 font-medium" title={fileName}>
                      {fileName}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/dipendenti/${cert.employeeId}`}
                        className="text-primary hover:underline"
                      >
                        {cert.employee?.nome} {cert.employee?.cognome}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {cert.client?.ragioneSociale || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {cert.courseEdition ? (
                        <span>{getEditionLabel(cert.courseEdition, true)}</span>
                      ) : (
                        <span className="italic text-muted-foreground">Esterno</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {cert.achievedAt ? formatItalianDate(cert.achievedAt) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {cert.expiresAt ? formatItalianDate(cert.expiresAt) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {getExpiryBadge(cert.expiresAt)}
                    </td>
                    <td className="px-4 py-3">
                      {uploadedAt ? formatItalianDate(uploadedAt) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="min-h-[44px] rounded-md border px-2 py-1 text-xs"
                          onClick={() => setEditCertificateId(cert.id)}
                          title="Modifica attestato"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="min-h-[44px] rounded-md border px-2 py-1 text-xs"
                          onClick={() => handleDownload(cert.id, fileName)}
                          title="Scarica"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="min-h-[44px] rounded-md border px-2 py-1 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(cert, fileName)}
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

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

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Elimina attestato"
        description="Sei sicuro di voler eliminare questo attestato?"
        itemName={certificateToDelete?.fileName}
        isDeleting={isDeleting}
        warningMessage={
          certificateToDelete
            ? `L'attestato "${certificateToDelete.fileName}" del dipendente ${certificateToDelete.employeeName} verrà eliminato permanentemente. Questa azione non può essere annullata.`
            : "Questa azione non può essere annullata."
        }
      />

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


