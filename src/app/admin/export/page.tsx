"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/Skeleton";
import { getArrayData } from "@/lib/api-response";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { usePermissions } from "@/hooks/usePermissions";

type Edition = {
  id: string;
  editionNumber?: number | null;
  course?: { title?: string | null } | null;
  client?: { id: string; ragioneSociale?: string | null } | null;
};

type Client = {
  id: string;
  ragioneSociale: string;
};

const EMPLOYEE_PREVIEW_COLUMNS = [
  "cognome",
  "nome",
  "cod_fiscale",
  "email",
  "nascita",
  "comune_nasc",
  "sesso",
] as const;

export default function AdminExportPage() {
  const { can } = usePermissions();
  const [editions, setEditions] = useState<Edition[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [exportType, setExportType] = useState("courses");
  const [courseEditionId, setCourseEditionId] = useState("");
  const [clientId, setClientId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [format, setFormat] = useState("csv");
  const [previewLimit, setPreviewLimit] = useState(10);
  const [rows, setRows] = useState<Record<string, string | number>[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeFormat, setEmployeeFormat] = useState<"standard" | "custom">("standard");

  // Check if selected client has custom fields (for employee export format choice)
  const { data: cfStatus } = useQuery({
    queryKey: ["cf-status-export", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/custom-fields?clientId=${clientId}`);
      if (!res.ok) return { enabled: false };
      return res.json();
    },
    enabled: !!clientId && exportType === "employees",
  });
  const showFormatChoice = exportType === "employees" && !!clientId && cfStatus?.enabled;

  useEffect(() => {
    const loadBase = async () => {
      try {
        const [editionsRes, clientsRes] = await Promise.all([
          fetchWithRetry("/api/edizioni?limit=500"),
          fetchWithRetry("/api/clienti"),
        ]);
        const editionsJson = await editionsRes.json();
        const clientsJson = await clientsRes.json();
        setEditions(getArrayData<Edition>(editionsJson));
        setClients(getArrayData<Client>(clientsJson));
      } catch {
        setEditions([]);
        setClients([]);
      }
    };
    void loadBase();
  }, []);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", exportType);
    params.set("format", format);
    if (clientId) params.set("clientId", clientId);
    if (courseEditionId) params.set("courseEditionId", courseEditionId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("preview", "1");
    params.set("limit", String(previewLimit));
    if (exportType === "employees" && employeeFormat === "custom" && clientId) {
      params.set("includeCustom", "true");
    }
    return `/api/export/csv?${params.toString()}`;
  }, [exportType, format, clientId, courseEditionId, dateFrom, dateTo, previewLimit, employeeFormat]);

  const downloadUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", exportType);
    params.set("format", format);
    if (clientId) params.set("clientId", clientId);
    if (courseEditionId) params.set("courseEditionId", courseEditionId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (exportType === "employees" && employeeFormat === "custom" && clientId) {
      params.set("includeCustom", "true");
    }
    return `/api/export/csv?${params.toString()}`;
  }, [exportType, format, clientId, courseEditionId, dateFrom, dateTo, employeeFormat]);

  useEffect(() => {
    if (
      !["employees", "certificates", "registrations", "editions", "tickets"].includes(
        exportType
      )
    ) {
      setClientId("");
    }
    if (!["registrations", "certificates"].includes(exportType)) {
      setCourseEditionId("");
    }
  }, [exportType]);

  useEffect(() => {
    const loadPreview = async () => {
      setLoadingPreview(true);
      setError(null);
      try {
        const res = await fetchWithRetry(previewUrl);
        if (!res.ok) {
          setRows([]);
          setError("Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.");
          return;
        }
        const json = await res.json();
        setRows(json.rows ?? []);
      } catch {
        setRows([]);
        setError("Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.");
      } finally {
        setLoadingPreview(false);
      }
    };
    loadPreview();
  }, [previewUrl]);

  const handleExport = async () => {
    setLoadingExport(true);
    setError(null);
    try {
      const res = await fetchWithRetry(downloadUrl);
      if (!res.ok) {
        setError("Si e verificato un errore durante l'esportazione. Riprova piu tardi.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "xlsx" ? "xlsx" : "csv";
      a.download = `export_${exportType}_${new Date().toISOString().split("T")[0]}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Si e verificato un errore durante l'esportazione. Riprova piu tardi.");
    } finally {
      setLoadingExport(false);
    }
  };

  const showClientFilter = [
    "employees",
    "certificates",
    "registrations",
    "editions",
    "tickets",
  ].includes(exportType);
  const showEditionFilter = ["registrations", "certificates"].includes(exportType);
  const previewColumns = useMemo(() => {
    if (exportType === "employees") return [...EMPLOYEE_PREVIEW_COLUMNS];
    return rows[0] ? Object.keys(rows[0]) : [];
  }, [exportType, rows]);
  const previewColumnCount = Math.max(previewColumns.length, 1);
  const shownPreviewCount = loadingPreview ? previewLimit : rows.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Export dati</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esporta i dati del sistema in formato CSV o Excel.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm">
          Tipo di export
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={exportType}
            onChange={(event) => setExportType(event.target.value)}
          >
            <option value="courses">Corsi</option>
            <option value="clients">Clienti</option>
            <option value="employees">Dipendenti</option>
            <option value="teachers">Docenti</option>
            <option value="editions">Edizioni</option>
            <option value="course-areas">Aree corsi</option>
            <option value="tickets">Ticket</option>
            <option value="certificates">Attestati</option>
            <option value="registrations">Iscrizioni</option>
          </select>
        </label>

        {showClientFilter ? (
          <label className="flex flex-col gap-2 text-sm">
            Cliente
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              <option value="">Tutti i clienti</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.ragioneSociale}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {showEditionFilter ? (
          <label className="flex flex-col gap-2 text-sm">
            Edizione
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={courseEditionId}
              onChange={(event) => setCourseEditionId(event.target.value)}
            >
              <option value="">Tutte le edizioni</option>
              {editions
                .filter((edition) => !clientId || edition.client?.id === clientId)
                .map((edition) => (
                  <option key={edition.id} value={edition.id}>
                    {(edition.course?.title ?? "Corso").trim()}{" "}
                    {edition.editionNumber ? `- Ed. #${edition.editionNumber}` : ""}
                  </option>
                ))}
            </select>
          </label>
        ) : null}
      </div>

      {showFormatChoice && (
        <div className="rounded-md border bg-amber-50/50 p-3 space-y-2">
          <p className="text-sm font-medium">Formato export dipendenti:</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="empFormat"
                checked={employeeFormat === "standard"}
                onChange={() => setEmployeeFormat("standard")}
                className="accent-amber-500"
              />
              <span>
                <span className="font-medium">Standard</span>
                <span className="text-xs text-muted-foreground ml-1">(20 campi fissi del sistema)</span>
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="empFormat"
                checked={employeeFormat === "custom"}
                onChange={() => setEmployeeFormat("custom")}
                className="accent-amber-500"
              />
              <span>
                <span className="font-medium">Personalizzato</span>
                <span className="text-xs text-muted-foreground ml-1">(campi configurati dal cliente)</span>
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Da:</span>
          <input
            type="date"
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            aria-label="Data da"
          />
          <span>A:</span>
          <input
            type="date"
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            aria-label="Data a"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          Formato
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={format}
            onChange={(event) => setFormat(event.target.value)}
          >
            <option value="csv">CSV</option>
            <option value="xlsx">Excel</option>
          </select>
        </label>
      </div>

      {error ? <ErrorMessage message={error} /> : null}

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium">Anteprima (ultimi {shownPreviewCount} record)</p>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Mostra:</span>
              <select
                className="rounded-md border bg-background px-2 py-1 text-xs"
                value={previewLimit}
                onChange={(event) => setPreviewLimit(Number(event.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>record</span>
            </label>
          </div>
          {can("export", "export") ? (
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
              onClick={handleExport}
              disabled={loadingExport}
            >
              <Download className="mr-2 h-4 w-4" />
              {loadingExport ? "Esportazione..." : "Esporta"}
            </button>
          ) : null}
        </div>
        <div className="mt-3 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr>
                {previewColumns.map((key) => (
                  <th key={key} className="px-2 py-1 text-left text-muted-foreground">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingPreview ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`preview-skeleton-${index}`} className="border-t">
                    {Array.from({ length: previewColumnCount }).map((__, col) => (
                      <td key={col} className="px-2 py-2">
                        <Skeleton className="h-3 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-muted-foreground" colSpan={previewColumnCount}>
                    Nessun dato.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    {previewColumns.map((columnKey) => (
                      <td key={columnKey} className="px-2 py-1">
                        {row[columnKey] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
