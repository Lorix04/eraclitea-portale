"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ClientRow = {
  id: string;
  ragioneSociale: string;
  piva: string;
  referenteNome: string;
  referenteEmail: string;
  isActive: boolean;
  categories?: { id: string; name: string; color?: string | null }[];
  user?: { id: string; email: string; isActive: boolean } | null;
};

export default function AdminClientiPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [confirmClient, setConfirmClient] = useState<ClientRow | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    return params.toString();
  }, [search, status, categoryFilter]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/clienti?${queryString}`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      setClients([]);
      setLoading(false);
      return;
    }
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    setClients(json.data ?? []);
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    const loadCategories = async () => {
      const res = await fetch("/api/admin/categorie");
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
      const data = Array.isArray(json) ? json : json.data ?? [];
      setCategories(
        data.map((category: { id: string; name: string }) => ({
          id: category.id,
          name: category.name,
        }))
      );
    };
    loadCategories();
  }, []);

  const handleToggleStatus = async (id: string) => {
    await fetch(`/api/admin/clienti/${id}/toggle-status`, { method: "POST" });
    loadClients();
  };

  const handleResetPassword = async (id: string) => {
    const res = await fetch(`/api/admin/clienti/${id}/reset-password`, {
      method: "POST",
    });
    const json = await res.json();
    if (json.tempPassword) {
      window.alert(`Password temporanea: ${json.tempPassword}`);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/clienti/${id}`, { method: "DELETE" });
    loadClients();
  };

  const handleConfirmDelete = async () => {
    if (!confirmClient) return;
    await handleDelete(confirmClient.id);
    setConfirmClient(null);
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
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Nuovo cliente
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-64"
          placeholder="Cerca ragione sociale o P.IVA"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="">Tutte le categorie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Tutti</option>
          <option value="active">Attivi</option>
          <option value="inactive">Disattivi</option>
        </select>
        <button
          type="button"
          className="rounded-md border bg-background px-4 py-2 text-sm"
          onClick={loadClients}
        >
          Aggiorna
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Ragione Sociale</th>
              <th className="px-4 py-3">P.IVA</th>
              <th className="px-4 py-3">Referente</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Categorie</th>
              <th className="px-4 py-3">Stato</th>
              <th className="px-4 py-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Caricamento...
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Nessun cliente trovato.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{client.ragioneSociale}</td>
                  <td className="px-4 py-3">{client.piva}</td>
                  <td className="px-4 py-3">{client.referenteNome}</td>
                  <td className="px-4 py-3">{client.user?.email ?? client.referenteEmail}</td>
                  <td className="px-4 py-3">
                    {client.categories && client.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {client.categories.map((category) => (
                          <span
                            key={category.id}
                            className="rounded-full px-2 py-1 text-xs text-white"
                            style={{ backgroundColor: category.color ?? "#6B7280" }}
                          >
                            {category.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        client.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {client.isActive ? "Attivo" : "Disattivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Link
                        href={`/admin/clienti/${client.id}/edit`}
                        className="text-primary"
                      >
                        Modifica
                      </Link>
                      <button
                        type="button"
                        className="text-primary"
                        onClick={() => handleToggleStatus(client.id)}
                      >
                        {client.isActive ? "Disattiva" : "Attiva"}
                      </button>
                      <button
                        type="button"
                        className="text-primary"
                        onClick={() => handleResetPassword(client.id)}
                      >
                        Reset password
                      </button>
                      <button
                        type="button"
                        className="text-destructive"
                        onClick={() => setConfirmClient(client)}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {confirmClient ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Conferma eliminazione</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Vuoi eliminare il cliente{" "}
              <span className="font-medium text-foreground">
                {confirmClient.ragioneSociale}
              </span>
              ? L&apos;azione disattiva il cliente e l&apos;utente associato.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm"
                onClick={() => setConfirmClient(null)}
              >
                Annulla
              </button>
              <button
                type="button"
                className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground"
                onClick={handleConfirmDelete}
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
