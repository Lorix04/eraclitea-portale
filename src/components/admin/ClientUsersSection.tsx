"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Crown,
  Loader2,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type ClientUserRow = {
  id: string;
  name: string | null;
  email: string;
  isOwner: boolean;
  status: string;
  invitedAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
};

function fmtDate(d: string | null) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ClientUsersSection({
  clientId,
  canEdit,
}: {
  clientId: string;
  canEdit: boolean;
}) {
  const { confirm } = useConfirmDialog();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["admin-client-users", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/clienti/${clientId}/utenti`);
      if (!res.ok) return { users: [], maxUsers: null, activeCount: 0 };
      return (await res.json()) as {
        users: ClientUserRow[];
        maxUsers: number | null;
        activeCount: number;
      };
    },
  });

  const data = usersQuery.data;
  const users = data?.users ?? [];
  const activeCount = data?.activeCount ?? 0;
  const maxUsers = data?.maxUsers ?? null;

  const handleAdd = async () => {
    if (!addEmail.trim()) {
      toast.error("Email obbligatoria");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/admin/clienti/${clientId}/utenti`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addEmail.trim(),
          name: addName.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore");
      toast.success("Amministratore aggiunto");
      setAddEmail("");
      setAddName("");
      setShowAddForm(false);
      usersQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId: string, email: string) => {
    const ok = await confirm({
      title: "Rimuovi amministratore",
      message: `Rimuovere ${email} da questo client? Non potra piu accedere ai dati dell'azienda.`,
      confirmText: "Rimuovi",
      variant: "danger",
    });
    if (!ok) return;

    try {
      // Use the admin client users endpoint — delete by removing from ClientUser
      const res = await fetch(`/api/admin/clienti/${clientId}/utenti`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore");
      toast.success("Amministratore rimosso");
      usersQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4" /> Amministratori
          </h2>
          <p className="text-xs text-muted-foreground">
            {activeCount} amministrator{activeCount === 1 ? "e" : "i"} attiv{activeCount === 1 ? "o" : "i"}
            {maxUsers !== null && ` / ${maxUsers} max`}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Aggiungi
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-3 rounded-md border bg-muted/30 p-3">
          <div className="space-y-2">
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Nome (opzionale)"
              className="w-full rounded-md border px-3 py-1.5 text-sm"
              disabled={adding}
            />
            <div className="flex gap-2">
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="email@esempio.com"
                className="flex-1 rounded-md border px-3 py-1.5 text-sm"
                disabled={adding}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <button
                onClick={handleAdd}
                disabled={adding || !addEmail.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Aggiungi"
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setAddEmail("");
                  setAddName("");
                }}
                className="rounded-md border px-2 py-1.5 text-xs hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Se l&apos;email esiste gia, viene associato direttamente. Altrimenti viene creato un nuovo account con password temporanea.
          </p>
        </div>
      )}

      {/* Users list */}
      {usersQuery.isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun amministratore associato.</p>
      ) : (
        <div className="space-y-1.5">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {u.name || u.email}
                  </span>
                  {u.isOwner && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      <Crown className="h-2.5 w-2.5" /> Proprietario
                    </span>
                  )}
                  {u.status !== "ACTIVE" && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                      {u.status}
                    </span>
                  )}
                </div>
                {u.name && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {u.email}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  {fmtDate(u.lastLoginAt)}
                </span>
                {canEdit && !u.isOwner && (
                  <button
                    onClick={() => handleRemove(u.id, u.email)}
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                    title="Rimuovi amministratore"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
