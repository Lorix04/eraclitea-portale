"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { isValidCodiceFiscale } from "@/lib/validators";
import EmployeeCard from "@/components/EmployeeCard";
import { ItalianDateInput } from "@/components/ui/italian-date-input";
import { BrandedButton } from "@/components/BrandedButton";

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
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = () => {
    setError(null);
    if (!form.nome || !form.cognome || !form.codiceFiscale) {
      setError("Nome, cognome e codice fiscale sono obbligatori.");
      return;
    }
    if (!isValidCodiceFiscale(form.codiceFiscale)) {
      setError("Codice fiscale non valido.");
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
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => nameInputRef.current?.focus(), 200);
  };

  return (
    <div className="space-y-4">
      <div ref={formRef} className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Scheda dipendente</p>
        <div className="mt-4 grid gap-3">
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Nome"
            value={form.nome}
            onChange={(event) => setForm({ ...form, nome: event.target.value })}
            disabled={readOnly}
            ref={nameInputRef}
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Cognome"
            value={form.cognome}
            onChange={(event) => setForm({ ...form, cognome: event.target.value })}
            disabled={readOnly}
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Codice fiscale"
            value={form.codiceFiscale}
            onChange={(event) =>
              setForm({ ...form, codiceFiscale: event.target.value.toUpperCase() })
            }
            disabled={readOnly}
          />
          <ItalianDateInput
            id="dataNascita"
            label="Data di Nascita"
            value={form.dataNascita || ""}
            onChange={(value) => setForm({ ...form, dataNascita: value })}
            disabled={readOnly}
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Luogo nascita"
            value={form.luogoNascita}
            onChange={(event) =>
              setForm({ ...form, luogoNascita: event.target.value })
            }
            disabled={readOnly}
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            disabled={readOnly}
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Mansione"
            value={form.mansione}
            onChange={(event) =>
              setForm({ ...form, mansione: event.target.value })
            }
            disabled={readOnly}
          />
          <textarea
            className="min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Note"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
            disabled={readOnly}
          />
        </div>
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
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
