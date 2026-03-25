"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  FileText,
  Globe,
  GraduationCap,
  Laptop,
  Loader2,
  ScrollText,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

type ImportCvModalProps = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  apiBase: string;
};

type ImportStep = "upload" | "analyzing" | "preview" | "error";

type ExtractedData = {
  workExperiences: any[];
  educations: any[];
  languages: any[];
  certifications: any[];
  skills: any[];
  trainingCourses: any[];
  teachingExperiences: any[];
  publications: any[];
};

const SECTION_META = [
  { key: "workExperiences", label: "Esperienze lavorative", icon: Briefcase },
  { key: "educations", label: "Formazione", icon: GraduationCap },
  { key: "languages", label: "Lingue", icon: Globe },
  { key: "certifications", label: "Certificazioni", icon: Award },
  { key: "skills", label: "Competenze", icon: Laptop },
  { key: "trainingCourses", label: "Corsi frequentati", icon: BookOpen },
  { key: "teachingExperiences", label: "Esperienza docente", icon: ScrollText },
  { key: "publications", label: "Pubblicazioni", icon: FileText },
] as const;

function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("it-IT", { month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function ImportCvModal({
  open,
  onClose,
  onImported,
  apiBase,
}: ImportCvModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setStep("upload");
      setFile(null);
      setExtractedData(null);
      setError(null);
      setSaving(false);
    }
  }, [open]);

  if (!open || !mounted) return null;

  const handleFileSelect = (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Solo file PDF supportati");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File troppo grande (max 10MB)");
      return;
    }
    setFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStep("analyzing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${apiBase}/import-pdf`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Errore durante l'analisi");
      }

      setExtractedData(json.data);
      setStep("preview");
    } catch (err: any) {
      setError(err.message || "Errore durante l'analisi del CV");
      setStep("error");
    }
  };

  const handleConfirm = async () => {
    if (!extractedData) return;
    setSaving(true);

    try {
      const res = await fetch(`${apiBase}/import-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: extractedData,
          replaceExisting,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Errore durante il salvataggio");
      }

      toast.success(`Importati ${json.totalImported} elementi dal CV`);
      onImported();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const totalExtracted = extractedData
    ? Object.values(extractedData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
    : 0;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => {
          if (step !== "analyzing" && !saving) onClose();
        }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="modal-panel bg-card shadow-lg sm:max-w-lg"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 className="text-lg font-semibold">Importa dati da CV</h2>
          </div>

          <div className="modal-body modal-scroll">
            {/* STEP: Upload */}
            {step === "upload" && (
              <div className="space-y-4">
                <label
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    dragActive
                      ? "border-amber-500 bg-amber-50"
                      : file
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-gray-300 hover:border-gray-400"
                  }`}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(false);
                    handleFileSelect(e.dataTransfer.files?.[0] ?? null);
                  }}
                >
                  {file ? (
                    <>
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-700">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className={`h-8 w-8 ${dragActive ? "text-amber-500" : "text-muted-foreground"}`} />
                      <span className="text-sm text-muted-foreground">
                        {dragActive ? "Rilascia il file qui" : "Trascina il CV o clicca per selezionare"}
                      </span>
                      <span className="text-xs text-muted-foreground">Solo PDF, max 10MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  />
                </label>

                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
                  <p>I dati verranno estratti automaticamente tramite intelligenza artificiale. Potrai modificarli prima di confermare.</p>
                  <div className="space-y-1 pt-1">
                    <p className="font-medium text-foreground text-xs">Se hai gia dei dati inseriti:</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="replace"
                        checked={!replaceExisting}
                        onChange={() => setReplaceExisting(false)}
                        className="h-3.5 w-3.5"
                      />
                      Aggiungi ai dati esistenti
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="replace"
                        checked={replaceExisting}
                        onChange={() => setReplaceExisting(true)}
                        className="h-3.5 w-3.5"
                      />
                      Sostituisci i dati esistenti
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP: Analyzing */}
            {step === "analyzing" && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">Analisi del CV in corso...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Estrazione e analisi con intelligenza artificiale
                  </p>
                </div>
              </div>
            )}

            {/* STEP: Error */}
            {step === "error" && (
              <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                <AlertTriangle className="h-10 w-10 text-amber-500" />
                <div>
                  <p className="font-medium text-red-600">Errore nell&apos;analisi</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="text-sm text-primary underline"
                >
                  Riprova
                </button>
              </div>
            )}

            {/* STEP: Preview */}
            {step === "preview" && extractedData && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium text-sm">
                    Trovati {totalExtracted} elementi
                  </span>
                </div>

                <div className="space-y-1">
                  {SECTION_META.map(({ key, label, icon: Icon }) => {
                    const items = (extractedData as any)[key] as any[];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{label}:</span>
                        <span className="font-medium">{items.length}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t pt-3 max-h-60 overflow-y-auto space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Anteprima</p>
                  {/* Work experiences preview */}
                  {extractedData.workExperiences.map((e: any, i: number) => (
                    <div key={`we-${i}`} className="rounded border p-2 text-xs space-y-0.5">
                      <p className="font-medium">{e.jobTitle}</p>
                      <p className="text-muted-foreground">
                        {e.employer}{e.city ? ` · ${e.city}` : ""}
                      </p>
                      {e.startDate && (
                        <p className="text-muted-foreground">
                          {fmtDate(e.startDate)}{e.isCurrent ? " — In corso" : e.endDate ? ` — ${fmtDate(e.endDate)}` : ""}
                        </p>
                      )}
                    </div>
                  ))}
                  {/* Educations preview */}
                  {extractedData.educations.map((e: any, i: number) => (
                    <div key={`ed-${i}`} className="rounded border p-2 text-xs space-y-0.5">
                      <p className="font-medium">{e.title}</p>
                      <p className="text-muted-foreground">
                        {e.institution}{e.grade ? ` · ${e.grade}` : ""}
                      </p>
                    </div>
                  ))}
                  {/* Skills preview */}
                  {extractedData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {extractedData.skills.map((s: any, i: number) => (
                        <span key={`sk-${i}`} className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]">
                          {s.name}{s.level ? ` · ${s.level}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Languages preview */}
                  {extractedData.languages.map((l: any, i: number) => (
                    <div key={`lg-${i}`} className="rounded border p-2 text-xs">
                      <span className="font-medium">{l.language}</span>
                      {l.isNative ? " — Lingua madre" : ""}
                    </div>
                  ))}
                  {/* Brief count for remaining sections */}
                  {extractedData.certifications.length > 0 && (
                    <p className="text-xs text-muted-foreground">+ {extractedData.certifications.length} certificazioni</p>
                  )}
                  {extractedData.trainingCourses.length > 0 && (
                    <p className="text-xs text-muted-foreground">+ {extractedData.trainingCourses.length} corsi di formazione</p>
                  )}
                  {extractedData.teachingExperiences.length > 0 && (
                    <p className="text-xs text-muted-foreground">+ {extractedData.teachingExperiences.length} esperienze come docente</p>
                  )}
                  {extractedData.publications.length > 0 && (
                    <p className="text-xs text-muted-foreground">+ {extractedData.publications.length} pubblicazioni</p>
                  )}
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Verifica i dati prima di confermare. Potrai modificarli in seguito nelle singole sezioni.
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer flex justify-end gap-2">
            {step === "upload" && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!file}
                  className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Analizza CV
                </button>
              </>
            )}

            {step === "error" && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
              >
                Chiudi
              </button>
            )}

            {step === "preview" && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={saving}
                  className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvataggio...
                    </span>
                  ) : (
                    `Conferma e salva (${totalExtracted})`
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
