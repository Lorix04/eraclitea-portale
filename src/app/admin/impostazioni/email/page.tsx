"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ListChecks,
  Mail,
  Pencil,
  Search,
  Send,
  Settings,
  Star,
  Trash2,
} from "lucide-react";

type EmailAccount = {
  id: string;
  name: string;
  senderName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecure: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  hasPassword: boolean;
};

type EmailFormState = {
  name: string;
  senderName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: "true" | "false";
  isActive: boolean;
};

type FeedbackMessage = {
  type: "success" | "error";
  text: string;
};

type EmailPreference = {
  id: string;
  emailType: string;
  label: string;
  description: string;
  isEnabled: boolean;
  category: "CLIENT" | "ADMIN";
  updatedAt: string;
};

const emptyForm: EmailFormState = {
  name: "",
  senderName: "",
  senderEmail: "",
  smtpHost: "",
  smtpPort: "587",
  smtpUser: "",
  smtpPass: "",
  smtpSecure: "true",
  isActive: true,
};

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  return fallback;
}

export default function EmailSettingsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [preferences, setPreferences] = useState<EmailPreference[]>([]);
  const [form, setForm] = useState<EmailFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<FeedbackMessage | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [canImportEnv, setCanImportEnv] = useState(false);
  const [checkingImportEnv, setCheckingImportEnv] = useState(true);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/admin/email-accounts", { cache: "no-store" });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(extractErrorMessage(payload, "Errore caricamento account"));
    }

    const data = (await res.json()) as EmailAccount[];
    setAccounts(data);
  }, []);

  const fetchPreferences = useCallback(async () => {
    setPreferencesLoading(true);
    try {
      const res = await fetch("/api/admin/email-preferences", {
        cache: "no-store",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Errore caricamento preferenze email")
        );
      }

      const data = (await res.json()) as EmailPreference[];
      setPreferences(data);
    } finally {
      setPreferencesLoading(false);
    }
  }, []);

  const fetchImportAvailability = useCallback(async () => {
    setCheckingImportEnv(true);
    try {
      const res = await fetch("/api/admin/email-accounts/import-env", {
        cache: "no-store",
      });
      if (!res.ok) {
        setCanImportEnv(false);
        return;
      }
      const payload = (await res.json()) as { canImport?: boolean };
      setCanImportEnv(Boolean(payload.canImport));
    } finally {
      setCheckingImportEnv(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      await Promise.all([
        fetchAccounts(),
        fetchImportAvailability(),
        fetchPreferences(),
      ]);
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Errore nel caricamento degli account email";
      setMessage({ type: "error", text });
    }
  }, [fetchAccounts, fetchImportAvailability, fetchPreferences]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter((account) => {
      return (
        account.name.toLowerCase().includes(term) ||
        account.senderEmail.toLowerCase().includes(term) ||
        account.smtpHost.toLowerCase().includes(term) ||
        account.smtpUser.toLowerCase().includes(term)
      );
    });
  }, [accounts, search]);

  const clientPreferences = useMemo(
    () => preferences.filter((item) => item.category === "CLIENT"),
    [preferences]
  );
  const adminPreferences = useMemo(
    () => preferences.filter((item) => item.category === "ADMIN"),
    [preferences]
  );

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setEditingId(null);
  }, []);

  const validateForm = useCallback(() => {
    const requiredFields: Array<{ value: string; label: string }> = [
      { value: form.name, label: "Nome account" },
      { value: form.senderName, label: "Nome mittente" },
      { value: form.senderEmail, label: "Email mittente" },
      { value: form.smtpHost, label: "SMTP host" },
      { value: form.smtpPort, label: "Porta SMTP" },
      { value: form.smtpUser, label: "Utente SMTP" },
    ];

    if (!editingId) {
      requiredFields.push({ value: form.smtpPass, label: "Password SMTP" });
    }

    const missing = requiredFields.find((field) => field.value.trim() === "");
    if (missing) {
      setMessage({
        type: "error",
        text: `${missing.label} obbligatorio`,
      });
      return false;
    }

    if (Number.isNaN(Number(form.smtpPort)) || Number(form.smtpPort) <= 0) {
      setMessage({ type: "error", text: "Porta SMTP non valida" });
      return false;
    }

    return true;
  }, [editingId, form]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const endpoint = editingId
        ? `/api/admin/email-accounts/${editingId}`
        : "/api/admin/email-accounts";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({
          type: "error",
          text: extractErrorMessage(payload, "Errore durante il salvataggio"),
        });
        return;
      }

      setMessage({
        type: "success",
        text: editingId
          ? "Account aggiornato con successo"
          : "Account creato con successo",
      });
      resetForm();
      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Errore durante il salvataggio",
      });
    } finally {
      setLoading(false);
    }
  }, [editingId, form, loadData, resetForm, validateForm]);

  const handleEdit = useCallback((account: EmailAccount) => {
    setEditingId(account.id);
    setForm({
      name: account.name,
      senderName: account.senderName,
      senderEmail: account.senderEmail,
      smtpHost: account.smtpHost,
      smtpPort: String(account.smtpPort),
      smtpUser: account.smtpUser,
      smtpPass: "",
      smtpSecure: account.smtpSecure ? "true" : "false",
      isActive: account.isActive,
    });
    setMessage(null);
  }, []);

  const handleDelete = useCallback(
    async (id: string, isDefault: boolean) => {
      if (isDefault) {
        setMessage({
          type: "error",
          text: "Non puoi eliminare l'account predefinito",
        });
        return;
      }

      const confirmed = window.confirm(
        "Vuoi davvero eliminare questo account email?"
      );
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/admin/email-accounts/${id}`, {
          method: "DELETE",
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          setMessage({
            type: "error",
            text: extractErrorMessage(payload, "Errore eliminazione account"),
          });
          return;
        }

        if (editingId === id) {
          resetForm();
        }

        setMessage({
          type: "success",
          text: "Account eliminato con successo",
        });
        await loadData();
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Errore eliminazione account",
        });
      }
    },
    [editingId, loadData, resetForm]
  );

  const handleSetDefault = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/email-accounts/${id}/set-default`, {
        method: "POST",
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({
          type: "error",
          text: extractErrorMessage(payload, "Errore impostazione predefinito"),
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Account predefinito aggiornato",
      });
      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Errore impostazione predefinito",
      });
    }
  }, [loadData]);

  const handleImportEnv = useCallback(async () => {
    setImportLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/email-accounts/import-env", {
        method: "POST",
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({
          type: "error",
          text: extractErrorMessage(payload, "Errore importazione da .env"),
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Configurazione SMTP importata dal file .env",
      });
      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Errore importazione da .env",
      });
    } finally {
      setImportLoading(false);
    }
  }, [loadData]);

  const handleTest = useCallback(async () => {
    if (!testEmail.trim()) {
      setMessage({ type: "error", text: "Inserisci un destinatario per il test" });
      return;
    }

    if (!form.smtpHost.trim() || !form.smtpUser.trim()) {
      setMessage({
        type: "error",
        text: "Compila almeno host e utente SMTP prima del test",
      });
      return;
    }

    if (!form.smtpPass.trim()) {
      setMessage({
        type: "error",
        text:
          "Inserisci la password SMTP per il test. In modifica, se lasci vuoto la password non puo essere testata.",
      });
      return;
    }

    setTestLoading(true);
    try {
      const res = await fetch("/api/admin/email-accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost: form.smtpHost,
          smtpPort: form.smtpPort,
          smtpUser: form.smtpUser,
          smtpPass: form.smtpPass,
          smtpSecure: form.smtpSecure,
          senderName: form.senderName,
          senderEmail: form.senderEmail,
          testRecipient: testEmail,
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || payload?.success === false) {
        setMessage({
          type: "error",
          text: extractErrorMessage(payload, "Invio email di test fallito"),
        });
        return;
      }

      setMessage({
        type: "success",
        text: payload?.message || "Email di test inviata con successo",
      });
      setShowTestDialog(false);
      setTestEmail("");
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Invio email di test fallito",
      });
    } finally {
      setTestLoading(false);
    }
  }, [form, testEmail]);

  const handleTogglePreference = useCallback(
    async (emailType: string, isEnabled: boolean) => {
      const previous = preferences;
      setPreferences((prev) =>
        prev.map((item) =>
          item.emailType === emailType ? { ...item, isEnabled } : item
        )
      );

      try {
        const res = await fetch(`/api/admin/email-preferences/${emailType}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled }),
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          setPreferences(previous);
          setMessage({
            type: "error",
            text: extractErrorMessage(
              payload,
              "Errore aggiornamento preferenze email"
            ),
          });
          return;
        }
      } catch (error) {
        setPreferences(previous);
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Errore aggiornamento preferenze email",
        });
      }
    },
    [preferences]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {"<-"} Impostazioni
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border bg-card p-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Account Email</h1>
            <p className="text-sm text-muted-foreground">
              Configura gli account SMTP per l&apos;invio di email dal portale.
            </p>
            <Link
              href="/admin/impostazioni/email/log"
              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <ListChecks className="h-4 w-4" />
              Apri log email inviate
            </Link>
          </div>
        </div>
      </div>

      {canImportEnv && !checkingImportEnv && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium">
            Configurazione SMTP trovata nelle variabili d&apos;ambiente.
          </p>
          <p className="mt-1">
            Vuoi importarla come account email predefinito?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleImportEnv}
              disabled={importLoading}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {importLoading ? "Importazione..." : "Importa configurazione"}
            </button>
            <button
              type="button"
              onClick={() => setCanImportEnv(false)}
              className="rounded-md border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              Ignora
            </button>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-1 text-lg font-semibold">
          {editingId ? "Modifica account" : "Nuovo account"}
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Inserisci un account SMTP per inviare email di servizio.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Nome Account
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Es. Promo CAT"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Nome Mittente
            </label>
            <input
              type="text"
              value={form.senderName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, senderName: event.target.value }))
              }
              placeholder="Sapienta Formazione"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Email Mittente
            </label>
            <input
              type="email"
              value={form.senderEmail}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, senderEmail: event.target.value }))
              }
              placeholder="noreply@sapienta.it"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              SMTP Host
            </label>
            <input
              type="text"
              value={form.smtpHost}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, smtpHost: event.target.value }))
              }
              placeholder="smtp.gmail.com"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Porta SMTP
            </label>
            <input
              type="number"
              value={form.smtpPort}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, smtpPort: event.target.value }))
              }
              placeholder="587"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Utente SMTP
            </label>
            <input
              type="text"
              value={form.smtpUser}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, smtpUser: event.target.value }))
              }
              placeholder="user@gmail.com"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Password SMTP
            </label>
            <div className="relative">
              <input
                type={showSmtpPassword ? "text" : "password"}
                value={form.smtpPass}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, smtpPass: event.target.value }))
                }
                placeholder={editingId ? "Lascia vuoto per mantenere" : "********"}
                className="w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowSmtpPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-700"
                aria-label={
                  showSmtpPassword
                    ? "Nascondi password SMTP"
                    : "Mostra password SMTP"
                }
              >
                {showSmtpPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              SSL/TLS
            </label>
            <select
              value={form.smtpSecure}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  smtpSecure: event.target.value as "true" | "false",
                }))
              }
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="true">Si (SSL - porta 465)</option>
              <option value="false">No (STARTTLS - porta 587)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Stato
            </label>
            <select
              value={form.isActive ? "true" : "false"}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  isActive: event.target.value === "true",
                }))
              }
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="true">Attivo</option>
              <option value="false">Disattivo</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Salvataggio..."
              : editingId
                ? "Aggiorna account"
                : "Salva account"}
          </button>

          <button
            type="button"
            onClick={() => setShowTestDialog(true)}
            disabled={testLoading || !form.smtpHost || !form.smtpUser}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {testLoading ? "Invio..." : "Invia email di test"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-gray-500 transition-colors hover:text-gray-700"
            >
              Annulla modifica
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-500">Apri un account per i dettagli.</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca account..."
              className="w-64 rounded-lg border px-3 py-1.5 pl-9 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Da
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    SMTP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Utente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Stato
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      Nessun account presente.
                    </td>
                  </tr>
                ) : (
                  filtered.map((account) => (
                    <tr
                      key={account.id}
                      className="border-b transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {account.isDefault && (
                            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          )}
                          <span className="font-medium">{account.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {account.senderName
                          ? `${account.senderName} <${account.senderEmail}>`
                          : account.senderEmail}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {account.smtpHost}:{account.smtpPort}
                        <span className="ml-2 text-xs text-gray-500">
                          {account.smtpSecure ? "(SSL)" : "(STARTTLS)"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{account.smtpUser}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            account.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {account.isActive ? "Attivo" : "Disattivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(account)}
                            className="rounded p-1.5 transition-colors hover:bg-gray-100"
                            title="Modifica"
                          >
                            <Pencil className="h-4 w-4 text-gray-500" />
                          </button>

                          {!account.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(account.id)}
                              className="rounded p-1.5 transition-colors hover:bg-gray-100"
                              title="Imposta come predefinito"
                            >
                              <Star className="h-4 w-4 text-gray-500" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(account.id, account.isDefault)}
                            disabled={account.isDefault}
                            className="rounded p-1.5 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                            title={
                              account.isDefault
                                ? "Non puoi eliminare l'account predefinito"
                                : "Elimina"
                            }
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">Notifiche Email Automatiche</h2>
        <p className="mt-1 text-sm text-gray-500">
          Attiva o disattiva le email automatiche per tipo.
        </p>

        {preferencesLoading ? (
          <p className="mt-4 text-sm text-gray-500">Caricamento preferenze...</p>
        ) : (
          <div className="mt-4 space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Email al Cliente
              </h3>
              <div className="overflow-hidden rounded-lg border">
                {clientPreferences.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 border-b p-4 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleTogglePreference(item.emailType, !item.isEnabled)
                      }
                      className={`inline-flex min-w-[62px] justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                        item.isEnabled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.isEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Email all&apos;Admin
              </h3>
              <div className="overflow-hidden rounded-lg border">
                {adminPreferences.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 border-b p-4 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleTogglePreference(item.emailType, !item.isEnabled)
                      }
                      className={`inline-flex min-w-[62px] justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                        item.isEnabled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.isEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showTestDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-2 flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Invia email di test</h3>
            </div>
            <p className="mb-4 text-sm text-gray-500">
              Inserisci l&apos;indirizzo email dove vuoi ricevere il test.
            </p>
            <input
              type="email"
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
              placeholder="tuaemail@esempio.it"
              className="mb-4 w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTestDialog(false);
                  setTestEmail("");
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={testLoading || !testEmail.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {testLoading ? "Invio..." : "Invia test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
