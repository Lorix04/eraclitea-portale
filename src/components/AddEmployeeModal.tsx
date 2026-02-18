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

type ClientOption = { id: string; ragioneSociale: string };

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: codiciCatastali } = useCodiciCatastali();
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
    lastDecodedCfRef.current = "";
  }, [open, clientId]);

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
        const items = (json.data ?? []) as Array<{
          id: string;
          ragioneSociale: string;
        }>;
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

  const validate = useMemo(() => {
    return () => {
      const nextErrors: Record<string, string> = {};

      if (!hasFixedClientId && !form.clientId) {
        nextErrors.clientId = "Questo campo è obbligatorio";
      }
      if (!form.nome.trim()) nextErrors.nome = "Questo campo è obbligatorio";
      if (!form.cognome.trim()) nextErrors.cognome = "Questo campo è obbligatorio";

      if (!form.codiceFiscale.trim()) {
        nextErrors.codiceFiscale = "Questo campo è obbligatorio";
      } else if (!isValidCodiceFiscale(form.codiceFiscale.trim())) {
        nextErrors.codiceFiscale = "Codice fiscale non valido";
      }

      if (!form.sesso) nextErrors.sesso = "Questo campo è obbligatorio";
      if (!form.dataNascita.trim()) nextErrors.dataNascita = "Questo campo è obbligatorio";
      if (!form.luogoNascita.trim()) nextErrors.luogoNascita = "Questo campo è obbligatorio";

      if (!form.email.trim()) {
        nextErrors.email = "Questo campo è obbligatorio";
      } else if (!isValidEmail(form.email.trim())) {
        nextErrors.email = "Email non valida";
      }
      if (!form.comuneResidenza.trim()) {
        nextErrors.comuneResidenza = "Questo campo è obbligatorio";
      }
      if (!form.cap.trim()) {
        nextErrors.cap = "Questo campo è obbligatorio";
      }

      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    };
  }, [form, hasFixedClientId]);

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

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/dipendenti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId || clientId,
          nome: form.nome.trim(),
          cognome: form.cognome.trim(),
          codiceFiscale: form.codiceFiscale.trim().toUpperCase(),
          sesso: form.sesso || null,
          dataNascita: form.dataNascita || null,
          luogoNascita: form.luogoNascita.trim(),
          email: form.email.trim(),
          telefono: form.telefono || null,
          cellulare: form.cellulare || null,
          indirizzo: form.indirizzo || null,
          comuneResidenza: form.comuneResidenza.trim(),
          cap: form.cap.trim(),
          mansione: form.mansione || null,
          note: form.note || null,
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
      <div className="fixed inset-0 z-50 p-2 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="flex h-[92vh] w-full flex-col rounded-lg bg-card shadow-lg sm:h-auto sm:max-h-[92vh] sm:max-w-3xl"
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

          <div className="flex-1 overflow-y-auto px-4 py-4">
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
                  <FormLabel required>Sesso</FormLabel>
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
                  required
                  value={form.dataNascita}
                  onChange={(value) => updateField("dataNascita", value)}
                  error={errors.dataNascita}
                  disabled={saving}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FormLabel required>Comune Nascita</FormLabel>
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
                  <FormLabel required>Email</FormLabel>
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
                  <FormLabel required>Comune Residenza</FormLabel>
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
                  <FormLabel required>CAP</FormLabel>
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
                      className="md:col-span-2 rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Indirizzo"
                      value={form.indirizzo}
                      onChange={(event) => updateField("indirizzo", event.target.value)}
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
