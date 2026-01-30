"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [courseId, setCourseId] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("");
  const [separator, setSeparator] = useState(";");
  const [includeHeader, setIncludeHeader] = useState(true);
  const [rows, setRows] = useState<Record<string, string>[]>([]);

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
    if (courseId) params.set("courseId", courseId);
    if (clientId) params.set("clientId", clientId);
    if (status) params.set("status", status);
    params.set("separator", separator);
    params.set("header", includeHeader ? "1" : "0");
    params.set("preview", "1");
    params.set("limit", "5");
    return `/api/export/csv?${params.toString()}`;
  }, [courseId, clientId, status, separator, includeHeader]);

  const downloadUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (courseId) params.set("courseId", courseId);
    if (clientId) params.set("clientId", clientId);
    if (status) params.set("status", status);
    params.set("separator", separator);
    params.set("header", includeHeader ? "1" : "0");
    return `/api/export/csv?${params.toString()}`;
  }, [courseId, clientId, status, separator, includeHeader]);

  useEffect(() => {
    const loadPreview = async () => {
      const res = await fetch(previewUrl);
      const json = await res.json();
      setRows(json.rows ?? []);
    };
    loadPreview();
  }, [previewUrl]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Export CSV</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Filtra le anagrafiche e scarica il CSV pronto per Excel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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

        <label className="flex flex-col gap-2 text-sm">
          Stato registrazione
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Tutti</option>
            <option value="INSERTED">Inserito</option>
            <option value="CONFIRMED">Confermato</option>
            <option value="TRAINED">Formato</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          Separatore
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={separator}
            onChange={(event) => setSeparator(event.target.value)}
          >
            <option value=";">; (Excel IT)</option>
            <option value=",">,</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeHeader}
            onChange={(event) => setIncludeHeader(event.target.checked)}
          />
          Includi intestazioni
        </label>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Preview (prime 5 righe)</p>
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
              {rows.map((row, idx) => (
                <tr key={idx} className="border-t">
                  {Object.values(row).map((value, cidx) => (
                    <td key={cidx} className="px-2 py-1">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-muted-foreground" colSpan={5}>
                    Nessun dato.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <a
        href={downloadUrl}
        className="inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Scarica CSV
      </a>
    </div>
  );
}
