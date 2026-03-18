"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, FileText, Loader2, Upload, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatItalianDate } from "@/lib/date-utils";

type SignedDoc = {
  id: string;
  documentType: string;
  declaration1: boolean;
  declaration2: boolean;
  declaration3: boolean;
  declaration4: boolean;
  declaration5: boolean;
  signedAt: string | null;
  pdfPath: string | null;
};

type DocsData = {
  signedDocuments: SignedDoc[];
  cv: { fileName: string | null; hasFile: boolean };
  idDocument: { fileName: string | null; hasFile: boolean };
};

const DECLARATION_LABELS = [
  "Esperienza 5 anni sicurezza lavoro",
  "Decreto interministeriale 6/3/2013",
  "DM 02/09/2021 (antincendio)",
  "Accordo Stato Regioni 17/4/2025",
  "DM 388/2003 (primo soccorso)",
];

export default function TeacherDocumentiPage() {
  const cvInputRef = useRef<HTMLInputElement>(null);
  const idDocInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [uploadingIdDoc, setUploadingIdDoc] = useState(false);

  const docsQuery = useQuery({
    queryKey: ["teacher-documents"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/documents");
      if (!res.ok) throw new Error("Errore caricamento documenti");
      return (await res.json()) as DocsData;
    },
    staleTime: 30_000,
  });

  const docs = docsQuery.data;
  const attoDoc = docs?.signedDocuments?.find((d) => d.documentType === "ATTO_NOTORIETA");

  const handleUpload = async (file: File, type: "cv" | "idDocument") => {
    const setUploading = type === "cv" ? setUploadingCv : setUploadingIdDoc;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/teacher/documents/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Errore upload"); return; }
      toast.success(type === "cv" ? "CV aggiornato" : "Documento aggiornato");
      await docsQuery.refetch();
    } catch {
      toast.error("Errore di connessione");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (endpoint: string, fallbackName: string) => {
    const res = await fetch(endpoint);
    if (!res.ok) { toast.error("Errore download"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fallbackName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <FileText className="h-5 w-5" />
          I miei Documenti
        </h1>
        <p className="text-sm text-muted-foreground">
          Visualizza e gestisci i tuoi documenti.
        </p>
      </div>

      {docsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />)}
        </div>
      ) : (
        <>
          {/* Atto di Notorieta */}
          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3">Dichiarazione Atto di Notorieta</h2>
            {attoDoc ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Firmato il {formatItalianDate(attoDoc.signedAt)}
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">Dichiarazioni flaggate:</p>
                  {DECLARATION_LABELS.map((label, i) => {
                    const checked = [attoDoc.declaration1, attoDoc.declaration2, attoDoc.declaration3, attoDoc.declaration4, attoDoc.declaration5][i];
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span>{checked ? "\u2611" : "\u2610"}</span>
                        <span className={checked ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                      </div>
                    );
                  })}
                </div>
                {attoDoc.pdfPath && (
                  <button
                    type="button"
                    onClick={() => handleDownload(`/api/teacher/documents/${attoDoc.id}/pdf`, "atto-notorieta.pdf")}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Scarica PDF
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-gray-50 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Documento non ancora firmato.
                </div>
                <Link href="/onboarding/docente" className="text-xs text-primary hover:underline">
                  Completa la firma →
                </Link>
              </div>
            )}
          </section>

          {/* CV */}
          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3">Curriculum Vitae</h2>
            {docs?.cv.hasFile ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{docs.cv.fileName}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleDownload("/api/teacher/documents/cv", docs.cv.fileName || "cv")} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                    <Download className="h-3.5 w-3.5" /> Scarica
                  </button>
                  <button type="button" onClick={() => cvInputRef.current?.click()} disabled={uploadingCv} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                    {uploadingCv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Aggiorna CV
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Nessun CV caricato.</p>
                <button type="button" onClick={() => cvInputRef.current?.click()} disabled={uploadingCv} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                  {uploadingCv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Carica CV
                </button>
              </div>
            )}
            <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "cv"); e.target.value = ""; }} />
          </section>

          {/* ID Document */}
          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3">Documento d&apos;Identita</h2>
            {docs?.idDocument.hasFile ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{docs.idDocument.fileName}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleDownload("/api/teacher/documents/id-document", docs.idDocument.fileName || "id-document")} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                    <Download className="h-3.5 w-3.5" /> Scarica
                  </button>
                  <button type="button" onClick={() => idDocInputRef.current?.click()} disabled={uploadingIdDoc} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                    {uploadingIdDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Aggiorna
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Nessun documento caricato.</p>
                <button type="button" onClick={() => idDocInputRef.current?.click()} disabled={uploadingIdDoc} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                  {uploadingIdDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Carica Documento
                </button>
              </div>
            )}
            <input ref={idDocInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "idDocument"); e.target.value = ""; }} />
          </section>
        </>
      )}
    </div>
  );
}
