"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { ItalianDateInput } from "@/components/ui/italian-date-input";
import { BrandedButton } from "@/components/BrandedButton";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";
import EmployeeCard from "@/components/EmployeeCard";
import { decodeCF } from "@/lib/codice-fiscale-decoder";
import { formatItalianDate } from "@/lib/date-utils";
import { isValidCodiceFiscale } from "@/lib/validators";
import type { EmployeeFormRow } from "@/types";

type CodiciCatastaliMap = Record<string, { nome: string; provincia: string; cap: string }>;

type EmployeeCardFormProps = {
  data: EmployeeFormRow[];
  onChange: (rows: EmployeeFormRow[]) => void;
  onSave: () => void;
  saving?: boolean;
  readOnly?: boolean;
  clientId?: string;
  codiciCatastali?: CodiciCatastaliMap | null;
};

type LookupEmployee = {
  id: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  sesso?: string | null;
  dataNascita?: string | null;
  luogoNascita?: string | null;
  email?: string | null;
  telefono?: string | null;
  cellulare?: string | null;
  indirizzo?: string | null;
  comuneResidenza?: string | null;
  cap?: string | null;
  mansione?: string | null;
  note?: string | null;
};

const emptyRow: EmployeeFormRow = {
  nome: "",
  cognome: "",
  codiceFiscale: "",
  sesso: "",
  dataNascita: "",
  luogoNascita: "",
  email: "",
  telefono: "",
  cellulare: "",
  indirizzo: "",
  comuneResidenza: "",
  cap: "",
  mansione: "",
  note: "",
};

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function EmployeeCardForm({
  data,
  onChange,
  onSave,
  saving = false,
  readOnly = false,
  clientId,
  codiciCatastali,
}: EmployeeCardFormProps) {
  const [form, setForm] = useState<EmployeeFormRow>(emptyRow);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDetails, setShowDetails] = useState(false);
  const [lookupSuggestion, setLookupSuggestion] = useState<LookupEmployee | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const lastLookupCfRef = useRef("");

  const updateField = (key: keyof EmployeeFormRow, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
    if (key === "codiceFiscale") {
      setLookupSuggestion(null);
      lastLookupCfRef.current = "";
    }
  };

  const applyDecodeFromCF = (normalizedCF: string) => {
    const decoded = decodeCF(normalizedCF);
    if (!decoded) return;

    setForm((prev) => {
      const next = { ...prev };
      if (!String(next.dataNascita ?? "").trim()) {
        next.dataNascita = decoded.dataNascita;
      }
      if (!String(next.sesso ?? "").trim()) {
        next.sesso = decoded.sesso;
      }
      if (!String(next.luogoNascita ?? "").trim() && codiciCatastali) {
        const comune = codiciCatastali[decoded.codiceCatastale];
        if (comune) {
          next.luogoNascita = comune.provincia
            ? `${comune.nome} (${comune.provincia})`
            : comune.nome;
        }
      }
      return next;
    });
  };

  const handleCodiceFiscaleBlur = async () => {
    if (readOnly) return;

    const normalizedCF = (form.codiceFiscale ?? "").trim().toUpperCase();
    if (normalizedCF.length !== 16) return;

    applyDecodeFromCF(normalizedCF);

    if (form.nome.trim()) return;
    if (lastLookupCfRef.current === normalizedCF) return;
    lastLookupCfRef.current = normalizedCF;

    setLookupLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("cf", normalizedCF);
      if (clientId) {
        params.set("clientId", clientId);
      }

      const res = await fetch(`/api/dipendenti/lookup?${params.toString()}`);
      if (!res.ok) {
        setLookupSuggestion(null);
        return;
      }

      const json = await res.json().catch(() => ({}));
      const employee = (json.data ?? null) as LookupEmployee | null;
      setLookupSuggestion(employee);
    } catch {
      setLookupSuggestion(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleApplySuggestion = () => {
    if (!lookupSuggestion) return;

    setForm((prev) => ({
      ...prev,
      nome: lookupSuggestion.nome ?? prev.nome,
      cognome: lookupSuggestion.cognome ?? prev.cognome,
      sesso: lookupSuggestion.sesso ?? prev.sesso ?? "",
      dataNascita: lookupSuggestion.dataNascita
        ? formatItalianDate(lookupSuggestion.dataNascita)
        : prev.dataNascita,
      luogoNascita: lookupSuggestion.luogoNascita ?? prev.luogoNascita ?? "",
      email: lookupSuggestion.email ?? prev.email ?? "",
      telefono: lookupSuggestion.telefono ?? prev.telefono ?? "",
      cellulare: lookupSuggestion.cellulare ?? prev.cellulare ?? "",
      indirizzo: lookupSuggestion.indirizzo ?? prev.indirizzo ?? "",
      comuneResidenza:
        lookupSuggestion.comuneResidenza ?? prev.comuneResidenza ?? "",
      cap: lookupSuggestion.cap ?? prev.cap ?? "",
      mansione: lookupSuggestion.mansione ?? prev.mansione ?? "",
      note: lookupSuggestion.note ?? prev.note ?? "",
    }));

    setLookupSuggestion(null);
    setErrors((prev) => ({
      ...prev,
      nome: "",
      cognome: "",
      codiceFiscale: "",
      sesso: "",
      dataNascita: "",
      luogoNascita: "",
      email: "",
      comuneResidenza: "",
      cap: "",
    }));
  };

  const validateForm = () => {
    const fieldErrors: Record<string, string> = {};

    if (!String(form.nome ?? "").trim()) fieldErrors.nome = "Questo campo è obbligatorio";
    if (!String(form.cognome ?? "").trim()) fieldErrors.cognome = "Questo campo è obbligatorio";

    const cf = String(form.codiceFiscale ?? "").trim();
    if (!cf) {
      fieldErrors.codiceFiscale = "Questo campo è obbligatorio";
    } else if (!isValidCodiceFiscale(cf)) {
      fieldErrors.codiceFiscale = "Codice fiscale non valido.";
    }

    if (!String(form.sesso ?? "").trim()) fieldErrors.sesso = "Questo campo è obbligatorio";

    const dataNascita = String(form.dataNascita ?? "").trim();
    if (!dataNascita) fieldErrors.dataNascita = "Questo campo è obbligatorio";

    if (!String(form.luogoNascita ?? "").trim()) {
      fieldErrors.luogoNascita = "Questo campo è obbligatorio";
    }

    const email = String(form.email ?? "").trim();
    if (!email) {
      fieldErrors.email = "Questo campo è obbligatorio";
    } else if (!validateEmail(email)) {
      fieldErrors.email = "Email non valida";
    }

    if (!String(form.comuneResidenza ?? "").trim()) {
      fieldErrors.comuneResidenza = "Questo campo è obbligatorio";
    }
    if (!String(form.cap ?? "").trim()) {
      fieldErrors.cap = "Questo campo è obbligatorio";
    }

    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const resetEditor = () => {
    setEditingIndex(null);
    setForm(emptyRow);
    setErrors({});
    setLookupSuggestion(null);
    setLookupLoading(false);
    lastLookupCfRef.current = "";
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const next = [...data];
    if (editingIndex !== null) {
      next[editingIndex] = form;
    } else {
      next.push(form);
    }
    onChange(next);
    resetEditor();
    setShowDetails(false);
  };

  const handleEdit = (index: number) => {
    setForm(data[index]);
    setEditingIndex(index);
    setLookupSuggestion(null);
    setLookupLoading(false);
    lastLookupCfRef.current = "";
    setShowDetails(true);
  };

  const handleRemove = (index: number) => {
    const next = data.filter((_, idx) => idx !== index);
    onChange(next);
  };

  const handleFabAdd = () => {
    resetEditor();
    setShowDetails(false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => nameInputRef.current?.focus(), 200);
  };

  return (
    <div className="space-y-4">
      <div ref={formRef} className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Scheda dipendente</p>
        <FormRequiredLegend />

        <div className="mt-4 grid gap-3">
          <div className="flex flex-col gap-2 text-sm">
            <FormLabel required>Nome</FormLabel>
            <input
              className={`rounded-md border bg-background px-3 py-2 text-sm ${
                errors.nome ? "border-red-500 focus-visible:outline-red-500" : ""
              }`}
              value={form.nome}
              onChange={(event) => updateField("nome", event.target.value)}
              disabled={readOnly}
              ref={nameInputRef}
            />
            <FormFieldError message={errors.nome} />
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <FormLabel required>Cognome</FormLabel>
            <input
              className={`rounded-md border bg-background px-3 py-2 text-sm ${
                errors.cognome ? "border-red-500 focus-visible:outline-red-500" : ""
              }`}
              value={form.cognome}
              onChange={(event) => updateField("cognome", event.target.value)}
              disabled={readOnly}
            />
            <FormFieldError message={errors.cognome} />
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <FormLabel required>Codice fiscale</FormLabel>
            <input
              className={`rounded-md border bg-background px-3 py-2 text-sm ${
                errors.codiceFiscale
                  ? "border-red-500 focus-visible:outline-red-500"
                  : ""
              }`}
              value={form.codiceFiscale}
              onChange={(event) =>
                updateField("codiceFiscale", event.target.value.toUpperCase())
              }
              onBlur={handleCodiceFiscaleBlur}
              disabled={readOnly}
            />
            <FormFieldError message={errors.codiceFiscale} />
            {!readOnly && lookupLoading ? (
              <p className="text-xs text-muted-foreground">Ricerca dipendente...</p>
            ) : null}
            {!readOnly && lookupSuggestion && !form.nome?.trim() ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900">
                <p className="font-medium">
                  Dipendente trovato: {lookupSuggestion.nome} {lookupSuggestion.cognome}
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <button
                    type="button"
                    className="text-blue-700 underline hover:text-blue-900"
                    onClick={handleApplySuggestion}
                  >
                    Compila automaticamente
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground underline hover:text-foreground"
                    onClick={() => setLookupSuggestion(null)}
                  >
                    Ignora
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <FormLabel required>Sesso</FormLabel>
            <div className="flex items-center gap-4 rounded-md border bg-background px-3 py-2">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="sesso"
                  value="M"
                  checked={form.sesso === "M"}
                  onChange={(event) => updateField("sesso", event.target.value)}
                  disabled={readOnly}
                />
                M
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="sesso"
                  value="F"
                  checked={form.sesso === "F"}
                  onChange={(event) => updateField("sesso", event.target.value)}
                  disabled={readOnly}
                />
                F
              </label>
            </div>
            <FormFieldError message={errors.sesso} />
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <ItalianDateInput
              id="dataNascita"
              label="Data di Nascita"
              value={form.dataNascita || ""}
              onChange={(value) => updateField("dataNascita", value)}
              disabled={readOnly}
              required
              error={errors.dataNascita}
            />
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <FormLabel required>Comune Nascita</FormLabel>
            <input
              className={`rounded-md border bg-background px-3 py-2 text-sm ${
                errors.luogoNascita
                  ? "border-red-500 focus-visible:outline-red-500"
                  : ""
              }`}
              value={form.luogoNascita || ""}
              onChange={(event) => updateField("luogoNascita", event.target.value)}
              disabled={readOnly}
            />
            <FormFieldError message={errors.luogoNascita} />
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <FormLabel required>Email</FormLabel>
            <input
              className={`rounded-md border bg-background px-3 py-2 text-sm ${
                errors.email ? "border-red-500 focus-visible:outline-red-500" : ""
              }`}
              value={form.email || ""}
              onChange={(event) => updateField("email", event.target.value)}
              disabled={readOnly}
            />
            <FormFieldError message={errors.email} />
          </div>

          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div className="flex flex-col gap-2 text-sm">
              <FormLabel required>Comune residenza</FormLabel>
              <input
                className={`rounded-md border bg-background px-3 py-2 text-sm ${
                  errors.comuneResidenza
                    ? "border-red-500 focus-visible:outline-red-500"
                    : ""
                }`}
                value={form.comuneResidenza || ""}
                onChange={(event) => updateField("comuneResidenza", event.target.value)}
                disabled={readOnly}
              />
              <FormFieldError message={errors.comuneResidenza} />
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <FormLabel required>CAP</FormLabel>
              <input
                className={`rounded-md border bg-background px-3 py-2 text-sm ${
                  errors.cap ? "border-red-500 focus-visible:outline-red-500" : ""
                }`}
                value={form.cap || ""}
                onChange={(event) => updateField("cap", event.target.value)}
                maxLength={5}
                disabled={readOnly}
              />
              <FormFieldError message={errors.cap} />
            </div>
          </div>
        </div>

        <button
          type="button"
          className="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
          onClick={() => setShowDetails((prev) => !prev)}
        >
          {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showDetails ? "Nascondi dettagli" : "Mostra dettagli"}
        </button>

        {showDetails ? (
          <div className="mt-3 grid gap-3">
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Telefono"
              value={form.telefono || ""}
              onChange={(event) => updateField("telefono", event.target.value)}
              disabled={readOnly}
            />
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Cellulare"
              value={form.cellulare || ""}
              onChange={(event) => updateField("cellulare", event.target.value)}
              disabled={readOnly}
            />
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Indirizzo"
              value={form.indirizzo || ""}
              onChange={(event) => updateField("indirizzo", event.target.value)}
              disabled={readOnly}
            />
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Mansione"
              value={form.mansione || ""}
              onChange={(event) => updateField("mansione", event.target.value)}
              disabled={readOnly}
            />
            <textarea
              className="min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Note"
              value={form.note || ""}
              onChange={(event) => updateField("note", event.target.value)}
              disabled={readOnly}
            />
          </div>
        ) : null}

        <div className="mt-3 flex gap-2">
          <BrandedButton size="sm" onClick={handleSubmit} disabled={readOnly}>
            {editingIndex !== null ? "Aggiorna" : "Aggiungi"}
          </BrandedButton>
          {editingIndex !== null ? (
            <BrandedButton variant="outline" size="sm" onClick={resetEditor} disabled={readOnly}>
              Annulla
            </BrandedButton>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Dipendenti inseriti</p>
          <span className="text-xs text-muted-foreground">{data.length} dipendenti inseriti</span>
        </div>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun dipendente.</p>
        ) : (
          data.map((row, index) => (
            <EmployeeCard
              key={`${row.codiceFiscale}-${index}`}
              title={`${row.cognome} ${row.nome}`}
              subtitle={row.codiceFiscale}
              onEdit={() => handleEdit(index)}
              onDelete={() => handleRemove(index)}
              disabled={readOnly}
            />
          ))
        )}
      </div>

      <BrandedButton className="w-full" onClick={onSave} disabled={saving || readOnly}>
        {saving ? "Salvataggio..." : "Salva anagrafiche"}
      </BrandedButton>

      {!readOnly ? (
        <button
          type="button"
          onClick={handleFabAdd}
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-colors hover:opacity-90 md:hidden"
          aria-label="Aggiungi dipendente"
        >
          <Plus className="h-6 w-6" />
        </button>
      ) : null}
    </div>
  );
}
