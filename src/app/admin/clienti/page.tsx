"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Eye, KeyRound, LogIn, Pencil, Search, Trash2, UserCheck, UserX } from "lucide-react";
import ActionMenu from "@/components/ui/ActionMenu";
import { useDebounce } from "@/hooks/useDebounce";
import { getArrayData } from "@/lib/api-response";
import ResponsiveTable, { type Column } from "@/components/ui/ResponsiveTable";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import ErrorMessage from "@/components/ui/ErrorMessage";
import MobileFilterPanel from "@/components/ui/MobileFilterPanel";

type ClientRow = {
  id: string;
  ragioneSociale: string;
  piva: string;
  referenteNome: string;
  referenteEmail: string;
  telefono?: string | null;
  editionsCount?: number;
  isActive: boolean;
  categories?: { id: string; name: string; color?: string | null }[];
  user?: { id: string; email: string; isActive: boolean } | null;
};

type ResetPasswordResult = {
  clientName: string;
  email: string;
  newPassword: string;
};

export default function AdminClientiPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("all");
  const [sortBy, setSortBy] = useState("ragioneSociale");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmResetClient, setConfirmResetClient] = useState<ClientRow | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<ResetPasswordResult | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [impersonatingClientId, setImpersonatingClientId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (isActive !== "all") params.set("isActive", isActive);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    return params.toString();
  }, [debouncedSearch, isActive, sortBy, sortOrder, categoryFilter]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(`/api/admin/clienti?${queryString}`);
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        setClients([]);
        setError("Si e verificato un errore nel caricamento dei clienti.");
        return;
      }
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      setClients(getArrayData<ClientRow>(json));
    } catch {
      setClients([]);
      setError("Si e verificato un errore nel caricamento dei clienti.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetchWithRetry("/api/admin/categorie");
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/login";
            return;
          }
          setCategories([]);
          return;
        }
        const text = await res.text();
        const json = text ? JSON.parse(text) : {};
        const data = getArrayData<{ id: string; name: string }>(json);
        setCategories(
          data.map((category: { id: string; name: string }) => ({
            id: category.id,
            name: category.name,
          }))
        );
      } catch {
        setCategories([]);
      }
    };
    void loadCategories();
  }, []);

  const handleToggleStatus = async (id: string) => {
    await fetch(`/api/admin/clienti/${id}/toggle-status`, { method: "POST" });
    loadClients();
  };

  const handleResetPassword = async () => {
    if (!confirmResetClient) return;

    setIsResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/clienti/${confirmResetClient.id}/reset-password`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Errore durante il reset password");
      }

      if (!json?.newPassword) {
        throw new Error("Nuova password non disponibile nella risposta");
      }

      setConfirmResetClient(null);
      setCopySuccess(false);
      setResetPasswordResult({
        clientName: json.clientName || confirmResetClient.ragioneSociale,
        email:
          json.email ||
          confirmResetClient.user?.email ||
          confirmResetClient.referenteEmail,
        newPassword: json.newPassword,
      });
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Errore durante il reset password"
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!resetPasswordResult?.newPassword) return;
    try {
      await navigator.clipboard.writeText(resetPasswordResult.newPassword);
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 1500);
    } catch {
      window.alert("Impossibile copiare la password");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/clienti/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || "Errore durante l'eliminazione del cliente");
    }
    await loadClients();
  };

  const handleImpersonate = async (client: ClientRow) => {
    if (!client.user?.id) {
      window.alert("Utente cliente non disponibile per l'impersonazione.");
      return;
    }

    try {
      setImpersonatingClientId(client.id);
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientUserId: client.user.id }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(payload?.error ?? "Errore durante l'impersonazione");
        return;
      }

      window.location.href = payload?.redirectTo || "/dashboard";
    } finally {
      setImpersonatingClientId(null);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setIsActive("all");
    setSortBy("ragioneSociale");
    setSortOrder("asc");
    setCategoryFilter("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Clienti</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci aziende clienti e utenti associati.
          </p>
        </div>
        <Link
          href="/admin/clienti/nuovo"
          className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Nuovo cliente
        </Link>
      </div>

      <MobileFilterPanel
        searchBar={
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border bg-background px-3 py-2 pl-9 text-sm"
              placeholder="Cerca per nome, P.IVA o email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Cerca per nome, P.IVA o email"
            />
          </div>
        }
        activeFiltersCount={
          (isActive !== "all" ? 1 : 0) +
          (categoryFilter !== "" ? 1 : 0) +
          (sortBy !== "ragioneSociale" || sortOrder !== "asc" ? 1 : 0)
        }
        onReset={resetFilters}
        resultCount={`${clients.length} clienti`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-auto"
            value={isActive}
            onChange={(event) => setIsActive(event.target.value)}
            aria-label="Filtro stato clienti"
          >
            <option value="all">Tutti</option>
            <option value="true">Attivi</option>
            <option value="false">Disattivi</option>
          </select>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-auto"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filtro categoria clienti"
          >
            <option value="">Tutte le categorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-auto"
            value={`${sortBy}-${sortOrder}`}
            onChange={(event) => {
              const [field, order] = event.target.value.split("-");
              setSortBy(field);
              setSortOrder(order as "asc" | "desc");
            }}
            aria-label="Ordinamento clienti"
          >
            <option value="ragioneSociale-asc">Nome A-Z</option>
            <option value="ragioneSociale-desc">Nome Z-A</option>
            <option value="createdAt-desc">Piu recenti</option>
            <option value="createdAt-asc">Piu antichi</option>
            <option value="employeesCount-desc">Piu dipendenti</option>
            <option value="employeesCount-asc">Meno dipendenti</option>
          </select>
        </div>
      </MobileFilterPanel>

      {error ? <ErrorMessage message={error} onRetry={() => void loadClients()} /> : null}

      <ResponsiveTable<ClientRow>
        columns={[
          {
            key: "ragioneSociale",
            header: "Ragione Sociale",
            isPrimary: true,
            render: (c) => c.ragioneSociale,
          },
          {
            key: "piva",
            header: "P.IVA",
            hideOnCard: true,
            render: (c) => c.piva,
          },
          {
            key: "referente",
            header: "Referente",
            hideOnCard: true,
            render: (c) => c.referenteNome,
          },
          {
            key: "email",
            header: "Email",
            isSecondary: true,
            render: (c) => c.user?.email ?? c.referenteEmail,
          },
          {
            key: "telefono",
            header: "Telefono",
            render: (c) => c.telefono || "-",
          },
          {
            key: "edizioni",
            header: "Edizioni",
            render: (c) => c.editionsCount ?? 0,
          },
          {
            key: "categorie",
            header: "Categorie",
            isBadge: true,
            render: (c) =>
              c.categories && c.categories.length > 0 ? (
                <span className="inline-flex flex-wrap gap-1">
                  {c.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="rounded-full px-2 py-1 text-xs text-white"
                      style={{ backgroundColor: cat.color ?? "#6B7280" }}
                    >
                      {cat.name}
                    </span>
                  ))}
                </span>
              ) : (
                "-"
              ),
          },
          {
            key: "stato",
            header: "Stato",
            isBadge: true,
            render: (c) => (
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  c.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {c.isActive ? "Attivo" : "Disattivo"}
              </span>
            ),
          },
        ] satisfies Column<ClientRow>[]}
        data={clients}
        keyExtractor={(c) => c.id}
        loading={loading}
        skeletonCount={6}
        emptyMessage="Nessun cliente trovato."
        actions={(client) => (
          <ActionMenu
            primaryAction={{
              key: "view",
              label: "Visualizza",
              icon: Eye,
              variant: "info",
              href: `/admin/clienti/${client.id}`,
            }}
            secondaryActions={[
              {
                key: "impersonate",
                label: "Accedi come",
                icon: LogIn,
                variant: "info",
                onClick: () => handleImpersonate(client),
                disabled: !client.user?.id || impersonatingClientId === client.id,
              },
              {
                key: "edit",
                label: "Modifica",
                icon: Pencil,
                variant: "default",
                href: `/admin/clienti/${client.id}/edit`,
                shortcutKey: "e",
              },
              {
                key: "toggle",
                label: client.isActive ? "Disattiva" : "Attiva",
                icon: client.isActive ? UserX : UserCheck,
                variant: "warning",
                onClick: () => handleToggleStatus(client.id),
                shortcutKey: "a",
              },
              {
                key: "reset",
                label: "Reset password",
                icon: KeyRound,
                variant: "warning",
                onClick: () => setConfirmResetClient(client),
                shortcutKey: "r",
              },
              {
                key: "delete",
                label: "Elimina",
                icon: Trash2,
                variant: "danger",
                requireConfirm: true,
                confirmMessage: `Eliminare "${client.ragioneSociale}"? Azione irreversibile.`,
                onClick: () => handleDelete(client.id),
                shortcutKey: "Delete",
                shortcutLabel: "Del",
              },
            ]}
          />
        )}
      />

      {confirmResetClient && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 bg-black/40 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
              <div className="modal-panel bg-card shadow-lg sm:max-w-md">
                <div className="modal-header">
                  <h2 className="text-lg font-semibold">Reset Password</h2>
                </div>
                <div className="modal-body modal-scroll">
                  <p className="text-sm text-muted-foreground">
                    Sei sicuro di voler reimpostare la password di{" "}
                    <span className="font-medium text-foreground">
                      {confirmResetClient.ragioneSociale}
                    </span>
                    ? Verrà generata una nuova password e inviata via email a{" "}
                    <span className="font-medium text-foreground">
                      {confirmResetClient.user?.email || confirmResetClient.referenteEmail}
                    </span>
                    .
                  </p>
                </div>
                <div className="modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    className="rounded-md border px-4 py-2 text-sm"
                    onClick={() => setConfirmResetClient(null)}
                    disabled={isResettingPassword}
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
                    onClick={handleResetPassword}
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? "Reimpostazione..." : "Reimposta Password"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {resetPasswordResult && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 bg-black/40 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
              <div className="modal-panel bg-card shadow-lg sm:max-w-lg">
                <div className="modal-header">
                  <h2 className="text-lg font-semibold">Password Reimpostata</h2>
                </div>
                <div className="modal-body modal-scroll space-y-4">
                  <p className="text-sm text-muted-foreground">
                    La password di{" "}
                    <span className="font-medium text-foreground">
                      {resetPasswordResult.clientName}
                    </span>{" "}
                    è stata reimpostata con successo.
                  </p>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                      Nuova password
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="rounded bg-background px-2 py-1 font-mono text-sm">
                        {resetPasswordResult.newPassword}
                      </code>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                        onClick={handleCopyPassword}
                      >
                        {copySuccess ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Copiata
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copia
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Un&apos;email con le nuove credenziali è stata inviata a{" "}
                    <span className="font-medium text-foreground">
                      {resetPasswordResult.email}
                    </span>
                    . Il cliente dovrà cambiare la password al primo accesso.
                  </p>
                </div>
                <div className="modal-footer flex justify-end">
                  <button
                    type="button"
                    className="rounded-md border px-4 py-2 text-sm"
                    onClick={() => {
                      setResetPasswordResult(null);
                      setCopySuccess(false);
                    }}
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
