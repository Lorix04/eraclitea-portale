"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CvSectionKey } from "@/lib/cv-schemas";

type CvEntryModalProps = {
  open: boolean;
  onClose: () => void;
  section: CvSectionKey;
  sectionLabel: string;
  entry?: any | null; // null = create, object = edit
  onSaved: () => void;
  apiBase: string; // e.g. "/api/teacher/cv"
};

const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SKILL_LEVELS = ["Base", "Intermedio", "Avanzato", "Esperto"];
const SKILL_CATEGORIES = ["Digitale", "Tecnica", "Software", "Gestionale", "Altro"];
const SECTORS = [
  "Formazione",
  "Sicurezza sul lavoro",
  "Consulenza",
  "Sanità",
  "Industria",
  "Edilizia",
  "Pubblica Amministrazione",
  "IT",
  "Altro",
];

export default function CvEntryModal({
  open,
  onClose,
  section,
  sectionLabel,
  entry,
  onSaved,
  apiBase,
}: CvEntryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!entry;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      if (entry) {
        const data = { ...entry };
        // Convert dates to YYYY-MM format for inputs
        for (const key of Object.keys(data)) {
          if (data[key] && typeof data[key] === "string" && data[key].includes("T")) {
            try {
              const d = new Date(data[key]);
              if (!isNaN(d.getTime())) {
                data[key] = d.toISOString().slice(0, 10);
              }
            } catch { /* ignore */ }
          }
        }
        setForm(data);
      } else {
        setForm({});
      }
    }
  }, [open, entry]);

  if (!open || !mounted) return null;

  const set = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const url = isEdit
        ? `${apiBase}/${section}/${entry.id}`
        : `${apiBase}/${section}`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Errore durante il salvataggio");
      }
      toast.success(isEdit ? "Elemento aggiornato" : "Elemento aggiunto");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setSubmitting(false);
    }
  };

  const renderFields = () => {
    switch (section) {
      case "work-experience":
        return (
          <>
            <Field label="Titolo/Ruolo" required>
              <input className={inputCls} value={form.jobTitle ?? ""} onChange={(e) => set("jobTitle", e.target.value)} />
            </Field>
            <Field label="Datore di lavoro" required>
              <input className={inputCls} value={form.employer ?? ""} onChange={(e) => set("employer", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Città">
                <input className={inputCls} value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="Settore">
                <select className={inputCls} value={form.sector ?? ""} onChange={(e) => set("sector", e.target.value)}>
                  <option value="">Seleziona...</option>
                  {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data inizio" required>
                <input type="date" className={inputCls} value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
              </Field>
              <Field label="Data fine">
                <input type="date" className={inputCls} value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} disabled={form.isCurrent} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isCurrent ?? false} onChange={(e) => {
                set("isCurrent", e.target.checked);
                if (e.target.checked) set("endDate", null);
              }} className="rounded" />
              Posizione attuale
            </label>
            <Field label="Descrizione">
              <textarea className={inputCls} rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </>
        );

      case "education":
        return (
          <>
            <Field label="Titolo di studio" required>
              <input className={inputCls} value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="Istituto/Università" required>
              <input className={inputCls} value={form.institution ?? ""} onChange={(e) => set("institution", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Campo di studi">
                <input className={inputCls} value={form.fieldOfStudy ?? ""} onChange={(e) => set("fieldOfStudy", e.target.value)} />
              </Field>
              <Field label="Città">
                <input className={inputCls} value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data inizio">
                <input type="date" className={inputCls} value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
              </Field>
              <Field label="Data fine">
                <input type="date" className={inputCls} value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} />
              </Field>
            </div>
            <Field label="Votazione">
              <input className={inputCls} value={form.grade ?? ""} onChange={(e) => set("grade", e.target.value)} placeholder="Es: 110/110 e lode" />
            </Field>
            <Field label="Descrizione">
              <textarea className={inputCls} rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </>
        );

      case "languages":
        return (
          <>
            <Field label="Lingua" required>
              <input className={inputCls} value={form.language ?? ""} onChange={(e) => set("language", e.target.value)} placeholder="Es: Inglese" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isNative ?? false} onChange={(e) => set("isNative", e.target.checked)} className="rounded" />
              Lingua madre
            </label>
            {!form.isNative ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Comprensione">
                    <select className={inputCls} value={form.listening ?? ""} onChange={(e) => set("listening", e.target.value)}>
                      <option value="">-</option>
                      {LANGUAGE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </Field>
                  <Field label="Lettura">
                    <select className={inputCls} value={form.reading ?? ""} onChange={(e) => set("reading", e.target.value)}>
                      <option value="">-</option>
                      {LANGUAGE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Parlato">
                    <select className={inputCls} value={form.speaking ?? ""} onChange={(e) => set("speaking", e.target.value)}>
                      <option value="">-</option>
                      {LANGUAGE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </Field>
                  <Field label="Scritto">
                    <select className={inputCls} value={form.writing ?? ""} onChange={(e) => set("writing", e.target.value)}>
                      <option value="">-</option>
                      {LANGUAGE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </Field>
                </div>
              </>
            ) : null}
            <Field label="Certificazione">
              <input className={inputCls} value={form.certificate ?? ""} onChange={(e) => set("certificate", e.target.value)} placeholder="Es: IELTS 7.0" />
            </Field>
          </>
        );

      case "certifications":
        return (
          <>
            <Field label="Nome certificazione" required>
              <input className={inputCls} value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Ente rilascio" required>
              <input className={inputCls} value={form.issuingBody ?? ""} onChange={(e) => set("issuingBody", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data rilascio">
                <input type="date" className={inputCls} value={form.issueDate ?? ""} onChange={(e) => set("issueDate", e.target.value)} />
              </Field>
              <Field label="Data scadenza">
                <input type="date" className={inputCls} value={form.expiryDate ?? ""} onChange={(e) => set("expiryDate", e.target.value)} />
              </Field>
            </div>
            <Field label="Numero/Codice">
              <input className={inputCls} value={form.credentialId ?? ""} onChange={(e) => set("credentialId", e.target.value)} />
            </Field>
            <Field label="Descrizione">
              <textarea className={inputCls} rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </>
        );

      case "skills":
        return (
          <>
            <Field label="Competenza" required>
              <input className={inputCls} value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Es: Microsoft Office" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria">
                <select className={inputCls} value={form.category ?? ""} onChange={(e) => set("category", e.target.value)}>
                  <option value="">Seleziona...</option>
                  {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Livello">
                <select className={inputCls} value={form.level ?? ""} onChange={(e) => set("level", e.target.value)}>
                  <option value="">Seleziona...</option>
                  {SKILL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
            </div>
          </>
        );

      case "training-courses":
        return (
          <>
            <Field label="Titolo corso" required>
              <input className={inputCls} value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ente erogatore">
                <input className={inputCls} value={form.provider ?? ""} onChange={(e) => set("provider", e.target.value)} />
              </Field>
              <Field label="Data">
                <input type="date" className={inputCls} value={form.date ?? ""} onChange={(e) => set("date", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Durata (ore)">
                <input type="number" className={inputCls} value={form.durationHours ?? ""} onChange={(e) => set("durationHours", e.target.value ? Number(e.target.value) : null)} />
              </Field>
              <Field label="Argomento">
                <input className={inputCls} value={form.topic ?? ""} onChange={(e) => set("topic", e.target.value)} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.certificate ?? false} onChange={(e) => set("certificate", e.target.checked)} className="rounded" />
              Certificato ricevuto
            </label>
            <Field label="Descrizione">
              <textarea className={inputCls} rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </>
        );

      case "teaching-experience":
        return (
          <>
            <Field label="Titolo corso erogato" required>
              <input className={inputCls} value={form.courseTitle ?? ""} onChange={(e) => set("courseTitle", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Materia/Argomento">
                <input className={inputCls} value={form.topic ?? ""} onChange={(e) => set("topic", e.target.value)} />
              </Field>
              <Field label="Ente/Azienda">
                <input className={inputCls} value={form.organization ?? ""} onChange={(e) => set("organization", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Destinatari">
                <input className={inputCls} value={form.targetAudience ?? ""} onChange={(e) => set("targetAudience", e.target.value)} placeholder="Es: Lavoratori, RSPP" />
              </Field>
              <Field label="Luogo">
                <input className={inputCls} value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data inizio">
                <input type="date" className={inputCls} value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
              </Field>
              <Field label="Data fine">
                <input type="date" className={inputCls} value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} />
              </Field>
            </div>
            <Field label="Ore totali erogate">
              <input type="number" className={inputCls} value={form.totalHours ?? ""} onChange={(e) => set("totalHours", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Descrizione">
              <textarea className={inputCls} rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </>
        );

      case "publications":
        return (
          <>
            <Field label="Titolo" required>
              <input className={inputCls} value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Editore/Rivista">
                <input className={inputCls} value={form.publisher ?? ""} onChange={(e) => set("publisher", e.target.value)} />
              </Field>
              <Field label="Data">
                <input type="date" className={inputCls} value={form.date ?? ""} onChange={(e) => set("date", e.target.value)} />
              </Field>
            </div>
            <Field label="URL">
              <input className={inputCls} value={form.url ?? ""} onChange={(e) => set("url", e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Descrizione">
              <textarea className={inputCls} rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </>
        );

      default:
        return null;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={() => { if (!submitting) onClose(); }} aria-hidden="true" />
      <div className="fixed inset-0 z-50 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="modal-panel bg-card shadow-lg sm:max-w-lg" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="text-lg font-semibold">
              {isEdit ? `Modifica` : `Aggiungi`} — {sectionLabel}
            </h2>
          </div>
          <div className="modal-body modal-scroll space-y-3">
            {renderFields()}
          </div>
          <div className="modal-footer flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
              Annulla
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Salva" : "Aggiungi"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Helpers
const inputCls = "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}
