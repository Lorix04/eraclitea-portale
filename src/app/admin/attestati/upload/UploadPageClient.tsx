"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { unzipSync } from "fflate";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";
import { getArrayData } from "@/lib/api-response";
import {
  matchEmployeeResult,
  type MatchStatus,
} from "@/lib/attestati-matching";

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

type MatchReportItem = {
  fileName: string;
  status: MatchStatus;
  employeeName?: string;
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

function isZipFile(file: File) {
  return (
    file.name.toLowerCase().endsWith(".zip") ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  );
}

function isPdfFile(file: File) {
  return (
    file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf"
  );
}

/** Estrae SOLO i PDF da uno ZIP (ignora cartelle, __MACOSX, file nascosti). */
async function extractPdfsFromZip(zip: File): Promise<File[]> {
  const buffer = new Uint8Array(await zip.arrayBuffer());
  const entries = unzipSync(buffer);
  const pdfs: File[] = [];
  for (const [entryPath, data] of Object.entries(entries)) {
    if (entryPath.startsWith("__MACOSX")) continue;
    const baseName = entryPath.split("/").pop() ?? entryPath;
    if (!baseName || baseName.startsWith(".")) continue; // cartelle / file nascosti
    if (!baseName.toLowerCase().endsWith(".pdf")) continue;
    if (data.length === 0) continue;
    pdfs.push(new File([data], baseName, { type: "application/pdf" }));
  }
  return pdfs;
}

export default function AdminUploadAttestatiPageClient() {
  const searchParams = useSearchParams();
  const [editions, setEditions] = useState<Edition[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [courseEditionId, setCourseEditionId] = useState("");
  const [clientId, setClientId] = useState("");
  const [achievedAt, setAchievedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [matchReport, setMatchReport] = useState<MatchReportItem[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [attendanceWarnings, setAttendanceWarnings] = useState<
    Record<string, { percentage: number; belowMinimum: boolean }>
  >({});

  useEffect(() => {
    const loadBase = async () => {
      const [editionsRes, clientsRes] = await Promise.all([
        fetch("/api/edizioni?limit=500"),
        fetch("/api/clienti"),
      ]);
      const editionsJson = await editionsRes.json();
      const clientsJson = await clientsRes.json();
      setEditions(getArrayData<Edition>(editionsJson));
      setClients(getArrayData<Client>(clientsJson));
    };
    loadBase();
  }, []);

  useEffect(() => {
    if (!achievedAt) {
      setAchievedAt(new Date().toISOString().slice(0, 10));
    }
  }, [achievedAt]);

  useEffect(() => {
    if (!searchParams) return;
    const preselectedEdition = searchParams.get("courseEditionId") ?? "";
    const preselectedClient = searchParams.get("clientId") ?? "";
    if (preselectedEdition) {
      setCourseEditionId((prev) => (prev ? prev : preselectedEdition));
    }
    if (preselectedClient) {
      setClientId((prev) => (prev ? prev : preselectedClient));
    }
  }, [searchParams]);

  useEffect(() => {
    const loadEmployees = async () => {
      if (!clientId) {
        setEmployees([]);
        return;
      }

      if (courseEditionId) {
        const res = await fetch(
          `/api/corsi/${courseEditionId}/registrazioni?clientId=${clientId}`
        );
        const json = await res.json();
        const list = getArrayData<{ employee: Employee }>(json).map(
          (reg: { employee: Employee }) => reg.employee
        );
        setEmployees(list);
        return;
      }

      const res = await fetch(`/api/dipendenti?clientId=${clientId}&limit=500`);
      const json = await res.json();
      setEmployees(getArrayData<Employee>(json));
    };
    loadEmployees();
  }, [courseEditionId, clientId]);

  useEffect(() => {
    const loadAttendanceWarnings = async () => {
      if (!courseEditionId) {
        setAttendanceWarnings({});
        return;
      }
      try {
        const res = await fetch(`/api/corsi/${courseEditionId}/presenze`);
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
  }, [courseEditionId]);

  useEffect(() => {
    setUploads([]);
  }, [courseEditionId, clientId]);

  const selectedEdition = useMemo(
    () => editions.find((edition) => edition.id === courseEditionId) ?? null,
    [editions, courseEditionId]
  );

  useEffect(() => {
    if (selectedEdition?.client?.id && selectedEdition.client.id !== clientId) {
      setClientId(selectedEdition.client.id);
    }
  }, [selectedEdition, clientId]);

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

  const employeeNameById = (id: string): string => {
    const employee = employees.find((item) => item.id === id);
    return employee ? `${employee.nome} ${employee.cognome}`.trim() : "";
  };

  // Auto-match nome-file → dipendente sullo STESSO pool del dropdown (employees):
  // 1) CF nel nome file (esatto → matched), 2) fallback match per token nome/cognome
  // (unico → matched, 0 → none, >1 → ambiguous). Logica di abbinamento invariata.
  const resolveMatch = (
    filename: string
  ): { report: MatchReportItem; employeeId?: string } => {
    const cf = extractCFFromFilename(filename);
    if (cf) {
      const byCf = employees.find(
        (employee) => employee.codiceFiscale?.toUpperCase() === cf
      );
      if (byCf) {
        return {
          employeeId: byCf.id,
          report: {
            fileName: filename,
            status: "matched",
            employeeName: `${byCf.nome} ${byCf.cognome}`.trim(),
          },
        };
      }
    }
    const result = matchEmployeeResult(filename, employees);
    return {
      employeeId: result.employeeId ?? undefined,
      report: {
        fileName: filename,
        status: result.status,
        employeeName: result.employeeId
          ? employeeNameById(result.employeeId)
          : undefined,
      },
    };
  };

  // Pipeline unica di ingestione (bottone + drag&drop): spacchetta gli ZIP, tiene solo i PDF,
  // pre-compila l'associazione via auto-match e costruisce il report dell'ULTIMO batch.
  const ingestFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    let cameFromZip = false;
    const pdfFiles: File[] = [];
    for (const file of incoming) {
      if (isZipFile(file)) {
        cameFromZip = true;
        try {
          pdfFiles.push(...(await extractPdfsFromZip(file)));
        } catch {
          setError(`Impossibile leggere lo ZIP "${file.name}".`);
        }
      } else if (isPdfFile(file)) {
        pdfFiles.push(file);
      }
      // file non PDF/ZIP ignorati silenziosamente
    }

    if (pdfFiles.length === 0) {
      if (cameFromZip) setError("Lo ZIP non contiene PDF.");
      return;
    }

    const reportItems: MatchReportItem[] = [];
    const nextUploads: UploadItem[] = pdfFiles.map((file) => {
      const { report, employeeId } = resolveMatch(file.name);
      reportItems.push(report);
      return { file, employeeId };
    });

    setUploads((prev) => [...prev, ...nextUploads]);
    setMatchReport(reportItems);
    setErrors((prev) => ({ ...prev, files: "" }));

    // Auto-apri il report dopo uno ZIP o quando si caricano ≥2 file insieme.
    // Un singolo PDF a mano: niente auto-apertura (resta il bottone "Vedi report").
    if (cameFromZip || pdfFiles.length >= 2) {
      setReportOpen(true);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files?.length) {
      void ingestFiles(event.dataTransfer.files);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!dragActive) setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleUpload = async () => {
    setError(null);
    const fieldErrors: Record<string, string> = {};
    if (!clientId) fieldErrors.clientId = "Questo campo e obbligatorio";
    if (!uploads.length) fieldErrors.files = "Seleziona almeno un file";

    const associations = uploads.map((item) => ({
      filename: item.file.name,
      employeeId: item.employeeId,
    }));

    if (associations.some((item) => !item.employeeId)) {
      fieldErrors.associations = "Associa tutti i file a un dipendente";
    }

    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    const formData = new FormData();
    formData.append("courseEditionId", courseEditionId);
    formData.append("clientId", clientId);
    formData.append("achievedAt", achievedAt);
    if (expiresAt) {
      formData.append("expiresAt", expiresAt);
    }
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
          Carica PDF multipli o uno ZIP e associa gli attestati ai dipendenti.
          I file vengono abbinati automaticamente dal nome (modificabile prima di salvare).
        </p>
      </div>

      <FormRequiredLegend />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <FormLabel>Edizione corso (opzionale)</FormLabel>
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={courseEditionId}
            onChange={(event) => setCourseEditionId(event.target.value)}
          >
            <option value="">Nessuna edizione (attestato esterno)</option>
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

        <div className="flex flex-col gap-2">
          <FormLabel required>Cliente</FormLabel>
          <select
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.clientId ? "border-red-500 focus-visible:outline-red-500" : ""
            }`}
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              if (errors.clientId) {
                setErrors((prev) => ({ ...prev, clientId: "" }));
              }
            }}
          >
            <option value="">Seleziona cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.ragioneSociale}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.clientId} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <FormLabel>Data rilascio</FormLabel>
          <input
            type="date"
            className="rounded-md border bg-background px-3 py-2"
            value={achievedAt}
            onChange={(event) => setAchievedAt(event.target.value)}
          />
          <span className="text-xs text-muted-foreground">Default: oggi</span>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <FormLabel>Data scadenza</FormLabel>
          <input
            type="date"
            className="rounded-md border bg-background px-3 py-2"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
          <span className="text-xs text-muted-foreground">Opzionale</span>
        </label>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">
          {courseEditionId
            ? "Dipendenti iscritti all'edizione"
            : "Dipendenti del cliente"}
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

      <div className="space-y-2">
        <FormLabel required>File PDF o ZIP</FormLabel>
        <div
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/10"
              : errors.files
                ? "border-red-500 bg-muted/30"
                : "border-input bg-muted/30"
          }`}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p className="text-sm">
            Trascina qui i PDF o uno ZIP, oppure scegli i file.
          </p>
          <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            Scegli file
            <input
              type="file"
              accept=".pdf,.zip,application/pdf,application/zip,application/x-zip-compressed"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) {
                  void ingestFiles(event.target.files);
                }
                event.target.value = "";
              }}
            />
          </label>
        </div>
        <FormFieldError message={errors.files} />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">File caricati</p>
        {uploads.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-muted-foreground">
              {uploads.length} file:{" "}
              {uploads.filter((item) => item.employeeId).length} abbinati,{" "}
              {uploads.filter((item) => !item.employeeId).length} da associare
            </p>
            {matchReport.length > 0 ? (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                Vedi report
              </button>
            ) : null}
          </div>
        ) : null}
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

      <FormFieldError message={errors.associations} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <button
        type="button"
        className="min-h-[44px] rounded-md bg-primary px-4 py-2 text-primary-foreground"
        onClick={handleUpload}
        disabled={loading}
      >
        {loading ? "Caricamento..." : "Conferma e salva"}
      </button>

      <MatchReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        items={matchReport}
      />
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

function reportMotivo(item: MatchReportItem): string {
  if (item.status === "matched") {
    return `Abbinato a ${item.employeeName ?? ""}`.trim();
  }
  if (item.status === "ambiguous") {
    return "Corrispondenza ambigua: più dipendenti compatibili, associa manualmente";
  }
  return "Nessun dipendente corrispondente (verifica che sia iscritto all'edizione)";
}

function MatchReportModal({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: MatchReportItem[];
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const matched = items.filter((item) => item.status === "matched");
  const toAssociate = items.filter((item) => item.status !== "matched");
  // Abbinati prima, poi i da-associare (quelli da sistemare, in evidenza).
  const ordered = [...matched, ...toAssociate];

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-4">
        <div
          className="flex max-h-[100dvh] w-full flex-col bg-card shadow-xl sm:max-h-[85vh] sm:w-[34rem] sm:rounded-lg"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Report abbinamenti</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              title="Chiudi"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="shrink-0 border-b px-4 py-2 text-xs text-muted-foreground">
            {items.length} file — {matched.length} abbinati, {toAssociate.length}{" "}
            da associare
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {ordered.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                Nessun file nell&apos;ultimo caricamento.
              </p>
            ) : (
              <ul className="space-y-1">
                {ordered.map((item, index) => {
                  const isMatched = item.status === "matched";
                  return (
                    <li
                      key={`${item.fileName}-${index}`}
                      className={`flex items-start gap-2 rounded-md border p-2 ${
                        isMatched
                          ? "border-transparent"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      {isMatched ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm font-medium"
                          title={item.fileName}
                        >
                          {item.fileName}
                        </p>
                        <p
                          className={`text-xs ${
                            isMatched ? "text-muted-foreground" : "text-amber-700"
                          }`}
                        >
                          {reportMotivo(item)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex shrink-0 justify-end border-t px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
