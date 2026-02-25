"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";

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

type ModalState = "upload" | "success" | "error";

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

export default function ImportEmployeesModal({
  isOpen,
  onClose,
  clientId,
  editionId,
  onImportComplete,
}: ImportEmployeesModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [modalState, setModalState] = useState<ModalState>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [errorReason, setErrorReason] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [shouldRefreshOnClose, setShouldRefreshOnClose] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setModalState("upload");
    setSelectedFile(null);
    setIsDragging(false);
    setIsImporting(false);
    setIsDownloadingTemplate(false);
    setErrorReason("");
    setResult(null);
    setShouldRefreshOnClose(false);
  }, [isOpen]);

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
      const response = await fetch("/api/dipendenti/import/template", {
        method: "GET",
      });

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
      anchor.download = "template_import_dipendenti.csv";
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

  const renderUploadState = () => (
    <>
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Importa Dipendenti da CSV/Excel</h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
        <div className="space-y-2">
          <p className="font-medium">Come importare:</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Scarica il template CSV cliccando il bottone qui sotto</li>
            <li>Compila il template con i dati dei dipendenti</li>
            <li>Carica il file compilato (CSV o Excel)</li>
          </ol>
        </div>

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
            <li>
              I dipendenti con codice fiscale gia esistente verranno saltati
            </li>
            <li>Le date devono essere nel formato GG/MM/AAAA</li>
          </ul>
        </div>

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
          disabled={isImporting}
        >
          Annulla
        </button>
        <button
          type="button"
          className="inline-flex min-h-[40px] items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          onClick={handleImport}
          disabled={!selectedFile || isImporting}
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importazione in corso...
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

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
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

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
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
      <div className="fixed inset-0 z-[81] p-2 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="flex h-[92vh] w-full flex-col rounded-lg bg-card shadow-lg sm:h-auto sm:max-h-[92vh] sm:max-w-3xl"
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

          {modalState === "upload"
            ? renderUploadState()
            : modalState === "success"
              ? renderSuccessState()
              : renderErrorState()}
        </div>
      </div>
    </div>,
    document.body
  );
}
