"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { ItalianDateInput } from "@/components/ui/italian-date-input";
import { formatItalianDate } from "@/lib/date-utils";
import { BrandedButton } from "@/components/BrandedButton";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";
import { isValidCodiceFiscale } from "@/lib/validators";
import { useProvinceRegioni } from "@/hooks/useProvinceRegioni";

export type EmployeeFormData = {
  nome: string;
  cognome: string;
  codiceFiscale: string;
  sesso: string;
  email: string;
  telefono: string;
  cellulare: string;
  indirizzo: string;
  comuneResidenza: string;
  cap: string;
  provincia: string;
  regione: string;
  emailAziendale: string;
  pec: string;
  partitaIva: string;
  iban: string;
  mansione: string;
  luogoNascita: string;
  note: string;
  dataNascita: string;
};

type EmployeeFormProps = {
  employeeId?: string;
  role: "ADMIN" | "CLIENT";
  clientId?: string | null;
  employee?: {
    nome?: string;
    cognome?: string;
    codiceFiscale?: string;
    sesso?: string | null;
    email?: string | null;
    telefono?: string | null;
    cellulare?: string | null;
    indirizzo?: string | null;
    comuneResidenza?: string | null;
    cap?: string | null;
    provincia?: string | null;
    regione?: string | null;
    emailAziendale?: string | null;
    pec?: string | null;
    partitaIva?: string | null;
    iban?: string | null;
    mansione?: string | null;
    luogoNascita?: string | null;
    note?: string | null;
    dataNascita?: string | Date | null;
  };
  onSubmit: (data: EmployeeFormData) => Promise<void> | void;
  isLoading?: boolean;
  useBranding?: boolean;
};

function normalizeForm(employee?: EmployeeFormProps["employee"]): EmployeeFormData {
  return {
    nome: employee?.nome ?? "",
    cognome: employee?.cognome ?? "",
    codiceFiscale: employee?.codiceFiscale ?? "",
    sesso: employee?.sesso ?? "",
    email: employee?.email ?? "",
    telefono: employee?.telefono ?? "",
    cellulare: employee?.cellulare ?? "",
    indirizzo: employee?.indirizzo ?? "",
    comuneResidenza: employee?.comuneResidenza ?? "",
    cap: employee?.cap ?? "",
    provincia: employee?.provincia ?? "",
    regione: employee?.regione ?? "",
    emailAziendale: employee?.emailAziendale ?? "",
    pec: employee?.pec ?? "",
    partitaIva: employee?.partitaIva ?? "",
    iban: employee?.iban ?? "",
    mansione: employee?.mansione ?? "",
    luogoNascita: employee?.luogoNascita ?? "",
    note: employee?.note ?? "",
    dataNascita: employee?.dataNascita ? formatItalianDate(employee.dataNascita) : "",
  };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function EmployeeForm({
  employeeId,
  role,
  clientId,
  employee,
  onSubmit,
  isLoading,
  useBranding = false,
}: EmployeeFormProps) {
  const [form, setForm] = useState<EmployeeFormData>(normalizeForm(employee));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cfValidation, setCfValidation] = useState<{
    loading: boolean;
    valid: boolean | null;
    mismatches: string[];
    warnings: string[];
    duplicate: boolean;
    duplicateEmployee: { id: string; fullName: string; fiscalCode: string } | null;
  }>({
    loading: false,
    valid: null,
    mismatches: [],
    warnings: [],
    duplicate: false,
    duplicateEmployee: null,
  });
  const [submitBlockMessage, setSubmitBlockMessage] = useState<string | null>(null);
  const { province, filterProvince, filterRegioni, getRegioneByProvincia } =
    useProvinceRegioni();
  const initialCF = (employee?.codiceFiscale ?? "").trim().toUpperCase();

  useEffect(() => {
    setForm(normalizeForm(employee));
    setCfValidation({
      loading: false,
      valid: null,
      mismatches: [],
      warnings: [],
      duplicate: false,
      duplicateEmployee: null,
    });
    setSubmitBlockMessage(null);
  }, [employee]);

  const updateField = (key: keyof EmployeeFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleProvinciaChange = (value: string) => {
    const trimmed = value.trim();
    let provinciaValue = trimmed;

    const labelMatch = trimmed.match(/^(.*?)\s*\(([A-Za-z]{2})\)\s*$/);
    if (labelMatch?.[1]) {
      provinciaValue = labelMatch[1].trim();
    } else {
      const normalized = trimmed.toLowerCase();
      const bySigla = province.find(
        (item) => item.sigla.toLowerCase() === normalized
      );
      const byNome = province.find(
        (item) => item.nome.toLowerCase() === normalized
      );
      if (bySigla) provinciaValue = bySigla.nome;
      if (byNome) provinciaValue = byNome.nome;
    }

    setForm((prev) => {
      const next = { ...prev, provincia: provinciaValue };
      const regione = getRegioneByProvincia(provinciaValue);
      if (regione) {
        next.regione = regione;
      }
      return next;
    });
  };

  const provinciaSuggestions = useMemo(
    () => filterProvince(form.provincia || "").slice(0, 30),
    [filterProvince, form.provincia]
  );
  const regioneSuggestions = useMemo(
    () => filterRegioni(form.regione || "").slice(0, 30),
    [filterRegioni, form.regione]
  );
  const normalizedCF = form.codiceFiscale.trim().toUpperCase();
  const cfLength = normalizedCF.length;
  const hasChangedCF = normalizedCF !== initialCF;

  useEffect(() => {
    const controller = new AbortController();

    if (!hasChangedCF || cfLength < 16) {
      setCfValidation((prev) => ({
        ...prev,
        loading: false,
        valid: null,
        mismatches: [],
        warnings: [],
        duplicate: false,
        duplicateEmployee: null,
      }));
      return () => controller.abort();
    }

    if (!isValidCodiceFiscale(normalizedCF)) {
      setCfValidation({
        loading: false,
        valid: false,
        mismatches: [],
        warnings: [],
        duplicate: false,
        duplicateEmployee: null,
      });
      return () => controller.abort();
    }

    setCfValidation((prev) => ({ ...prev, loading: true }));

    fetch("/api/dipendenti/validate-cf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fiscalCode: normalizedCF,
        employeeId,
        clientId,
        firstName: form.nome,
        lastName: form.cognome,
        birthDate: form.dataNascita,
        gender: form.sesso,
        birthPlace: form.luogoNascita,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Validation failed");
        }
        return res.json();
      })
      .then((data) => {
        setCfValidation({
          loading: false,
          valid: Boolean(data.valid),
          mismatches: Array.isArray(data.mismatches) ? data.mismatches : [],
          warnings: Array.isArray(data.warnings) ? data.warnings : [],
          duplicate: Boolean(data.duplicate),
          duplicateEmployee: data.duplicateEmployee ?? null,
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCfValidation({
          loading: false,
          valid: null,
          mismatches: [],
          warnings: ["Impossibile verificare il codice fiscale in questo momento"],
          duplicate: false,
          duplicateEmployee: null,
        });
      });

    return () => controller.abort();
  }, [
    hasChangedCF,
    cfLength,
    normalizedCF,
    employeeId,
    clientId,
    form.nome,
    form.cognome,
    form.dataNascita,
    form.sesso,
    form.luogoNascita,
  ]);

  const hasClientBlockingIssues =
    role === "CLIENT" &&
    hasChangedCF &&
    cfLength === 16 &&
    (cfValidation.valid === false ||
      cfValidation.mismatches.length > 0 ||
      cfValidation.duplicate);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.nome.trim()) nextErrors.nome = "Nome obbligatorio";
    if (!form.cognome.trim()) nextErrors.cognome = "Cognome obbligatorio";

    const codiceFiscale = form.codiceFiscale.trim().toUpperCase();
    if (!codiceFiscale) {
      nextErrors.codiceFiscale = "Codice fiscale obbligatorio";
    } else if (!isValidCodiceFiscale(codiceFiscale)) {
      nextErrors.codiceFiscale = "Codice fiscale non valido";
    }

    if (!form.sesso) nextErrors.sesso = "Sesso obbligatorio";
    if (!form.dataNascita.trim()) nextErrors.dataNascita = "Data di nascita obbligatoria";
    if (!form.luogoNascita.trim()) nextErrors.luogoNascita = "Comune di nascita obbligatorio";

    if (!form.email.trim()) {
      nextErrors.email = "Email obbligatoria";
    } else if (!isValidEmail(form.email.trim())) {
      nextErrors.email = "Email non valida";
    }
    if (!form.comuneResidenza.trim()) {
      nextErrors.comuneResidenza = "Comune di residenza obbligatorio";
    }
    if (!form.cap.trim()) {
      nextErrors.cap = "CAP obbligatorio";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitBlockMessage(null);
    if (!validate()) return;
    if (hasClientBlockingIssues) {
      const parts = [
        cfValidation.mismatches.length > 0
          ? "il codice fiscale presenta incongruenze con i dati anagrafici"
          : null,
        cfValidation.duplicate
          ? "il codice fiscale è già assegnato a un altro dipendente"
          : null,
      ].filter(Boolean);
      setSubmitBlockMessage(
        `Impossibile salvare: ${parts.join(" e ")}.`
      );
      return;
    }
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormRequiredLegend />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FormLabel required>Nome</FormLabel>
          <input
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.nome ? "border-red-500 focus-visible:outline-red-500" : ""
            }`}
            value={form.nome}
            onChange={(event) => updateField("nome", event.target.value)}
          />
          <FormFieldError message={errors.nome} />
        </div>
        <div className="flex flex-col gap-2">
          <FormLabel required>Cognome</FormLabel>
          <input
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.cognome ? "border-red-500 focus-visible:outline-red-500" : ""
            }`}
            value={form.cognome}
            onChange={(event) => updateField("cognome", event.target.value)}
          />
          <FormFieldError message={errors.cognome} />
        </div>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <FormLabel required>Codice Fiscale</FormLabel>
        <input
          className={`rounded-md border px-3 py-2 ${
            errors.codiceFiscale ? "border-red-500 focus-visible:outline-red-500" : ""
          } bg-background`}
          value={form.codiceFiscale}
          onChange={(event) =>
            updateField(
              "codiceFiscale",
              event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16)
            )
          }
          maxLength={16}
        />
        <FormFieldError message={errors.codiceFiscale} />
        <p className="text-xs text-muted-foreground">{cfLength}/16 caratteri</p>
        {cfValidation.loading ? (
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verifica codice fiscale...
          </p>
        ) : null}
        {hasChangedCF && cfLength === 16 && cfValidation.valid === true ? (
          <p className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Codice fiscale valido
          </p>
        ) : null}
        {hasChangedCF && cfLength === 16 && cfValidation.valid === false ? (
          <p className="inline-flex items-center gap-1 text-xs text-red-600">
            <XCircle className="h-3.5 w-3.5" />
            Formato codice fiscale non valido
          </p>
        ) : null}
        {hasChangedCF && cfLength === 16
          ? cfValidation.mismatches.map((message) => (
              <p key={message} className="inline-flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {message}
              </p>
            ))
          : null}
        {hasChangedCF && cfLength === 16 && cfValidation.duplicate ? (
          <p className="inline-flex items-center gap-1 text-xs text-red-600">
            <XCircle className="h-3.5 w-3.5" />
            Codice fiscale già presente per il dipendente{" "}
            {cfValidation.duplicateEmployee?.fullName ?? "esistente"}
          </p>
        ) : null}
        {hasChangedCF && cfLength === 16
          ? cfValidation.warnings.map((message) => (
              <p key={message} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                {message}
              </p>
            ))
          : null}
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <FormLabel required>Sesso</FormLabel>
          <div
            className={`flex items-center gap-4 rounded-md border bg-background px-3 py-2 ${
              errors.sesso ? "border-red-500" : ""
            }`}
          >
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="employee-sesso"
                value="M"
                checked={form.sesso === "M"}
                onChange={(event) => updateField("sesso", event.target.value)}
              />
              M
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="employee-sesso"
                value="F"
                checked={form.sesso === "F"}
                onChange={(event) => updateField("sesso", event.target.value)}
              />
              F
            </label>
          </div>
          <FormFieldError message={errors.sesso} />
        </label>

        <ItalianDateInput
          label="Data di nascita"
          value={form.dataNascita}
          onChange={(value) => updateField("dataNascita", value)}
          required
          error={errors.dataNascita}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <FormLabel required>Comune nascita</FormLabel>
          <input
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.luogoNascita ? "border-red-500 focus-visible:outline-red-500" : ""
            }`}
            value={form.luogoNascita}
            onChange={(event) => updateField("luogoNascita", event.target.value)}
          />
          <FormFieldError message={errors.luogoNascita} />
        </label>
        <div className="flex flex-col gap-2">
          <FormLabel required>Email</FormLabel>
          <input
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.email ? "border-red-500 focus-visible:outline-red-500" : ""
            }`}
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
          <FormFieldError message={errors.email} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <label className="flex flex-col gap-2 text-sm">
          <FormLabel required>Comune residenza</FormLabel>
          <input
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.comuneResidenza ? "border-red-500 focus-visible:outline-red-500" : ""
            }`}
            value={form.comuneResidenza}
            onChange={(event) => updateField("comuneResidenza", event.target.value)}
          />
          <FormFieldError message={errors.comuneResidenza} />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <FormLabel required>CAP</FormLabel>
          <input
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.cap ? "border-red-500 focus-visible:outline-red-500" : ""
            }`}
            value={form.cap}
            onChange={(event) => updateField("cap", event.target.value)}
            maxLength={5}
          />
          <FormFieldError message={errors.cap} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <FormLabel>Provincia</FormLabel>
          <input
            list="employee-form-province-options"
            className="rounded-md border bg-background px-3 py-2"
            value={form.provincia}
            onChange={(event) => handleProvinciaChange(event.target.value)}
            placeholder="Es. Catania o CT"
          />
          <datalist id="employee-form-province-options">
            {provinciaSuggestions.map((item) => (
              <option
                key={`${item.sigla}-${item.nome}`}
                value={`${item.nome} (${item.sigla})`}
              />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <FormLabel>Regione</FormLabel>
          <input
            list="employee-form-region-options"
            className="rounded-md border bg-background px-3 py-2"
            value={form.regione}
            onChange={(event) => updateField("regione", event.target.value)}
            placeholder="Es. Sicilia"
          />
          <datalist id="employee-form-region-options">
            {regioneSuggestions.map((regione) => (
              <option key={regione} value={regione} />
            ))}
          </datalist>
        </label>
      </div>

      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <h3 className="text-sm font-semibold">Contatti</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <FormLabel>Telefono</FormLabel>
            <input
              className="rounded-md border bg-background px-3 py-2"
              value={form.telefono}
              onChange={(event) => updateField("telefono", event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <FormLabel>Cellulare</FormLabel>
            <input
              className="rounded-md border bg-background px-3 py-2"
              value={form.cellulare}
              onChange={(event) => updateField("cellulare", event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <FormLabel>Email Aziendale</FormLabel>
            <input
              type="email"
              className="rounded-md border bg-background px-3 py-2"
              value={form.emailAziendale}
              onChange={(event) =>
                updateField("emailAziendale", event.target.value)
              }
              placeholder="email.aziendale@azienda.it"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <FormLabel>PEC</FormLabel>
            <input
              type="email"
              className="rounded-md border bg-background px-3 py-2"
              value={form.pec}
              onChange={(event) => updateField("pec", event.target.value)}
              placeholder="nome@pec.it"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <h3 className="text-sm font-semibold">Residenza</h3>
        <label className="flex flex-col gap-2 text-sm">
          <FormLabel>Indirizzo</FormLabel>
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={form.indirizzo}
            onChange={(event) => updateField("indirizzo", event.target.value)}
          />
        </label>
      </div>

      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <h3 className="text-sm font-semibold">Dati fiscali</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <FormLabel>Partita IVA</FormLabel>
            <input
              className="rounded-md border bg-background px-3 py-2"
              value={form.partitaIva}
              onChange={(event) => updateField("partitaIva", event.target.value)}
              placeholder="01234567890"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <FormLabel>IBAN</FormLabel>
            <input
              className="rounded-md border bg-background px-3 py-2"
              value={form.iban}
              onChange={(event) => updateField("iban", event.target.value)}
              placeholder="IT60X0542811101000000123456"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <h3 className="text-sm font-semibold">Altro</h3>
        <label className="flex flex-col gap-2 text-sm">
          <FormLabel>Mansione</FormLabel>
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={form.mansione}
            onChange={(event) => updateField("mansione", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <FormLabel>Note</FormLabel>
          <textarea
            className="min-h-[100px] rounded-md border bg-background px-3 py-2"
            value={form.note}
            onChange={(event) => updateField("note", event.target.value)}
          />
        </label>
      </div>

      {submitBlockMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitBlockMessage}
        </div>
      ) : null}

      {useBranding ? (
        <BrandedButton type="submit" disabled={isLoading || hasClientBlockingIssues}>
          {isLoading ? "Salvataggio..." : "Salva modifiche"}
        </BrandedButton>
      ) : (
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          disabled={isLoading || hasClientBlockingIssues}
        >
          {isLoading ? "Salvataggio..." : "Salva modifiche"}
        </button>
      )}
    </form>
  );
}
