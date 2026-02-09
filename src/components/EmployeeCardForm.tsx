"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { isValidCodiceFiscale } from "@/lib/validators";
import EmployeeCard from "@/components/EmployeeCard";
import { ItalianDateInput } from "@/components/ui/italian-date-input";
import { BrandedButton } from "@/components/BrandedButton";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";

type EmployeeRow = {
  nome: string;
  cognome: string;
  codiceFiscale: string;
  dataNascita?: string;
  luogoNascita?: string;
  email?: string;
  mansione?: string;
  note?: string;
};

type EmployeeCardFormProps = {
  data: EmployeeRow[];
  onChange: (rows: EmployeeRow[]) => void;
  onSave: () => void;
  saving?: boolean;
  readOnly?: boolean;
};

const emptyRow: EmployeeRow = {
  nome: "",
  cognome: "",
  codiceFiscale: "",
  dataNascita: "",
  luogoNascita: "",
  email: "",
  mansione: "",
  note: "",
};

export default function EmployeeCardForm({
  data,
  onChange,
  onSave,
  saving = false,
  readOnly = false,
}: EmployeeCardFormProps) {
  const [form, setForm] = useState<EmployeeRow>(emptyRow);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const updateField = (key: keyof EmployeeRow, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleSubmit = () => {
    setErrors({});
    const fieldErrors: Record<string, string> = {};
    if (!form.nome.trim()) fieldErrors.nome = "Questo campo è obbligatorio";
    if (!form.cognome.trim()) fieldErrors.cognome = "Questo campo è obbligatorio";
    if (!form.codiceFiscale.trim())
      fieldErrors.codiceFiscale = "Questo campo è obbligatorio";
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    if (!isValidCodiceFiscale(form.codiceFiscale)) {
      setErrors({ codiceFiscale: "Codice fiscale non valido." });
      return;
    }

    const next = [...data];
    if (editingIndex !== null) {
      next[editingIndex] = form;
    } else {
      next.push(form);
    }
    onChange(next);
    setForm(emptyRow);
    setEditingIndex(null);
  };

  const handleEdit = (index: number) => {
    setForm(data[index]);
    setEditingIndex(index);
  };

  const handleRemove = (index: number) => {
    const next = data.filter((_, idx) => idx !== index);
    onChange(next);
  };

  const handleFabAdd = () => {
    setEditingIndex(null);
    setForm(emptyRow);
    setErrors({});
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
                errors.cognome
                  ? "border-red-500 focus-visible:outline-red-500"
                  : ""
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
              disabled={readOnly}
            />
            <FormFieldError message={errors.codiceFiscale} />
          </div>
          <ItalianDateInput
            id="dataNascita"
            label="Data di Nascita"
            value={form.dataNascita || ""}
            onChange={(value) => updateField("dataNascita", value)}
            disabled={readOnly}
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Luogo nascita"
            value={form.luogoNascita}
            onChange={(event) => updateField("luogoNascita", event.target.value)}
            disabled={readOnly}
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            disabled={readOnly}
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Mansione"
            value={form.mansione}
            onChange={(event) => updateField("mansione", event.target.value)}
            disabled={readOnly}
          />
          <textarea
            className="min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Note"
            value={form.note}
            onChange={(event) => updateField("note", event.target.value)}
            disabled={readOnly}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <BrandedButton
            size="sm"
            onClick={handleSubmit}
            disabled={readOnly}
          >
            {editingIndex !== null ? "Aggiorna" : "Aggiungi"}
          </BrandedButton>
          {editingIndex !== null ? (
            <BrandedButton
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingIndex(null);
                setForm(emptyRow);
              }}
              disabled={readOnly}
            >
              Annulla
            </BrandedButton>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Dipendenti inseriti</p>
          <span className="text-xs text-muted-foreground">
            {data.length} dipendenti inseriti
          </span>
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

      <BrandedButton
        className="w-full"
        onClick={onSave}
        disabled={saving || readOnly}
      >
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
