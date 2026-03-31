"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Settings2,
  UploadCloud,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type CustomFieldInfo = {
  label: string;
  required: boolean;
  standardField: string | null;
};

interface ImportEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  editionId?: string;
  onImportComplete: () => void;
}

type RowIssue = {
  row: number;
  reason: string;
};

type ImportResponse = {
  success?: boolean;
  totalRows?: number;
  imported?: number;
  skipped?: number;
  errors?: number;
  details?: {
    skippedRows?: RowIssue[];
    errorRows?: RowIssue[];
  };
  error?: string;
};

type PreviewHeader = {
  original: string;
  mapped: string | null;
  autoMapped: boolean;
};

type PreviewData = {
  headers: PreviewHeader[];
  previewRows: string[][];
  systemFields: string[];
  customFields: { name: string; label: string; type: string }[];
  requiredFields: string[];
  unmappedHeaders: string[];
  missingRequired: string[];
};

type ModalState = "choose" | "upload" | "mapping" | "success" | "error";

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

export default function ImportEmployeesModal({
  isOpen,
  onClose,
  clientId,
  editionId,
  onImportComplete,
}: ImportEmployeesModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Fetch custom fields for this client
  const { data: cfData, isLoading: cfLoading } = useQuery({
    queryKey: ["custom-fields-import", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/custom-fields?clientId=${clientId}`);
      if (!res.ok) return { enabled: false, fields: [] };
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
  const hasCustom = cfData?.enabled && cfData.fields?.length > 0;
  const customFieldsList = (cfData?.fields || []) as CustomFieldInfo[];
  const cfReady = !cfLoading;

  const [modalState, setModalState] = useState<ModalState>("upload");
  const [importMode, setImportMode] = useState<"standard" | "custom">("standard");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [errorReason, setErrorReason] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [shouldRefreshOnClose, setShouldRefreshOnClose] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Reset all state when modal opens
  useEffect(() => {
    if (!isOpen) {
      setInitialized(false);
      return;
    }
    setImportMode("standard");
    setSelectedFile(null);
    setIsDragging(false);
    setIsImporting(false);
    setIsDownloadingTemplate(false);
    setErrorReason("");
    setResult(null);
    setShouldRefreshOnClose(false);
    setPreview(null);
    setColumnMapping({});
    setIsAnalyzing(false);
    setInitialized(false);
  }, [isOpen]);

  // Set initial modal state ONLY after custom fields data is ready
  useEffect(() => {
    if (!isOpen || !cfReady || initialized) return;
    setModalState(hasCustom ? "choose" : "upload");
    setInitialized(true);
  }, [isOpen, cfReady, hasCustom, initialized]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const detailsList = useMemo(() => {
    if (!result?.details) return [];
    return [
      ...(result.details.skippedRows ?? []),
      ...(result.details.errorRows ?? []),
    ];
  }, [result]);

  const handleClose = () => {
    if (isImporting) return;
    if (shouldRefreshOnClose) {
      onImportComplete();
    }
    onClose();
  };

  const handleBackdropClick = () => {
    if (isImporting) return;
    handleClose();
  };

  const handlePickFile = (file: File | null | undefined) => {
    if (!file) return;
    setSelectedFile(file);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handlePickFile(event.target.files?.[0]);
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      // Use custom fields template if in custom mode, otherwise standard
      const templateUrl = importMode === "custom"
        ? `/api/custom-fields/template?clientId=${clientId}`
        : "/api/dipendenti/import/template";
      const response = await fetch(templateUrl);

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          errorPayload.error ??
            "Impossibile scaricare il template in questo momento."
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const ext = importMode === "custom" ? ".xlsx" : ".csv";
      anchor.download = `template_import_dipendenti${ext}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrorReason(
        error instanceof Error
          ? error.message
          : "Errore durante il download del template."
      );
      if (modalState !== "success") {
        setModalState("error");
      }
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("clientId", clientId);
      const res = await fetch("/api/dipendenti/import/preview", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Errore analisi file");
      }
      const data: PreviewData = await res.json();
      setPreview(data);

      // Init mapping from auto-mapped headers
      const mapping: Record<string, string> = {};
      for (const h of data.headers) {
        mapping[h.original] = h.mapped || "__skip__";
      }
      setColumnMapping(mapping);

      // If all auto-mapped and no required missing → go directly to import
      if (data.unmappedHeaders.length === 0 && data.missingRequired.length === 0) {
        setModalState("mapping"); // still show mapping so user can review
      } else {
        setModalState("mapping");
      }
    } catch (err: any) {
      setErrorReason(err.message);
      setModalState("error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || isImporting) return;

    setIsImporting(true);
    setErrorReason("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("clientId", clientId);
      if (editionId) {
        formData.append("editionId", editionId);
      }
      if (importMode !== "standard") {
        formData.append("importMode", importMode);
      }
      // Send column mapping if we went through preview
      if (preview) {
        formData.append("columnMapping", JSON.stringify(columnMapping));
      }

      const response = await fetch("/api/dipendenti/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as ImportResponse;

      if (!response.ok) {
        setResult(payload);
        setErrorReason(payload.error ?? "Import non riuscito.");
        setModalState("error");
        return;
      }

      const imported = Number(payload.imported ?? 0);
      setResult(payload);

      if (payload.success && imported > 0) {
        setModalState("success");
        setShouldRefreshOnClose(true);
        return;
      }

      setModalState("error");
      setErrorReason(
        payload.error ??
          "Nessun dipendente importato. Verifica i dati e riprova."
      );
    } catch {
      setResult(null);
      setErrorReason("Errore durante il caricamento del file.");
      setModalState("error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRetry = () => {
    setModalState("upload");
    setSelectedFile(null);
    setResult(null);
    setErrorReason("");
    setShouldRefreshOnClose(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const requiredCustomCount = customFieldsList.filter((f: any) => f.required).length;

  const handleChoose = (mode: "standard" | "custom") => {
    setImportMode(mode);
    setModalState("upload");
  };

  const handleDownloadChooseTemplate = async (mode: "standard" | "custom") => {
    setIsDownloadingTemplate(true);
    try {
      const url = mode === "custom"
        ? `/api/custom-fields/template?clientId=${clientId}`
        : "/api/dipendenti/import/template";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Errore download");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = mode === "custom" ? "template_personalizzato.xlsx" : "template_standard.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      // silent
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const renderChooseState = () => (
    <>
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Importa Dipendenti</h2>
      </div>

      <div className="modal-scroll flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Questo cliente ha le anagrafiche personalizzate attive.</p>
            <p className="text-amber-700 text-xs mt-0.5">Scegli il formato di importazione.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Standard card */}
          <div
            className="rounded-lg border-2 p-4 cursor-pointer transition-all hover:border-amber-400 hover:shadow-sm flex flex-col"
            onClick={() => handleChoose("standard")}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Campi Default</h3>
            </div>
            <p className="text-xs text-muted-foreground flex-1">
              I 20 campi standard del sistema: Nome, Cognome, Codice Fiscale, Sesso, Data di Nascita, ecc.
            </p>
            <p className="text-xs text-muted-foreground mt-2">11 campi obbligatori</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDownloadChooseTemplate("standard"); }}
                disabled={isDownloadingTemplate}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
              >
                <Download className="h-3 w-3" />
                Template
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleChoose("standard"); }}
                className="inline-flex items-center rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90"
              >
                Seleziona
              </button>
            </div>
          </div>

          {/* Custom card */}
          <div
            className="rounded-lg border-2 border-amber-200 bg-amber-50/30 p-4 cursor-pointer transition-all hover:border-amber-400 hover:shadow-sm flex flex-col"
            onClick={() => handleChoose("custom")}
          >
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-sm">Campi Personalizzati</h3>
            </div>
            <p className="text-xs text-muted-foreground flex-1">
              I campi configurati per questo cliente:
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {customFieldsList.slice(0, 8).map((f: CustomFieldInfo, i: number) => (
                <span key={i} className="rounded bg-white px-1.5 py-0.5 text-[10px] border">
                  {f.label}{f.required ? " *" : ""}
                </span>
              ))}
              {customFieldsList.length > 8 && (
                <span className="text-[10px] text-muted-foreground">+{customFieldsList.length - 8}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {customFieldsList.length} campi totali{requiredCustomCount > 0 ? `, ${requiredCustomCount} obbligatori` : ""}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDownloadChooseTemplate("custom"); }}
                disabled={isDownloadingTemplate}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
              >
                <Download className="h-3 w-3" />
                Template
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleChoose("custom"); }}
                className="inline-flex items-center rounded-md bg-amber-500 px-3 py-1 text-xs text-white hover:bg-amber-600"
              >
                Seleziona
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t px-4 py-3">
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={handleClose}
        >
          Annulla
        </button>
      </div>
    </>
  );

  const renderUploadState = () => (
    <>
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Importa Dipendenti da CSV/Excel</h2>
      </div>

      <div className="modal-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
        <div className="space-y-2">
          <p className="font-medium">Come importare:</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Scarica il template cliccando il bottone qui sotto</li>
            <li>Compila il template con i dati dei dipendenti</li>
            <li>Carica il file compilato (CSV o Excel)</li>
          </ol>
        </div>

        {importMode === "custom" ? (
          <>
            <div className="space-y-2">
              <p className="font-medium">Colonne del template:</p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-3 py-1.5 font-medium">#</th>
                      <th className="px-3 py-1.5 font-medium">Colonna</th>
                      <th className="px-3 py-1.5 font-medium">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customFieldsList.map((f: CustomFieldInfo, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium">
                          {f.label}
                          {f.required && <span className="text-red-500 ml-0.5">*</span>}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {f.standardField ? (
                            <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-600">Standard</span>
                          ) : (
                            <span>Personalizzato</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Note:</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>I dipendenti con codice fiscale gia esistente verranno saltati</li>
                <li>Le date devono essere nel formato GG/MM/AAAA</li>
                <li>I campi non riconosciuti nel file verranno ignorati</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <p className="font-medium">Campi obbligatori:</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Nome</li>
                <li>Cognome</li>
                <li>Codice Fiscale</li>
                <li>Sesso (M o F)</li>
                <li>Data di Nascita (formato GG/MM/AAAA)</li>
                <li>Comune di Nascita</li>
                <li>Email</li>
                <li>Comune di Residenza</li>
                <li>CAP</li>
                <li>Provincia</li>
                <li>Regione</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Campi opzionali:</p>
              <p className="text-muted-foreground">
                Indirizzo, Telefono, Cellulare, Mansione, Email Aziendale, PEC,
                Partita IVA, IBAN, Note
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Note:</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Il separatore deve essere il punto e virgola (;)</li>
                <li>I dipendenti con codice fiscale gia esistente verranno saltati</li>
                <li>Le date devono essere nel formato GG/MM/AAAA</li>
              </ul>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={handleDownloadTemplate}
          disabled={isDownloadingTemplate || isImporting}
          className="inline-flex items-center rounded-md border px-3 py-2 text-sm disabled:opacity-50"
        >
          {isDownloadingTemplate ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Scarica Template
        </button>

        <div
          className={`rounded-md border-2 border-dashed p-6 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/10" : "border-border bg-muted/20"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handlePickFile(event.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <UploadCloud className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            Trascina qui il file o clicca per selezionare
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Formati supportati: {ACCEPTED_EXTENSIONS.join(", ")}
          </p>
          {selectedFile ? (
            <p className="mt-3 text-xs text-foreground">
              File selezionato: <span className="font-medium">{selectedFile.name}</span>
            </p>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t px-4 py-3">
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={handleClose}
          disabled={isImporting || isAnalyzing}
        >
          Annulla
        </button>
        <button
          type="button"
          className="inline-flex min-h-[40px] items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          onClick={importMode === "custom" ? handleAnalyze : handleImport}
          disabled={!selectedFile || isImporting || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisi in corso...
            </>
          ) : isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importazione in corso...
            </>
          ) : importMode === "custom" ? (
            "Avanti"
          ) : (
            "Importa"
          )}
        </button>
      </div>
    </>
  );

  const SYSTEM_FIELD_LABELS: Record<string, string> = {
    nome: "Nome", cognome: "Cognome", codice_fiscale: "Codice Fiscale",
    sesso: "Sesso", data_nascita: "Data Nascita", comune_nascita: "Comune Nascita",
    email: "Email", comune_residenza: "Comune Residenza", cap: "CAP",
    provincia: "Provincia", regione: "Regione", indirizzo: "Indirizzo",
    telefono: "Telefono", cellulare: "Cellulare", mansione: "Mansione",
    email_aziendale: "Email Aziendale", pec: "PEC", partita_iva: "Partita IVA",
    iban: "IBAN", note: "Note",
  };

  // Fields already used in current mapping
  const usedTargets = new Set(Object.values(columnMapping).filter((v) => v !== "__skip__"));

  // Compute missing required from current mapping
  const currentMissingRequired = preview
    ? preview.requiredFields.filter((f) => !Object.values(columnMapping).includes(f))
    : [];

  const renderMappingState = () => (
    <>
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Mappatura colonne</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Verifica la corrispondenza tra le colonne del file e i campi del portale.
        </p>
      </div>

      <div className="modal-scroll flex-1 overflow-y-auto px-4 py-4 text-sm space-y-4">
        {currentMissingRequired.length > 0 && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            <AlertCircle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
            Camp{currentMissingRequired.length === 1 ? "o" : "i"} obbligatori{currentMissingRequired.length === 1 ? "o" : ""} non mappat{currentMissingRequired.length === 1 ? "o" : "i"}:{" "}
            <strong>{currentMissingRequired.map((f) => SYSTEM_FIELD_LABELS[f] || f).join(", ")}</strong>
          </div>
        )}

        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-2 font-medium">Colonna nel file</th>
                <th className="py-2 pr-2 font-medium hidden sm:table-cell">Anteprima</th>
                <th className="py-2 pr-2 font-medium w-8"></th>
                <th className="py-2 font-medium">Campo destinazione</th>
              </tr>
            </thead>
            <tbody>
              {preview?.headers.map((h, idx) => {
                const target = columnMapping[h.original] || "__skip__";
                const isRequired = preview.requiredFields.includes(target);
                const isAuto = h.autoMapped && h.mapped === target;
                return (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-medium">{h.original}</td>
                    <td className="py-2 pr-2 text-muted-foreground hidden sm:table-cell max-w-32 truncate">
                      {preview.previewRows[0]?.[idx] || "—"}
                    </td>
                    <td className="py-2 pr-2 text-center">
                      {target === "__skip__" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : isAuto ? (
                        <span className="text-green-600">&#10003;</span>
                      ) : (
                        <span className="text-amber-500">&#9998;</span>
                      )}
                    </td>
                    <td className="py-2">
                      <select
                        value={target}
                        onChange={(e) => {
                          setColumnMapping((prev) => ({ ...prev, [h.original]: e.target.value }));
                        }}
                        className={`w-full rounded border px-2 py-1 text-xs ${
                          target === "__skip__" ? "text-muted-foreground" : ""
                        }`}
                      >
                        <option value="__skip__">— Ignora —</option>
                        <optgroup label="Campi standard">
                          {preview.systemFields.map((sf) => (
                            <option
                              key={sf}
                              value={sf}
                              disabled={usedTargets.has(sf) && target !== sf}
                            >
                              {SYSTEM_FIELD_LABELS[sf] || sf}
                              {preview.requiredFields.includes(sf) ? " *" : ""}
                            </option>
                          ))}
                        </optgroup>
                        {preview.customFields.length > 0 && (
                          <optgroup label="Campi personalizzati">
                            {preview.customFields.map((cf) => {
                              const val = `custom_${cf.name}`;
                              return (
                                <option
                                  key={val}
                                  value={val}
                                  disabled={usedTargets.has(val) && target !== val}
                                >
                                  {cf.label}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t px-4 py-3">
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() => {
            setModalState("upload");
            setPreview(null);
          }}
        >
          Indietro
        </button>
        <button
          type="button"
          className="inline-flex min-h-[40px] items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          onClick={handleImport}
          disabled={isImporting || currentMissingRequired.length > 0}
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importazione...
            </>
          ) : (
            "Importa"
          )}
        </button>
      </div>
    </>
  );

  const renderSuccessState = () => (
    <>
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Import completato</h2>
      </div>

      <div className="modal-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
        <div className="space-y-2">
          <p className="flex items-center text-green-700">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Importati: {result?.imported ?? 0} dipendenti
          </p>
          <p className="text-muted-foreground">
            Saltati: {result?.skipped ?? 0} (codice fiscale gia esistente)
          </p>
          <p className="text-muted-foreground">Errori: {result?.errors ?? 0}</p>
        </div>

        {detailsList.length ? (
          <div className="space-y-2">
            <p className="font-medium">Dettagli:</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {detailsList.map((issue, index) => (
                <li key={`${issue.row}-${index}`}>
                  Riga {issue.row}: {issue.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 border-t px-4 py-3">
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
          onClick={handleClose}
        >
          Chiudi
        </button>
      </div>
    </>
  );

  const renderErrorState = () => (
    <>
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Import non riuscito</h2>
      </div>

      <div className="modal-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
        <p className="flex items-center text-red-700">
          <AlertCircle className="mr-2 h-4 w-4" />
          L&apos;import non e andato a buon fine.
        </p>

        <p className="text-muted-foreground">
          Motivo: {errorReason || result?.error || "Errore durante import"}
        </p>

        <div className="space-y-2">
          <p className="font-medium">Controlla che:</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Il file sia in formato CSV (separatore ;) o Excel (.xlsx/.xls)
            </li>
            <li>L&apos;header contenga tutte le colonne del template</li>
            <li>I campi obbligatori siano compilati per ogni riga</li>
          </ul>
        </div>

        <p className="text-muted-foreground">
          Campi obbligatori: Nome, Cognome, Codice Fiscale, Sesso, Data di
          Nascita, Comune di Nascita, Email, Comune di Residenza, CAP,
          Provincia, Regione
        </p>

        {detailsList.length ? (
          <div className="space-y-2">
            <p className="font-medium">Dettagli:</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {detailsList.map((issue, index) => (
                <li key={`${issue.row}-${index}`}>
                  Riga {issue.row}: {issue.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t px-4 py-3">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          disabled={isDownloadingTemplate}
          className="inline-flex items-center rounded-md border px-3 py-2 text-sm disabled:opacity-50"
        >
          {isDownloadingTemplate ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Scarica Template
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={handleRetry}
        >
          Riprova
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
          onClick={handleClose}
        >
          Chiudi
        </button>
      </div>
    </>
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[81] p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="modal-panel bg-card shadow-lg sm:max-w-3xl"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-end border-b px-4 py-2">
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
              onClick={handleClose}
              aria-label="Chiudi"
              disabled={isImporting}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!initialized ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : modalState === "choose"
            ? renderChooseState()
            : modalState === "upload"
              ? renderUploadState()
              : modalState === "mapping"
                ? renderMappingState()
                : modalState === "success"
                  ? renderSuccessState()
                  : renderErrorState()}
        </div>
      </div>
    </div>,
    document.body
  );
}
