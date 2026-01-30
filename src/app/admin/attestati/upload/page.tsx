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

type Registration = {
  employeeId: string;
  employee: {
    id: string;
    nome: string;
    cognome: string;
    codiceFiscale: string;
  };
};

type UploadItem = {
  file: File;
  employeeId?: string;
};

const CF_REGEX = /[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]/i;

function extractCFFromFilename(filename: string) {
  const match = filename.match(CF_REGEX);
  return match ? match[0].toUpperCase() : null;
}

export default function AdminUploadAttestatiPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [courseId, setCourseId] = useState("");
  const [clientId, setClientId] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    const loadRegistrations = async () => {
      if (!courseId || !clientId) {
        setRegistrations([]);
        return;
      }
      const res = await fetch(
        `/api/corsi/${courseId}/registrazioni?clientId=${clientId}`
      );
      const json = await res.json();
      setRegistrations(json.data ?? []);
    };
    loadRegistrations();
  }, [courseId, clientId]);

  useEffect(() => {
    setUploads([]);
  }, [courseId, clientId]);

  const employeeOptions = useMemo(
    () =>
      registrations.map((reg) => ({
        id: reg.employee.id,
        label: `${reg.employee.nome} ${reg.employee.cognome} (${reg.employee.codiceFiscale})`,
        codiceFiscale: reg.employee.codiceFiscale.toUpperCase(),
      })),
    [registrations]
  );

  const handleFiles = (fileList: FileList | File[]) => {
    const cfMap = new Map(
      employeeOptions.map((employee) => [employee.codiceFiscale, employee.id])
    );

    const nextUploads: UploadItem[] = Array.from(fileList).map((file) => {
      const cf = extractCFFromFilename(file.name);
      return {
        file,
        employeeId: cf ? cfMap.get(cf) : undefined,
      };
    });

    setUploads((prev) => [...prev, ...nextUploads]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const handleUpload = async () => {
    setError(null);
    if (!courseId || !clientId) {
      setError("Seleziona corso e cliente.");
      return;
    }
    if (!uploads.length) {
      setError("Nessun file selezionato.");
      return;
    }

    const associations = uploads.map((item) => ({
      filename: item.file.name,
      employeeId: item.employeeId,
    }));

    if (associations.some((item) => !item.employeeId)) {
      setError("Associa tutti i file a un dipendente.");
      return;
    }

    const formData = new FormData();
    formData.append("courseId", courseId);
    formData.append("clientId", clientId);
    formData.append("associations", JSON.stringify(associations));
    uploads.forEach((item) => formData.append("files", item.file, item.file.name));

    setLoading(true);
    const res = await fetch("/api/attestati/upload", {
      method: "POST",
      body: formData,
    });
    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Errore upload.");
      return;
    }

    setUploads([]);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Upload attestati</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Carica PDF multipli e associa gli attestati ai dipendenti.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Corso
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">Seleziona corso</option>
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
            <option value="">Seleziona cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.ragioneSociale}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Dipendenti iscritti al corso</p>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {employeeOptions.length === 0 ? (
            <li>Nessun dipendente trovato.</li>
          ) : (
            employeeOptions.map((employee) => (
              <li key={employee.id}>{employee.label}</li>
            ))
          )}
        </ul>
      </div>

      <div
        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-6 text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <p className="text-sm">Trascina i PDF qui o clicca per selezionare.</p>
        <input
          type="file"
          accept="application/pdf"
          multiple
          className="text-sm"
          onChange={(event) => {
            if (event.target.files) {
              handleFiles(event.target.files);
            }
          }}
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">File caricati</p>
        {uploads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun file selezionato.</p>
        ) : (
          uploads.map((item, index) => (
            <div
              key={`${item.file.name}-${index}`}
              className="flex flex-col gap-2 rounded-md border bg-card p-3 text-sm md:flex-row md:items-center md:justify-between"
            >
              <span>{item.file.name}</span>
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={item.employeeId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setUploads((prev) => {
                    const next = [...prev];
                    next[index] = { ...next[index], employeeId: value || undefined };
                    return next;
                  });
                }}
              >
                <option value="">Associa dipendente</option>
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.label}
                  </option>
                ))}
              </select>
            </div>
          ))
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <button
        type="button"
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        onClick={handleUpload}
        disabled={loading}
      >
        {loading ? "Caricamento..." : "Conferma e salva"}
      </button>
    </div>
  );
}
