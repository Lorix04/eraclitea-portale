"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

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

export default function AdminExportPage() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [exportType, setExportType] = useState("courses");
  const [courseEditionId, setCourseEditionId] = useState("");
  const [clientId, setClientId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [format, setFormat] = useState("csv");
  const [rows, setRows] = useState<Record<string, string | number>[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBase = async () => {
      const [editionsRes, clientsRes] = await Promise.all([
        fetch("/api/edizioni?limit=500"),
        fetch("/api/clienti"),
      ]);
      const editionsJson = await editionsRes.json();
      const clientsJson = await clientsRes.json();
      setEditions(editionsJson.data ?? []);
      setClients(clientsJson.data ?? []);
    };
    loadBase();
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
    params.set("limit", "10");
    return `/api/export/csv?${params.toString()}`;
  }, [exportType, format, clientId, courseEditionId, dateFrom, dateTo]);

  const downloadUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", exportType);
    params.set("format", format);
    if (clientId) params.set("clientId", clientId);
    if (courseEditionId) params.set("courseEditionId", courseEditionId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return `/api/export/csv?${params.toString()}`;
  }, [exportType, format, clientId, courseEditionId, dateFrom, dateTo]);

  useEffect(() => {
    if (!["employees", "certificates", "registrations"].includes(exportType)) {
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
        const res = await fetch(previewUrl);
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
      const res = await fetch(downloadUrl);
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

  const showClientFilter = ["employees", "certificates", "registrations"].includes(
    exportType
  );
  const showEditionFilter = ["registrations", "certificates"].includes(exportType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Export dati</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esporta i dati del sistema in formato CSV o Excel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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

      <div className="flex flex-wrap items-center gap-4">
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

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Anteprima (ultimi 10 record)</p>
        <div className="mt-3 overflow-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                {rows[0]
                  ? Object.keys(rows[0]).map((key) => (
                      <th key={key} className="px-2 py-1 text-left text-muted-foreground">
                        {key}
                      </th>
                    ))
                  : null}
              </tr>
            </thead>
            <tbody>
              {loadingPreview ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`preview-skeleton-${index}`} className="border-t">
                    {Array.from({ length: 6 }).map((__, col) => (
                      <td key={col} className="px-2 py-2">
                        <Skeleton className="h-3 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-muted-foreground" colSpan={6}>
                    Nessun dato.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    {Object.values(row).map((value, cidx) => (
                      <td key={cidx} className="px-2 py-1">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="button"
        className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        onClick={handleExport}
        disabled={loadingExport}
      >
        <Download className="mr-2 h-4 w-4" />
        {loadingExport ? "Esportazione..." : "Esporta"}
      </button>
    </div>
  );
}
