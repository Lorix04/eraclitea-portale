"use client";

import { useEffect, useState } from "react";
import { ItalianDateInput } from "@/components/ui/italian-date-input";
import { formatItalianDate } from "@/lib/date-utils";
import { validateEmployee } from "@/lib/validators";
import { BrandedButton } from "@/components/BrandedButton";

export type EmployeeFormData = {
  nome: string;
  cognome: string;
  codiceFiscale: string;
  email: string;
  mansione: string;
  luogoNascita: string;
  note: string;
  dataNascita: string;
};

type EmployeeFormProps = {
  employee?: {
    nome?: string;
    cognome?: string;
    codiceFiscale?: string;
    email?: string | null;
    mansione?: string | null;
    luogoNascita?: string | null;
    note?: string | null;
    dataNascita?: string | Date | null;
  };
  onSubmit: (data: EmployeeFormData) => Promise<void> | void;
  isLoading?: boolean;
  useBranding?: boolean;
};

export default function EmployeeForm({
  employee,
  onSubmit,
  isLoading,
  useBranding = false,
}: EmployeeFormProps) {
  const [form, setForm] = useState<EmployeeFormData>({
    nome: employee?.nome ?? "",
    cognome: employee?.cognome ?? "",
    codiceFiscale: employee?.codiceFiscale ?? "",
    email: employee?.email ?? "",
    mansione: employee?.mansione ?? "",
    luogoNascita: employee?.luogoNascita ?? "",
    note: employee?.note ?? "",
    dataNascita: employee?.dataNascita
      ? formatItalianDate(employee.dataNascita)
      : "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({
      nome: employee?.nome ?? "",
      cognome: employee?.cognome ?? "",
      codiceFiscale: employee?.codiceFiscale ?? "",
      email: employee?.email ?? "",
      mansione: employee?.mansione ?? "",
      luogoNascita: employee?.luogoNascita ?? "",
      note: employee?.note ?? "",
      dataNascita: employee?.dataNascita
        ? formatItalianDate(employee.dataNascita)
        : "",
    });
  }, [employee]);

  const updateField = (key: keyof EmployeeFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateEmployee({
      nome: form.nome,
      cognome: form.cognome,
      codiceFiscale: form.codiceFiscale,
      email: form.email,
    });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Nome
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={form.nome}
            onChange={(event) => updateField("nome", event.target.value)}
          />
          {errors.nome ? (
            <span className="text-xs text-destructive">{errors.nome}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Cognome
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={form.cognome}
            onChange={(event) => updateField("cognome", event.target.value)}
          />
          {errors.cognome ? (
            <span className="text-xs text-destructive">{errors.cognome}</span>
          ) : null}
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        Codice Fiscale
        <input
          className="rounded-md border bg-muted px-3 py-2 text-muted-foreground"
          value={form.codiceFiscale}
          disabled
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Email
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
          {errors.email ? (
            <span className="text-xs text-destructive">{errors.email}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Mansione
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={form.mansione}
            onChange={(event) => updateField("mansione", event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ItalianDateInput
          label="Data di nascita"
          value={form.dataNascita}
          onChange={(value) => updateField("dataNascita", value)}
        />
        <label className="flex flex-col gap-2 text-sm">
          Luogo di nascita
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={form.luogoNascita}
            onChange={(event) => updateField("luogoNascita", event.target.value)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        Note
        <textarea
          className="min-h-[100px] rounded-md border bg-background px-3 py-2"
          value={form.note}
          onChange={(event) => updateField("note", event.target.value)}
        />
      </label>

      {useBranding ? (
        <BrandedButton type="submit" disabled={isLoading}>
          {isLoading ? "Salvataggio..." : "Salva modifiche"}
        </BrandedButton>
      ) : (
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          disabled={isLoading}
        >
          {isLoading ? "Salvataggio..." : "Salva modifiche"}
        </button>
      )}
    </form>
  );
}
