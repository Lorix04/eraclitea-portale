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

type Employee = {
  id: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
};

type UploadItem = {
  file: File;
  employeeId?: string;
};

type EmployeeOption = {
  id: string;
  label: string;
  codiceFiscale: string;
  searchValue: string;
};

const CF_REGEX = /[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]/i;

function extractCFFromFilename(filename: string) {
  const match = filename.match(CF_REGEX);
  return match ? match[0].toUpperCase() : null;
}

export default function AdminUploadAttestatiPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [courseId, setCourseId] = useState("");
  const [clientId, setClientId] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attendanceWarnings, setAttendanceWarnings] = useState<
    Record<string, { percentage: number; belowMinimum: boolean }>
  >({});

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
    const loadEmployees = async () => {
      if (!clientId) {
        setEmployees([]);
        return;
      }

      if (courseId) {
        const res = await fetch(
          `/api/corsi/${courseId}/registrazioni?clientId=${clientId}`
        );
        const json = await res.json();
        const list = (json.data ?? []).map(
          (reg: { employee: Employee }) => reg.employee
        );
        setEmployees(list);
        return;
      }

      const res = await fetch(`/api/dipendenti?clientId=${clientId}&limit=500`);
      const json = await res.json();
      setEmployees(json.data ?? []);
    };
    loadEmployees();
  }, [courseId, clientId]);

  useEffect(() => {
    const loadAttendanceWarnings = async () => {
      if (!courseId) {
        setAttendanceWarnings({});
        return;
      }
      try {
        const res = await fetch(`/api/corsi/${courseId}/presenze`);
        if (!res.ok) {
          setAttendanceWarnings({});
          return;
        }
        const json = await res.json();
        const map: Record<string, { percentage: number; belowMinimum: boolean }> = {};
        (json.stats ?? []).forEach(
          (stat: { employeeId: string; percentage: number; belowMinimum: boolean }) => {
            map[stat.employeeId] = {
              percentage: stat.percentage,
              belowMinimum: stat.belowMinimum,
            };
          }
        );
        setAttendanceWarnings(map);
      } catch {
        setAttendanceWarnings({});
      }
    };
    loadAttendanceWarnings();
  }, [courseId]);

  useEffect(() => {
    setUploads([]);
  }, [courseId, clientId]);

  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => {
        const warning = attendanceWarnings[employee.id];
        const label = `${employee.nome} ${employee.cognome} (${employee.codiceFiscale})`;
        return {
          id: employee.id,
          label: warning?.belowMinimum
            ? `${label} ⚠️ ${warning.percentage}%`
            : label,
          codiceFiscale: employee.codiceFiscale.toUpperCase(),
          searchValue: `${employee.nome} ${employee.cognome} ${employee.codiceFiscale}`.toLowerCase(),
        };
      }),
    [employees, attendanceWarnings]
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
    if (!clientId) {
      setError("Seleziona un cliente.");
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
          Corso (opzionale)
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">Nessun corso (attestato esterno)</option>
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
        <p className="text-sm font-medium">
          {courseId ? "Dipendenti iscritti al corso" : "Dipendenti del cliente"}
        </p>
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
              <EmployeeSearchSelect
                options={employeeOptions}
                value={item.employeeId}
                placeholder="Associa dipendente"
                onChange={(value) => {
                  setUploads((prev) => {
                    const next = [...prev];
                    next[index] = { ...next[index], employeeId: value || undefined };
                    return next;
                  });
                }}
              />
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

function EmployeeSearchSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: EmployeeOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.id === value);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.searchValue.includes(normalized));
  }, [options, query]);

  return (
    <div className="relative w-full md:w-80">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected?.label ?? placeholder}
        </span>
        <span className="text-xs text-muted-foreground">▾</span>
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-md border bg-card shadow-lg">
          <div className="border-b p-2">
            <input
              type="text"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Cerca per nome, cognome o CF..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                Nessun risultato.
              </p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="w-full border-b px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="font-medium">{option.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
