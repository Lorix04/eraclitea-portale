"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronUp, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { BrandedButton } from "@/components/BrandedButton";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";
import { ItalianDateInput } from "@/components/ui/italian-date-input";
import { decodeCF } from "@/lib/codice-fiscale-decoder";
import { isValidCodiceFiscale } from "@/lib/validators";
import { useCodiciCatastali } from "@/hooks/useCodiciCatastali";
import { useProvinceRegioni } from "@/hooks/useProvinceRegioni";
import { getArrayData } from "@/lib/api-response";

type ClientOption = { id: string; ragioneSociale: string };

type ResolvedCustomField = {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string | null;
  options: string | null;
  standardField: string | null;
};

type FieldMode = "default" | "custom";

type AddEmployeeModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  clientId?: string;
  branded?: boolean;
};

type FormState = {
  clientId: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  sesso: string;
  dataNascita: string;
  luogoNascita: string;
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
  note: string;
};

const initialForm: FormState = {
  clientId: "",
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
  provincia: "",
  regione: "",
  emailAziendale: "",
  pec: "",
  partitaIva: "",
  iban: "",
  mansione: "",
  note: "",
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function AddEmployeeModal({
  open,
  onClose,
  onCreated,
  clientId,
  branded = false,
}: AddEmployeeModalProps) {
  const hasFixedClientId = Boolean(clientId);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [form, setForm] = useState<FormState>({
    ...initialForm,
    clientId: clientId ?? "",
  });
  const [customFields, setCustomFields] = useState<ResolvedCustomField[]>([]);
  const [customFieldsEnabled, setCustomFieldsEnabled] = useState(false);
  const [loadingCustomFields, setLoadingCustomFields] = useState(false);
  const [mode, setMode] = useState<FieldMode>("default");
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: codiciCatastali } = useCodiciCatastali();
  const { province, filterProvince, filterRegioni, getRegioneByProvincia } =
    useProvinceRegioni();
  const lastDecodedCfRef = useRef("");
  const clientComboboxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setShowDetails(false);
    setClientComboboxOpen(false);
    setClientSearch("");
    setForm({
      ...initialForm,
      clientId: clientId ?? "",
    });
    setCustomFields([]);
    setCustomFieldsEnabled(false);
    setMode("default");
    setCustomData({});
    lastDecodedCfRef.current = "";
  }, [open, clientId]);

  // Load the client's custom field template when a client is selected
  useEffect(() => {
    if (!open) return;
    const activeClientId = form.clientId || clientId || "";
    if (!activeClientId) {
      setCustomFields([]);
      setCustomFieldsEnabled(false);
      setMode("default");
      return;
    }

    let cancelled = false;
    const loadCustomFields = async () => {
      setLoadingCustomFields(true);
      try {
        const res = await fetch(`/api/custom-fields?clientId=${activeClientId}`);
        if (!res.ok) {
          if (!cancelled) {
            setCustomFields([]);
            setCustomFieldsEnabled(false);
            setMode("default");
          }
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const enabled = Boolean(json?.enabled) && Array.isArray(json?.fields) && json.fields.length > 0;
        setCustomFields(enabled ? json.fields : []);
        setCustomFieldsEnabled(enabled);
        // Default to the configured template when available; the user can switch
        setMode(enabled ? "custom" : "default");
        setCustomData({});
      } catch {
        if (!cancelled) {
          setCustomFields([]);
          setCustomFieldsEnabled(false);
          setMode("default");
        }
      } finally {
        if (!cancelled) setLoadingCustomFields(false);
      }
    };

    loadCustomFields();
    return () => {
      cancelled = true;
    };
  }, [open, form.clientId, clientId]);

  useEffect(() => {
    if (!open) return;
    if (hasFixedClientId) return;
    if (clients.length > 0) return;

    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const res = await fetch("/api/admin/clienti");
        if (!res.ok) {
          toast.error("Errore nel caricamento clienti");
          return;
        }
        const json = await res.json().catch(() => ({}));
        const items = getArrayData<{
          id: string;
          ragioneSociale: string;
        }>(json);
        setClients(
          items.map((client) => ({
            id: client.id,
            ragioneSociale: client.ragioneSociale,
          }))
        );
      } catch {
        toast.error("Errore nel caricamento clienti");
      } finally {
        setLoadingClients(false);
      }
    };

    loadClients();
  }, [open, clients.length, hasFixedClientId]);

  useEffect(() => {
    if (!clientComboboxOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!clientComboboxRef.current) return;
      if (!clientComboboxRef.current.contains(event.target as Node)) {
        setClientComboboxOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [clientComboboxOpen]);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }

    if (key === "codiceFiscale") {
      lastDecodedCfRef.current = "";
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

  const decodeFromCF = (value: string) => {
    const normalized = value.trim().toUpperCase();
    if (normalized.length !== 16) return;
    if (lastDecodedCfRef.current === normalized) return;
    lastDecodedCfRef.current = normalized;

    const decoded = decodeCF(normalized);
    if (!decoded) return;

    setForm((prev) => {
      const next = { ...prev };
      if (!next.dataNascita) next.dataNascita = decoded.dataNascita;
      if (!next.sesso) next.sesso = decoded.sesso;
      if (!next.luogoNascita && codiciCatastali) {
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

  const getCustomFieldValue = (cf: ResolvedCustomField): string => {
    if (cf.standardField) {
      return form[cf.standardField as keyof FormState] ?? "";
    }
    return customData[cf.name] ?? "";
  };

  const customFieldErrorKey = (cf: ResolvedCustomField) =>
    cf.standardField ?? `custom_${cf.name}`;

  const setCustomFieldValue = (cf: ResolvedCustomField, value: string) => {
    const errorKey = customFieldErrorKey(cf);
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: "" }));
    }
    if (cf.standardField) {
      updateField(cf.standardField as keyof FormState, value);
      if (cf.standardField === "codiceFiscale" && value.trim().length === 16) {
        decodeFromCF(value);
      }
    } else {
      setCustomData((prev) => ({ ...prev, [cf.name]: value }));
    }
  };

  const validate = useMemo(() => {
    return () => {
      const nextErrors: Record<string, string> = {};

      if (!hasFixedClientId && !form.clientId) {
        nextErrors.clientId = "Questo campo è obbligatorio";
      }

      if (mode === "custom" && customFieldsEnabled) {
        // Custom (template) mode: enforce the template's required fields only
        for (const cf of customFields) {
          const value = getCustomFieldValue(cf).trim();
          const errorKey = customFieldErrorKey(cf);
          if (cf.required && !value) {
            nextErrors[errorKey] = "Questo campo è obbligatorio";
            continue;
          }
          if (value && cf.standardField === "codiceFiscale" && !isValidCodiceFiscale(value)) {
            nextErrors[errorKey] = "Codice fiscale non valido";
          } else if (value && cf.type === "email" && !isValidEmail(value)) {
            nextErrors[errorKey] = "Email non valida";
          }
        }
      } else {
        // Default mode: only Nome, Cognome, Codice Fiscale required
        if (!form.nome.trim()) nextErrors.nome = "Questo campo è obbligatorio";
        if (!form.cognome.trim()) nextErrors.cognome = "Questo campo è obbligatorio";

        if (!form.codiceFiscale.trim()) {
          nextErrors.codiceFiscale = "Questo campo è obbligatorio";
        } else if (!isValidCodiceFiscale(form.codiceFiscale.trim())) {
          nextErrors.codiceFiscale = "Codice fiscale non valido";
        }

        // Format checks only when the optional field is filled
        if (form.email.trim() && !isValidEmail(form.email.trim())) {
          nextErrors.email = "Email non valida";
        }
      }

      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, hasFixedClientId, mode, customFieldsEnabled, customFields, customData]);

  const selectedClient = useMemo(
    () => clients.find((item) => item.id === form.clientId),
    [clients, form.clientId]
  );

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((item) =>
      item.ragioneSociale.toLowerCase().includes(query)
    );
  }, [clients, clientSearch]);

  const provinciaSuggestions = useMemo(
    () => filterProvince(form.provincia || "").slice(0, 30),
    [filterProvince, form.provincia]
  );

  const regioneSuggestions = useMemo(
    () => filterRegioni(form.regione || "").slice(0, 30),
    [filterRegioni, form.regione]
  );

  const handleSubmit = async () => {
    if (!validate()) return;

    // In custom mode, collect non-standard template field values into customData
    let customDataPayload: Record<string, string> | undefined;
    if (mode === "custom" && customFieldsEnabled) {
      const collected: Record<string, string> = {};
      for (const cf of customFields) {
        if (!cf.standardField) {
          const value = (customData[cf.name] ?? "").trim();
          if (value) collected[cf.name] = value;
        }
      }
      if (Object.keys(collected).length > 0) customDataPayload = collected;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/dipendenti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId || clientId,
          nome: form.nome.trim() || null,
          cognome: form.cognome.trim() || null,
          codiceFiscale: form.codiceFiscale.trim().toUpperCase() || null,
          sesso: form.sesso || null,
          dataNascita: form.dataNascita || null,
          luogoNascita: form.luogoNascita.trim() || null,
          email: form.email.trim() || null,
          telefono: form.telefono || null,
          cellulare: form.cellulare || null,
          indirizzo: form.indirizzo || null,
          comuneResidenza: form.comuneResidenza.trim() || null,
          cap: form.cap.trim() || null,
          provincia: form.provincia.trim() || null,
          regione: form.regione.trim() || null,
          emailAziendale: form.emailAziendale.trim() || null,
          pec: form.pec.trim() || null,
          partitaIva: form.partitaIva.trim() || null,
          iban: form.iban.trim() || null,
          mansione: form.mansione || null,
          note: form.note || null,
          customData: customDataPayload,
        }),
      });

      if (res.status === 409) {
        setErrors((prev) => ({
          ...prev,
          codiceFiscale:
            "Dipendente con questo CF già presente per questo cliente",
        }));
        toast.error("Dipendente con questo CF già presente per questo cliente");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Errore durante la creazione del dipendente");
        return;
      }

      toast.success("Dipendente creato");
      onCreated();
      onClose();
    } catch {
      toast.error("Errore durante la creazione del dipendente");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="modal-panel bg-card shadow-lg sm:max-w-3xl"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-base font-semibold">Aggiungi dipendente</h2>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              onClick={onClose}
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="modal-body modal-scroll">
            <FormRequiredLegend />

            <div className="space-y-4">
              {!hasFixedClientId ? (
                <div className="space-y-2">
                  <FormLabel required>Cliente</FormLabel>
                  <div className="relative" ref={clientComboboxRef}>
                    <button
                      type="button"
                      className={`flex min-h-[44px] w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm ${
                        errors.clientId
                          ? "border-red-500 focus-visible:outline-red-500"
                          : ""
                      }`}
                      onClick={() => {
                        if (saving || loadingClients) return;
                        setClientComboboxOpen((prev) => !prev);
                      }}
                      disabled={saving || loadingClients}
                    >
                      <span
                        className={`truncate ${
                          selectedClient ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {selectedClient
                          ? selectedClient.ragioneSociale
                          : loadingClients
                            ? "Caricamento clienti..."
                            : "Seleziona cliente"}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          clientComboboxOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {selectedClient ? (
                      <button
                        type="button"
                        onClick={() => {
                          updateField("clientId", "");
                          setClientSearch("");
                        }}
                        className="absolute right-8 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Deseleziona cliente"
                        disabled={saving}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}

                    {clientComboboxOpen ? (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-card shadow-md">
                        <div className="border-b p-2">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              value={clientSearch}
                              onChange={(event) => setClientSearch(event.target.value)}
                              placeholder="Cerca cliente..."
                              className="w-full rounded-md border bg-background py-2 pl-8 pr-3 text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto py-1">
                          {loadingClients ? (
                            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Caricamento clienti...
                            </div>
                          ) : filteredClients.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                              Nessun cliente trovato
                            </p>
                          ) : (
                            filteredClients.map((client) => (
                              <button
                                key={client.id}
                                type="button"
                                onClick={() => {
                                  updateField(
                                    "clientId",
                                    form.clientId === client.id ? "" : client.id
                                  );
                                  setClientComboboxOpen(false);
                                  setClientSearch("");
                                }}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                              >
                                <span className="truncate">{client.ragioneSociale}</span>
                                {form.clientId === client.id ? (
                                  <Check className="ml-2 h-4 w-4 text-primary" />
                                ) : null}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <FormFieldError message={errors.clientId} />
                </div>
              ) : null}

              {customFieldsEnabled ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMode("default")}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      mode === "default"
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/20 hover:border-muted-foreground/40"
                    }`}
                    disabled={saving}
                  >
                    <span className="font-medium">Campi Default</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Campi standard del sistema
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("custom")}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      mode === "custom"
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/20 hover:border-muted-foreground/40"
                    }`}
                    disabled={saving}
                  >
                    <span className="font-medium">Campi Personalizzati</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {customFields.length} campi dal template
                    </span>
                  </button>
                </div>
              ) : null}

              {loadingCustomFields ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Caricamento configurazione campi...
                </div>
              ) : null}

              {mode === "custom" && customFieldsEnabled ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {customFields.map((cf) => {
                    const value = getCustomFieldValue(cf);
                    const errorKey = customFieldErrorKey(cf);
                    const errorMsg = errors[errorKey];
                    const errorClass = errorMsg
                      ? "border-red-500 focus-visible:outline-red-500"
                      : "";
                    const isDate = cf.type === "date" || cf.standardField === "dataNascita";
                    const isSelect = cf.type === "select";
                    const isSesso = cf.standardField === "sesso";
                    const fullWidth = cf.type === "textarea";

                    if (isDate) {
                      return (
                        <ItalianDateInput
                          key={cf.id}
                          label={cf.label}
                          required={cf.required}
                          value={value}
                          onChange={(v) => setCustomFieldValue(cf, v)}
                          error={errorMsg}
                          disabled={saving}
                        />
                      );
                    }

                    return (
                      <div
                        key={cf.id}
                        className={`space-y-2 ${fullWidth ? "md:col-span-2" : ""}`}
                      >
                        <FormLabel required={cf.required}>{cf.label}</FormLabel>
                        {isSesso ? (
                          <select
                            className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${errorClass}`}
                            value={value}
                            onChange={(e) => setCustomFieldValue(cf, e.target.value)}
                            disabled={saving}
                          >
                            <option value="">Seleziona</option>
                            <option value="M">M</option>
                            <option value="F">F</option>
                          </select>
                        ) : isSelect ? (
                          <select
                            className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${errorClass}`}
                            value={value}
                            onChange={(e) => setCustomFieldValue(cf, e.target.value)}
                            disabled={saving}
                          >
                            <option value="">Seleziona</option>
                            {(cf.options ?? "")
                              .split("|")
                              .map((o) => o.trim())
                              .filter(Boolean)
                              .map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <input
                            type={cf.type === "number" ? "number" : cf.type === "email" ? "email" : "text"}
                            className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${errorClass}`}
                            value={value}
                            placeholder={cf.placeholder ?? ""}
                            maxLength={cf.standardField === "codiceFiscale" ? 16 : undefined}
                            onChange={(e) =>
                              setCustomFieldValue(
                                cf,
                                cf.standardField === "codiceFiscale"
                                  ? e.target.value.toUpperCase()
                                  : e.target.value
                              )
                            }
                            disabled={saving}
                          />
                        )}
                        <FormFieldError message={errorMsg} />
                      </div>
                    );
                  })}
                </div>
              ) : (
              <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FormLabel required>Nome</FormLabel>
                  <input
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      errors.nome ? "border-red-500 focus-visible:outline-red-500" : ""
                    }`}
                    value={form.nome}
                    onChange={(event) => updateField("nome", event.target.value)}
                    disabled={saving}
                  />
                  <FormFieldError message={errors.nome} />
                </div>

                <div className="space-y-2">
                  <FormLabel required>Cognome</FormLabel>
                  <input
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      errors.cognome ? "border-red-500 focus-visible:outline-red-500" : ""
                    }`}
                    value={form.cognome}
                    onChange={(event) => updateField("cognome", event.target.value)}
                    disabled={saving}
                  />
                  <FormFieldError message={errors.cognome} />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel required>Codice Fiscale</FormLabel>
                <input
                  className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                    errors.codiceFiscale
                      ? "border-red-500 focus-visible:outline-red-500"
                      : ""
                  }`}
                  value={form.codiceFiscale}
                  onChange={(event) => {
                    const nextValue = event.target.value.toUpperCase();
                    updateField("codiceFiscale", nextValue);
                    if (nextValue.trim().length === 16) {
                      decodeFromCF(nextValue);
                    }
                  }}
                  onBlur={() => decodeFromCF(form.codiceFiscale)}
                  maxLength={16}
                  disabled={saving}
                />
                <FormFieldError message={errors.codiceFiscale} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FormLabel>Sesso</FormLabel>
                  <select
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      errors.sesso ? "border-red-500 focus-visible:outline-red-500" : ""
                    }`}
                    value={form.sesso}
                    onChange={(event) => updateField("sesso", event.target.value)}
                    disabled={saving}
                  >
                    <option value="">Seleziona</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                  <FormFieldError message={errors.sesso} />
                </div>

                <ItalianDateInput
                  label="Data Nascita"
                  value={form.dataNascita}
                  onChange={(value) => updateField("dataNascita", value)}
                  error={errors.dataNascita}
                  disabled={saving}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FormLabel>Comune Nascita</FormLabel>
                  <input
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      errors.luogoNascita
                        ? "border-red-500 focus-visible:outline-red-500"
                        : ""
                    }`}
                    value={form.luogoNascita}
                    onChange={(event) => updateField("luogoNascita", event.target.value)}
                    disabled={saving}
                  />
                  <FormFieldError message={errors.luogoNascita} />
                </div>
                <div className="space-y-2">
                  <FormLabel>Email</FormLabel>
                  <input
                    type="email"
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      errors.email ? "border-red-500 focus-visible:outline-red-500" : ""
                    }`}
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    disabled={saving}
                  />
                  <FormFieldError message={errors.email} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                <div className="space-y-2">
                  <FormLabel>Comune Residenza</FormLabel>
                  <input
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      errors.comuneResidenza
                        ? "border-red-500 focus-visible:outline-red-500"
                        : ""
                    }`}
                    value={form.comuneResidenza}
                    onChange={(event) =>
                      updateField("comuneResidenza", event.target.value)
                    }
                    disabled={saving}
                  />
                  <FormFieldError message={errors.comuneResidenza} />
                </div>
                <div className="space-y-2">
                  <FormLabel>CAP</FormLabel>
                  <input
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      errors.cap ? "border-red-500 focus-visible:outline-red-500" : ""
                    }`}
                    value={form.cap}
                    onChange={(event) => updateField("cap", event.target.value)}
                    maxLength={5}
                    disabled={saving}
                  />
                  <FormFieldError message={errors.cap} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FormLabel>Provincia</FormLabel>
                  <input
                    list="add-employee-province-options"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={form.provincia}
                    onChange={(event) => handleProvinciaChange(event.target.value)}
                    placeholder="Es. Catania o CT"
                    disabled={saving}
                  />
                  <datalist id="add-employee-province-options">
                    {provinciaSuggestions.map((item) => (
                      <option
                        key={`${item.sigla}-${item.nome}`}
                        value={`${item.nome} (${item.sigla})`}
                      />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <FormLabel>Regione</FormLabel>
                  <input
                    list="add-employee-region-options"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={form.regione}
                    onChange={(event) => updateField("regione", event.target.value)}
                    placeholder="Es. Sicilia"
                    disabled={saving}
                  />
                  <datalist id="add-employee-region-options">
                    {regioneSuggestions.map((regione) => (
                      <option key={regione} value={regione} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="rounded-md border bg-muted/20 p-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm font-medium"
                  onClick={() => setShowDetails((prev) => !prev)}
                >
                  {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Dettagli
                </button>

                {showDetails ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Telefono"
                      value={form.telefono}
                      onChange={(event) => updateField("telefono", event.target.value)}
                      disabled={saving}
                    />
                    <input
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Cellulare"
                      value={form.cellulare}
                      onChange={(event) => updateField("cellulare", event.target.value)}
                      disabled={saving}
                    />
                    <input
                      type="email"
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Email Aziendale (email.aziendale@azienda.it)"
                      value={form.emailAziendale}
                      onChange={(event) =>
                        updateField("emailAziendale", event.target.value)
                      }
                      disabled={saving}
                    />
                    <input
                      type="email"
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="PEC (nome@pec.it)"
                      value={form.pec}
                      onChange={(event) => updateField("pec", event.target.value)}
                      disabled={saving}
                    />
                    <input
                      className="md:col-span-2 rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Indirizzo"
                      value={form.indirizzo}
                      onChange={(event) => updateField("indirizzo", event.target.value)}
                      disabled={saving}
                    />
                    <input
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Partita IVA"
                      value={form.partitaIva}
                      onChange={(event) => updateField("partitaIva", event.target.value)}
                      disabled={saving}
                    />
                    <input
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="IBAN"
                      value={form.iban}
                      onChange={(event) => updateField("iban", event.target.value)}
                      disabled={saving}
                    />
                    <input
                      className="md:col-span-2 rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Mansione"
                      value={form.mansione}
                      onChange={(event) => updateField("mansione", event.target.value)}
                      disabled={saving}
                    />
                    <textarea
                      className="md:col-span-2 min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Note"
                      value={form.note}
                      onChange={(event) => updateField("note", event.target.value)}
                      disabled={saving}
                    />
                  </div>
                ) : null}
              </div>
              </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm"
              onClick={onClose}
              disabled={saving}
            >
              Annulla
            </button>
            {branded ? (
              <BrandedButton type="button" onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creazione...
                  </>
                ) : (
                  "Crea dipendente"
                )}
              </BrandedButton>
            ) : (
              <button
                type="button"
                className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creazione...
                  </>
                ) : (
                  "Crea dipendente"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
