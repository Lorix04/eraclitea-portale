"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileCheck,
  FileText,
  Loader2,
  Save,
  Send,
  Upload,
} from "lucide-react";

type CvData = {
  status: string;
  requestedAt: string | null;
  deadline: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  fileName: string | null;
  consensoPrivacy: boolean;
  formData: Record<string, any> | null;
};

const CRITERIO_LABELS: Record<number, string> = {
  1: "Precedente esperienza come docente esterno (almeno 90 ore negli ultimi 3 anni)",
  2: "Laurea coerente con le materie oggetto della docenza + almeno una specifica",
  3: "Attestato frequenza corso formazione formatori (\u226564 ore) + esperienza + specifica",
  4: "Attestato frequenza corso formazione formatori (\u226540 ore) + esperienza + specifica",
  5: "Esperienza lavorativa almeno triennale nel settore + specifica",
  6: "Esperienza RSPP \u22656 mesi o ASPP \u226512 mesi + specifica",
};

const SPECIFICHE_OPTIONS = [
  "Percorso formativo in didattica (\u226524 ore) / abilitazione insegnamento",
  "Precedente esperienza docente \u226532 ore (salute e sicurezza)",
  "Precedente esperienza docente \u226540 ore (qualunque materia)",
  "Corso in affiancamento docente \u226548 ore",
];

const AREE_TEMATICHE = [
  { value: "A", label: "A \u2014 Normativa, Giuridica, Organizzativa" },
  { value: "B", label: "B \u2014 Rischi Tecnici" },
  { value: "C", label: "C \u2014 Rischi Igienico-Sanitari" },
  { value: "D", label: "D \u2014 Relazioni, Comunicazione" },
];

const DOC_PROBANTE_OPTIONS = [
  { value: "titolo_studi", label: "Titolo di studi" },
  { value: "attestato_formatore", label: "Attestato formatore" },
  { value: "attestati_formazione", label: "Attestati di formazione" },
  { value: "abilitazione_insegnamento", label: "Abilitazione all'insegnamento" },
  { value: "lettere_incarico", label: "Lettere di incarico" },
  { value: "registri_presenze", label: "Registri presenze" },
  { value: "altro", label: "Altro" },
];

const ATTREZZATURE_OPTIONS = [
  "Piattaforme di lavoro mobili elevabili",
  "Gru a torre",
  "Gru mobile",
  "Gru per autocarro",
  "Carrelli elevatori semoventi con conducente a bordo",
  "Trattori agricoli o forestali",
  "Escavatori",
  "Pale Caricatrici Frontali",
  "Terne",
  "Autoribaltabili a cingoli",
  "Pompe per calcestruzzo",
  "Macchina agricola raccoglifrutta (CRF)",
  "Caricatori per la movimentazione di materiali (CMM)",
  "Carroponte",
];

type AbilitazioneKey =
  | "attrezzature"
  | "ambientiConfinati"
  | "ponteggi"
  | "funi"
  | "segnaleticaStradale"
  | "antincendio"
  | "diisocianati"
  | "haccp"
  | "primoSoccorso"
  | "pesPavPei";

const ABILITAZIONI: { key: AbilitazioneKey; label: string }[] = [
  { key: "attrezzature", label: "Attrezzature (Accordo Stato Regioni)" },
  { key: "ambientiConfinati", label: "Ambienti confinati o sospetti di inquinamento" },
  { key: "ponteggi", label: "Ponteggi" },
  { key: "funi", label: "Funi (sistemi di accesso e posizionamento)" },
  { key: "segnaleticaStradale", label: "Segnaletica stradale" },
  { key: "antincendio", label: "Antincendio" },
  { key: "diisocianati", label: "Diisocianati (REACH)" },
  { key: "haccp", label: "HACCP" },
  { key: "primoSoccorso", label: "Primo Soccorso" },
  { key: "pesPavPei", label: "PES/PAV/PEI" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function fmtMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function deadlineInfo(deadline: string | null) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: "Scadenza superata!", cls: "text-red-600 font-semibold" };
  if (diff <= 3) return { text: `Scadenza imminente (${diff} giorn${diff === 1 ? "o" : "i"})`, cls: "text-amber-600 font-semibold" };
  return { text: `Scadenza: ${fmtDate(deadline)} (tra ${diff} giorni)`, cls: "text-muted-foreground" };
}

export default function CvDpr445Page() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [prerequisitoTitoloStudio, setPrerequisito] = useState("");
  const [criterioSelezionato, setCriterio] = useState<number | null>(null);
  const [criterioSpecifica, setCriterioSpec] = useState<string[]>([]);
  const [areeTematiche, setAree] = useState<string[]>([]);
  const [documentazioneProbante, setDocProbante] = useState<string[]>([]);
  const [dataConseguimento, setDataConseguimento] = useState("");
  const [dataAggiornamento, setDataAggiornamento] = useState("");
  const [modalitaAggiornamento, setModalitaAgg] = useState("");
  const [respProgetto, setRespProgetto] = useState(false);
  const [docResp, setDocResp] = useState<string[]>([]);
  // Abilitazioni state
  const [abilitazioni, setAbilitazioni] = useState<Record<string, boolean>>({});
  const [attrTeoriche, setAttrTeoriche] = useState<string[]>([]);
  const [attrPratiche, setAttrPratiche] = useState<string[]>([]);
  const [ambientiTipo, setAmbientiTipo] = useState("");
  const [antincendioIpotesi, setAntincendioIp] = useState("");
  const [primoSoccorsoTipo, setPrimoSoccorsoTipo] = useState<string[]>([]);
  const [consensoPrivacy, setConsensoPrivacy] = useState(false);
  const [openAbilitazioni, setOpenAbilitazioni] = useState<Set<string>>(new Set());

  const cvQuery = useQuery({
    queryKey: ["teacher-cv-dpr445"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/cv-dpr445");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore");
      return json.data as CvData;
    },
  });

  const cv = cvQuery.data;

  // Populate form from existing data
  const populateForm = (fd: Record<string, any> | null) => {
    if (!fd) return;
    setPrerequisito(fd.prerequisitoTitoloStudio || "");
    setCriterio(fd.criterioSelezionato ?? null);
    setAree(fd.areeTematiche || []);
    setDocProbante(fd.documentazioneProbante || []);
    setAbilitazioni({
      attrezzature: fd.abilitazioneAttrezzature || false,
      ambientiConfinati: fd.abilitazioneAmbientiConfinati || false,
      ponteggi: fd.abilitazionePonteggi || false,
      funi: fd.abilitazioneFuni || false,
      segnaleticaStradale: fd.abilitazioneSegnaleticaStradale || false,
      antincendio: fd.abilitazioneAntincendio || false,
      diisocianati: fd.abilitazioneDiisocianati || false,
      haccp: fd.abilitazioneHACCP || false,
      primoSoccorso: fd.abilitazionePrimoSoccorso || false,
      pesPavPei: fd.abilitazionePESPAVPEI || false,
    });
    setAttrTeoriche(fd.attrezzatureTeoriche || []);
    setAttrPratiche(fd.attrezzaturePratiche || []);
    setAntincendioIp(fd.antincendioIpotesi || "");
    setPrimoSoccorsoTipo(fd.primoSoccorsoTipo || []);
  };

  // Lazy populate on first render
  const [populated, setPopulated] = useState(false);
  if (cv?.formData && !populated) {
    populateForm(cv.formData);
    setConsensoPrivacy(cv.consensoPrivacy || false);
    setPopulated(true);
  }

  const buildFormData = () => {
    const fd = new FormData();
    if (file) fd.append("file", file);
    fd.append("prerequisitoTitoloStudio", prerequisitoTitoloStudio);
    if (criterioSelezionato) fd.append("criterioSelezionato", String(criterioSelezionato));
    if (criterioSpecifica.length) fd.append("criterioSpecifica", JSON.stringify(criterioSpecifica));
    fd.append("areeTematiche", JSON.stringify(areeTematiche));
    fd.append("documentazioneProbante", JSON.stringify(documentazioneProbante));
    if (dataConseguimento) fd.append("dataConseguimentoQualifica", dataConseguimento);
    if (dataAggiornamento) fd.append("dataAggiornamentoQualifica", dataAggiornamento);
    if (modalitaAggiornamento) fd.append("modalitaAggiornamento", modalitaAggiornamento);
    fd.append("responsabileProgettoFormativo", String(respProgetto));
    fd.append("docRespProgettoFormativo", JSON.stringify(docResp));
    fd.append("abilitazioneAttrezzature", String(abilitazioni.attrezzature || false));
    fd.append("attrezzatureTeoriche", JSON.stringify(attrTeoriche));
    fd.append("attrezzaturePratiche", JSON.stringify(attrPratiche));
    fd.append("abilitazioneAmbientiConfinati", String(abilitazioni.ambientiConfinati || false));
    fd.append("ambientiConfinatiTipo", ambientiTipo);
    fd.append("abilitazionePonteggi", String(abilitazioni.ponteggi || false));
    fd.append("abilitazioneFuni", String(abilitazioni.funi || false));
    fd.append("abilitazioneSegnaleticaStradale", String(abilitazioni.segnaleticaStradale || false));
    fd.append("abilitazioneAntincendio", String(abilitazioni.antincendio || false));
    fd.append("antincendioIpotesi", antincendioIpotesi);
    fd.append("abilitazioneDiisocianati", String(abilitazioni.diisocianati || false));
    fd.append("abilitazioneHACCP", String(abilitazioni.haccp || false));
    fd.append("abilitazionePrimoSoccorso", String(abilitazioni.primoSoccorso || false));
    fd.append("primoSoccorsoTipo", JSON.stringify(primoSoccorsoTipo));
    fd.append("abilitazionePESPAVPEI", String(abilitazioni.pesPavPei || false));
    fd.append("consensoPrivacy", String(consensoPrivacy));
    return fd;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/cv-dpr445", { method: "PUT", body: buildFormData() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore");
      toast.success("Bozza salvata");
      cvQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!file && !cv?.fileName) { toast.error("Carica il PDF compilato"); return; }
    if (file && file.size > MAX_FILE_SIZE) { toast.error("Il file supera il limite di 5MB"); return; }
    if (!prerequisitoTitoloStudio.trim()) { toast.error("Inserisci il titolo di studio prerequisito"); return; }
    if (!criterioSelezionato) { toast.error("Seleziona un criterio di qualificazione"); return; }
    if (areeTematiche.length === 0) { toast.error("Seleziona almeno un'area tematica"); return; }
    if (!consensoPrivacy) { toast.error("Il consenso privacy e obbligatorio"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher/cv-dpr445", { method: "PUT", body: buildFormData() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore");
      toast.success("CV inviato con successo");
      cvQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAbilitazione = (key: string) => {
    setOpenAbilitazioni((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleCheckbox = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  if (cvQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cv) {
    return <div className="text-sm text-muted-foreground">Errore nel caricamento.</div>;
  }

  const dlInfo = deadlineInfo(cv.deadline);

  // ── NOT_REQUESTED ────────────────────────────────────
  if (cv.status === "NOT_REQUESTED") {
    return (
      <div className="space-y-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <FileCheck className="h-5 w-5" /> CV DPR 445/2000
        </h1>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-2 text-sm text-muted-foreground">
            Nessuna richiesta di compilazione CV in corso.
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Quando richiesto, potrai compilare e inviare il tuo CV ai sensi del DPR 445/2000.
          </p>
          <a
            href="/api/teacher/cv-dpr445/template"
            download
            className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            <Download className="h-4 w-4" /> Scarica template PDF vuoto
          </a>
        </div>
      </div>
    );
  }

  // ── SUBMITTED ────────────────────────────────────────
  if (cv.status === "SUBMITTED") {
    return (
      <div className="space-y-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <FileCheck className="h-5 w-5" /> CV DPR 445/2000
        </h1>
        <div className="rounded-lg border bg-blue-50/50 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Check className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-blue-700">CV inviato con successo</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            In attesa di revisione da parte dell&apos;amministrazione.
          </p>
          <p className="text-sm">Inviato il: {fmtDate(cv.submittedAt)}</p>
          {cv.fileName && (
            <p className="text-sm mt-1">File: {cv.fileName}</p>
          )}
        </div>
      </div>
    );
  }

  // ── APPROVED ─────────────────────────────────────────
  if (cv.status === "APPROVED") {
    return (
      <div className="space-y-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <FileCheck className="h-5 w-5" /> CV DPR 445/2000
        </h1>
        <div className="rounded-lg border bg-emerald-50/50 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Check className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-emerald-700">CV Approvato</span>
          </div>
          <p className="text-sm">Approvato il: {fmtDate(cv.reviewedAt)}</p>
          {cv.fileName && (
            <p className="text-sm mt-1">File: {cv.fileName}</p>
          )}
        </div>
      </div>
    );
  }

  // ── REJECTED ─────────────────────────────────────────
  // Falls through to the form below (pre-populated)

  // ── REQUESTED / REJECTED → FORM ─────────────────────
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <FileCheck className="h-5 w-5" /> CV DPR 445/2000
      </h1>

      {/* Status banner */}
      {cv.status === "REJECTED" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">CV Rifiutato</span>
          </div>
          <p className="text-sm text-red-600">Motivo: {cv.rejectionReason}</p>
          <p className="text-sm text-muted-foreground mt-1">Ricompila e reinvia il documento.</p>
        </div>
      )}

      {cv.status === "REQUESTED" && (
        <div className={`rounded-lg border p-4 ${dlInfo?.cls?.includes("red") ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">
              Richiesta compilazione CV DPR 445/2000
            </span>
          </div>
          {dlInfo && <p className={`text-sm ${dlInfo.cls}`}>{dlInfo.text}</p>}
        </div>
      )}

      {/* Template download */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-semibold">Template PDF</h3>
        <a
          href="/api/teacher/cv-dpr445/template"
          download
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          <Download className="h-4 w-4" /> Scarica template vuoto
        </a>
      </div>

      {/* File upload */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-semibold">
          Carica il PDF compilato <span className="text-red-500">*</span>
        </h3>
        {file ? (
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2.5">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className={`text-xs ${file.size > MAX_FILE_SIZE ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                {fmtMB(file.size)}{file.size > MAX_FILE_SIZE ? " — Supera il limite di 5MB" : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <span className="text-xs">Rimuovi</span>
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("border-primary", "bg-primary/5");
              const f = e.dataTransfer.files[0];
              if (!f) return;
              if (!f.name.toLowerCase().endsWith(".pdf")) { toast.error("Solo file PDF"); return; }
              if (f.size > MAX_FILE_SIZE) { toast.error(`Il file supera il limite di 5MB (${fmtMB(f.size)})`); return; }
              setFile(f);
            }}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition hover:border-primary hover:bg-primary/5"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {cv.fileName ? `File attuale: ${cv.fileName}` : "Trascina il file o clicca per selezionare"}
            </p>
            <p className="text-xs text-muted-foreground">PDF, max 5MB</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (!f.name.toLowerCase().endsWith(".pdf")) { toast.error("Solo file PDF"); return; }
            if (f.size > MAX_FILE_SIZE) { toast.error(`Il file supera il limite di 5MB (${fmtMB(f.size)})`); return; }
            setFile(f);
          }}
        />
      </div>

      {/* Form sections */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Informazioni Principali</h2>

        {/* Sezione 1: Prerequisito */}
        <div className="rounded-lg border p-4">
          <label className="mb-2 block text-sm font-semibold">
            Titolo di Studio (prerequisito) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={prerequisitoTitoloStudio}
            onChange={(e) => setPrerequisito(e.target.value)}
            placeholder="es. Diploma di Perito Industriale"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        {/* Sezione 2: Criterio */}
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-semibold">
            Criterio di Qualificazione Formatore <span className="text-red-500">*</span>
          </p>
          <div className="space-y-2">
            {Object.entries(CRITERIO_LABELS).map(([k, label]) => (
              <label key={k} className="flex items-start gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/50">
                <input
                  type="radio"
                  name="criterio"
                  value={k}
                  checked={criterioSelezionato === Number(k)}
                  onChange={() => setCriterio(Number(k))}
                  className="mt-0.5"
                />
                <span className="text-sm">{k}) {label}</span>
              </label>
            ))}
          </div>
          {criterioSelezionato && criterioSelezionato >= 2 && (
            <div className="mt-3 rounded-md bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Specifica (seleziona almeno una):
              </p>
              {SPECIFICHE_OPTIONS.map((s) => (
                <label key={s} className="flex items-start gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={criterioSpecifica.includes(s)}
                    onChange={() => toggleCheckbox(criterioSpecifica, s, setCriterioSpec)}
                    className="mt-0.5 rounded"
                  />
                  <span className="text-sm">{s}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Sezione 3: Aree tematiche */}
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-semibold">
            Aree Tematiche <span className="text-red-500">*</span>
          </p>
          {AREE_TEMATICHE.map((a) => (
            <label key={a.value} className="flex items-center gap-2 cursor-pointer py-1.5">
              <input
                type="checkbox"
                checked={areeTematiche.includes(a.value)}
                onChange={() => toggleCheckbox(areeTematiche, a.value, setAree)}
                className="rounded"
              />
              <span className="text-sm">{a.label}</span>
            </label>
          ))}
        </div>

        {/* Sezione 4: Documentazione probante */}
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-semibold">Documentazione Probante</p>
          {DOC_PROBANTE_OPTIONS.map((d) => (
            <label key={d.value} className="flex items-center gap-2 cursor-pointer py-1.5">
              <input
                type="checkbox"
                checked={documentazioneProbante.includes(d.value)}
                onChange={() => toggleCheckbox(documentazioneProbante, d.value, setDocProbante)}
                className="rounded"
              />
              <span className="text-sm">{d.label}</span>
            </label>
          ))}
        </div>

        {/* Sezione 5: Qualifica */}
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-semibold">Qualifica Formatore</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Data conseguimento</label>
              <input type="date" value={dataConseguimento} onChange={(e) => setDataConseguimento(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Data aggiornamento</label>
              <input type="date" value={dataAggiornamento} onChange={(e) => setDataAggiornamento(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs text-muted-foreground">Modalita aggiornamento</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modalita" value="corsi_aggiornamento" checked={modalitaAggiornamento === "corsi_aggiornamento"} onChange={() => setModalitaAgg("corsi_aggiornamento")} />
                <span className="text-sm">Corsi di aggiornamento</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modalita" value="ore_docenza" checked={modalitaAggiornamento === "ore_docenza"} onChange={() => setModalitaAgg("ore_docenza")} />
                <span className="text-sm">Ore di docenza</span>
              </label>
            </div>
          </div>
        </div>

        {/* Sezione 6: Responsabile progetto formativo */}
        <div className="rounded-lg border p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={respProgetto} onChange={(e) => setRespProgetto(e.target.checked)} className="rounded" />
            <span className="text-sm font-semibold">Responsabile del Progetto Formativo</span>
          </label>
          {respProgetto && (
            <div className="mt-3 rounded-md bg-muted/30 p-3">
              <p className="mb-2 text-xs text-muted-foreground">Documentazione probante:</p>
              {["Lettere di incarico", "Visura Camerale", "Altro"].map((d) => (
                <label key={d} className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={docResp.includes(d)} onChange={() => toggleCheckbox(docResp, d, setDocResp)} className="rounded" />
                  <span className="text-sm">{d}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Sezione 7: Abilitazioni speciali */}
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-semibold">Abilitazioni Speciali</p>
          <div className="divide-y">
            {ABILITAZIONI.map(({ key, label }) => (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => toggleAbilitazione(key)}
                  className="flex w-full items-center justify-between py-3 text-sm hover:text-primary"
                >
                  <div className="flex items-center gap-2">
                    {abilitazioni[key] && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    <span className={abilitazioni[key] ? "font-medium" : ""}>{label}</span>
                  </div>
                  {openAbilitazioni.has(key) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {openAbilitazioni.has(key) && (
                  <div className="pb-3 pl-4">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={abilitazioni[key] || false}
                        onChange={(e) => setAbilitazioni((p) => ({ ...p, [key]: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Dichiaro di possedere i requisiti per questa abilitazione</span>
                    </label>
                    {key === "attrezzature" && abilitazioni.attrezzature && (
                      <div className="space-y-2 mt-2 rounded-md bg-muted/30 p-3">
                        <p className="text-xs font-semibold text-muted-foreground">Docente di parte teorica:</p>
                        {ATTREZZATURE_OPTIONS.map((a) => (
                          <label key={`t-${a}`} className="flex items-center gap-2 cursor-pointer py-0.5">
                            <input type="checkbox" checked={attrTeoriche.includes(a)} onChange={() => toggleCheckbox(attrTeoriche, a, setAttrTeoriche)} className="rounded" />
                            <span className="text-xs">{a}</span>
                          </label>
                        ))}
                        <p className="mt-2 text-xs font-semibold text-muted-foreground">Istruttore di parte pratica:</p>
                        {ATTREZZATURE_OPTIONS.map((a) => (
                          <label key={`p-${a}`} className="flex items-center gap-2 cursor-pointer py-0.5">
                            <input type="checkbox" checked={attrPratiche.includes(a)} onChange={() => toggleCheckbox(attrPratiche, a, setAttrPratiche)} className="rounded" />
                            <span className="text-xs">{a}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {key === "antincendio" && abilitazioni.antincendio && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Ipotesi:</p>
                        <div className="flex gap-3">
                          {["A", "B", "C", "D"].map((ip) => (
                            <label key={ip} className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" name="antincendioIp" value={ip} checked={antincendioIpotesi === ip} onChange={() => setAntincendioIp(ip)} />
                              <span className="text-sm">{ip}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {key === "ambientiConfinati" && abilitazioni.ambientiConfinati && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Tipo:</p>
                        <div className="flex gap-3">
                          {["teorica", "pratica"].map((t) => (
                            <label key={t} className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" name="ambientiTipo" value={t} checked={ambientiTipo === t} onChange={() => setAmbientiTipo(t)} />
                              <span className="text-sm capitalize">{t}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {key === "primoSoccorso" && abilitazioni.primoSoccorso && (
                      <div className="mt-2 space-y-1">
                        {["Laurea in Scienze Infermieristiche", "Diploma Infermiere", "Personale specializzato"].map((t) => (
                          <label key={t} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={primoSoccorsoTipo.includes(t)} onChange={() => toggleCheckbox(primoSoccorsoTipo, t, setPrimoSoccorsoTipo)} className="rounded" />
                            <span className="text-xs">{t}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sezione 8: Consenso privacy */}
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-semibold">Consenso Privacy <span className="text-red-500">*</span></p>
          <div className="mb-3 max-h-32 overflow-y-auto rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
            INFORMATIVA AI SENSI DEL REGOLAMENTO UE 2016/679 (GDPR) — I dati personali forniti saranno trattati dal titolare del trattamento ai sensi del DPR 445/2000, esclusivamente per le finalita connesse alla gestione dei rapporti formativi. I dati non saranno diffusi e saranno conservati per il tempo necessario all&apos;adempimento degli obblighi di legge. L&apos;interessato puo esercitare i diritti previsti dagli artt. 15-22 del Regolamento UE 2016/679.
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={consensoPrivacy} onChange={(e) => setConsensoPrivacy(e.target.checked)} className="rounded" />
            <span className="text-sm">Esprime il proprio consenso per il trattamento dei dati personali</span>
          </label>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          onClick={handleSaveDraft}
          disabled={saving || submitting}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salva bozza
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || submitting || (file !== null && file.size > MAX_FILE_SIZE)}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Invia CV
        </button>
      </div>
    </div>
  );
}
