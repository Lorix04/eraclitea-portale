"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";

type Course = {
  id: string;
  title: string;
};

type Client = {
  id: string;
  ragioneSociale: string;
};

export default function AdminExportPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [exportType, setExportType] = useState("courses");
  const [courseId, setCourseId] = useState("");
  const [clientId, setClientId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [format, setFormat] = useState("csv");
  const [rows, setRows] = useState<Record<string, string | number>[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);

  useEffect(() => {
    const loadBase = async () => {
      const [coursesRes, clientsRes] = await Promise.all([
        fetch("/api/corsi"),
        fetch("/api/clienti"),
      ]);
      const coursesJson = await coursesRes.json();
      const clientsJson = await clientsRes.json();
      setCourses(coursesJson.data ?? []);
      setClients(clientsJson.data ?? []);
    };
    loadBase();
  }, []);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", exportType);
    params.set("format", format);
    if (clientId) params.set("clientId", clientId);
    if (courseId) params.set("courseId", courseId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("preview", "1");
    params.set("limit", "10");
    return `/api/export/csv?${params.toString()}`;
  }, [exportType, format, clientId, courseId, dateFrom, dateTo]);

  const downloadUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", exportType);
    params.set("format", format);
    if (clientId) params.set("clientId", clientId);
    if (courseId) params.set("courseId", courseId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return `/api/export/csv?${params.toString()}`;
  }, [exportType, format, clientId, courseId, dateFrom, dateTo]);

  useEffect(() => {
    if (!["employees", "certificates", "registrations"].includes(exportType)) {
      setClientId("");
    }
    if (!["registrations", "certificates"].includes(exportType)) {
      setCourseId("");
    }
  }, [exportType]);

  useEffect(() => {
    const loadPreview = async () => {
      setLoadingPreview(true);
      const res = await fetch(previewUrl);
      const json = await res.json();
      setRows(json.rows ?? []);
      setLoadingPreview(false);
    };
    loadPreview();
  }, [previewUrl]);

  const handleExport = async () => {
    setLoadingExport(true);
    const res = await fetch(downloadUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ext = format === "xlsx" ? "xlsx" : "csv";
    a.download = `export_${exportType}_${new Date().toISOString().split("T")[0]}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setLoadingExport(false);
  };

  const showClientFilter = ["employees", "certificates", "registrations"].includes(
    exportType
  );
  const showCourseFilter = ["registrations", "certificates"].includes(exportType);

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

        {showCourseFilter ? (
          <label className="flex flex-col gap-2 text-sm">
            Corso
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
            >
              <option value="">Tutti i corsi</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
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
                <tr>
                  <td className="px-2 py-3 text-muted-foreground" colSpan={6}>
                    Caricamento...
                  </td>
                </tr>
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
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        onClick={handleExport}
        disabled={loadingExport}
      >
        <Download className="mr-2 h-4 w-4" />
        {loadingExport ? "Esportazione..." : "Esporta"}
      </button>
    </div>
  );
}
