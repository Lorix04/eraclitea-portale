"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  Crown,
  KeyRound,
  Loader2,
  LogIn,
  Plus,
  PowerOff,
  RotateCcw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
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

type ClientUsersResponse = {
  users: ClientUserRow[];
  maxUsers: number | null;
  usedCount: number;
  activeCount: number;
};

function fmtDate(d: string | null) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ProgressBar({
  value,
  max,
  isOverLimit,
}: {
  value: number;
  max: number;
  isOverLimit: boolean;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={isOverLimit ? "h-full bg-red-500" : "h-full bg-primary"}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function ClientUsersSection({
  clientId,
  canManageUsers,
  canEditLimit,
}: {
  clientId: string;
  canManageUsers: boolean;
  canEditLimit: boolean;
}) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const addRequestLockRef = useRef(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);
  const [limitValue, setLimitValue] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);
  const [rowActionUserId, setRowActionUserId] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin-client-users", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/clienti/${clientId}/utenti`);
      if (!res.ok) {
        return { users: [], maxUsers: null, usedCount: 0, activeCount: 0 };
      }
      return (await res.json()) as ClientUsersResponse;
    },
  });

  const data = usersQuery.data;
  const users = data?.users ?? [];
  const usedCount = data?.usedCount ?? 0;
  const activeCount = data?.activeCount ?? 0;
  const inactiveCount = Math.max(0, usedCount - activeCount);
  const maxUsers = data?.maxUsers ?? null;
  const limitSummary =
    maxUsers === null
      ? `${usedCount} amministrator${usedCount === 1 ? "e" : "i"}`
      : `${usedCount}/${maxUsers} amministrator${usedCount === 1 ? "e" : "i"}`;
  const isOverLimit = maxUsers !== null && usedCount > maxUsers;
  const limitReached = maxUsers !== null && usedCount >= maxUsers;

  useEffect(() => {
    setLimitValue(maxUsers === null ? "" : String(maxUsers));
  }, [maxUsers]);

  const handleAdd = async () => {
    if (addRequestLockRef.current || adding) return;

    if (!addEmail.trim()) {
      toast.error("Email obbligatoria");
      return;
    }

    if (limitReached) {
      toast.error(
        maxUsers === null
          ? "Limite amministratori raggiunto"
          : `Limite amministratori raggiunto (${usedCount}/${maxUsers})`
      );
      return;
    }

    addRequestLockRef.current = true;
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

      if (!res.ok) {
        if (res.status === 409) {
          await usersQuery.refetch();
        }
        toast.error(json.error || "Errore");
        return;
      }

      toast.success(
        json.message ||
          (res.status === 201
            ? "Nuovo amministratore creato"
            : "Amministratore associato")
      );
      setAddEmail("");
      setAddName("");
      setShowAddForm(false);
      await usersQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      addRequestLockRef.current = false;
      setAdding(false);
    }
  };

  const handleSaveLimit = async () => {
    if (savingLimit) return;

    const rawValue = limitValue.trim();
    const isValidInteger = rawValue === "" || /^[1-9]\d*$/.test(rawValue);
    const nextValue = rawValue === "" ? null : Number.parseInt(rawValue, 10);

    if (!isValidInteger) {
      toast.error(
        "Inserisci un limite valido oppure lascia vuoto per illimitato"
      );
      return;
    }

    setSavingLimit(true);
    try {
      const res = await fetch(`/api/admin/clienti/${clientId}/max-users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxUsers: nextValue }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(json.error || "Errore");
        return;
      }

      toast.success(
        nextValue === null
          ? "Limite amministratori rimosso"
          : "Limite amministratori aggiornato"
      );
      if (json.warning) {
        toast.warning(json.warning);
      }
      await usersQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setSavingLimit(false);
    }
  };

  const handleStatusAction = async (
    user: ClientUserRow,
    action: "deactivate" | "reactivate"
  ) => {
    const isDeactivate = action === "deactivate";
    const ok = await confirm({
      title: isDeactivate
        ? "Disattiva amministratore"
        : "Riattiva amministratore",
      message: isDeactivate
        ? `Disattivare ${user.email}? Restera nel conteggio del limite amministratori, ma non potra accedere al client.`
        : `Riattivare ${user.email}? Tornera ad accedere al client senza occupare uno slot aggiuntivo.`,
      confirmText: isDeactivate ? "Disattiva" : "Riattiva",
      variant: isDeactivate ? "danger" : "default",
    });
    if (!ok) return;

    setRowActionUserId(user.id);
    try {
      const res = await fetch(`/api/admin/clienti/${clientId}/utenti`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Errore");
        return;
      }
      toast.success(
        json.message ||
          (isDeactivate
            ? "Amministratore disattivato"
            : "Amministratore riattivato")
      );
      await usersQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setRowActionUserId(null);
    }
  };

  const handleDelete = async (user: ClientUserRow) => {
    const ok = await confirm({
      title: "Elimina amministratore",
      message: `Eliminare definitivamente ${user.email} da questo client? Questa azione libera lo slot amministratore.`,
      confirmText: "Elimina",
      variant: "danger",
    });
    if (!ok) return;

    setRowActionUserId(user.id);
    try {
      const res = await fetch(`/api/admin/clienti/${clientId}/utenti`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Errore");
        return;
      }
      toast.success(json.message || "Amministratore eliminato");
      await usersQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setRowActionUserId(null);
    }
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientUserId: userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Errore impersonazione");
        return;
      }
      router.push(json.redirectTo || "/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const handleResetPassword = async (user: ClientUserRow) => {
    const ok = await confirm({
      title: "Reset Password",
      message: `Resettare la password di ${user.name || user.email} (${user.email})?\n\nL'utente ricevera una password temporanea via email.`,
      confirmText: "Reset Password",
      variant: "danger",
    });
    if (!ok) return;

    setRowActionUserId(user.id);
    try {
      const res = await fetch(`/api/admin/clienti/${clientId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Errore reset");
        return;
      }
      if (json.newPassword) {
        toast.success(`Password resettata. Nuova password: ${json.newPassword}`, { duration: 15000 });
      } else {
        toast.success(`Password resettata per ${user.email}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setRowActionUserId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4" /> Amministratori
          </h2>
          <p className="text-xs text-muted-foreground">{limitSummary}</p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => setShowAddForm(true)}
            disabled={limitReached}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Aggiungi
          </button>
        )}
      </div>

      <div className="mb-4 rounded-md border bg-muted/20 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">Limite amministratori</p>
              <p className="text-xs text-muted-foreground">
                Lascia vuoto per consentire un numero illimitato di amministratori.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {maxUsers === null
                ? `${usedCount} associat${usedCount === 1 ? "o" : "i"}`
                : `${usedCount}/${maxUsers} associat${usedCount === 1 ? "o" : "i"}`}
              {` | ${activeCount} attiv${activeCount === 1 ? "o" : "i"}`}
              {inactiveCount > 0 &&
                ` | ${inactiveCount} disattivat${inactiveCount === 1 ? "o" : "i"}`}
            </div>
            {maxUsers !== null && (
              <ProgressBar
                value={usedCount}
                max={maxUsers}
                isOverLimit={isOverLimit}
              />
            )}
          </div>

          <div className="flex flex-col gap-2 md:w-52">
            <input
              type="number"
              min={1}
              step={1}
              value={limitValue}
              onChange={(e) => setLimitValue(e.target.value)}
              placeholder="Illimitato"
              disabled={!canEditLimit || savingLimit}
              className="w-full rounded-md border px-3 py-1.5 text-sm disabled:bg-muted"
            />
            {canEditLimit && (
              <button
                type="button"
                onClick={handleSaveLimit}
                disabled={savingLimit}
                className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                {savingLimit ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Salva limite"
                )}
              </button>
            )}
          </div>
        </div>

        {isOverLimit && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Il limite e inferiore agli amministratori associati. I profili
              disattivati contano comunque nel limite e i nuovi aggiunti restano
              bloccati finche non liberi uno slot o aumenti il limite.
            </span>
          </div>
        )}

        {limitReached && !isOverLimit && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Limite raggiunto. Anche gli amministratori disattivati occupano
              uno slot fino a eliminazione definitiva.
            </span>
          </div>
        )}
      </div>

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
            Se l&apos;email esiste gia, viene associato direttamente. Se era
            disattivata, viene riattivata. Altrimenti viene creato un nuovo
            account con password temporanea.
          </p>
        </div>
      )}

      {usersQuery.isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun amministratore associato.
        </p>
      ) : (
        <div className="space-y-1.5">
          {users.map((user) => {
            const isInactive = user.status === "INACTIVE";
            const isBusy = rowActionUserId === user.id;

            return (
              <div
                key={user.id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                  isInactive ? "bg-muted/20" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {user.name || user.email}
                    </span>
                    {user.isOwner && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        <Crown className="h-2.5 w-2.5" /> Proprietario
                      </span>
                    )}
                    {isInactive && (
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                        Disattivato
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-[10px] text-muted-foreground sm:inline">
                    {fmtDate(user.lastLoginAt)}
                  </span>
                  {canManageUsers && !user.isOwner && (
                    <>
                      {!isInactive && !isBusy && (
                        <>
                          <button
                            onClick={() => handleImpersonate(user.id)}
                            className="rounded p-1 text-blue-500 hover:bg-blue-50"
                            title="Accedi come questo utente"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="rounded p-1 text-amber-500 hover:bg-amber-50"
                            title="Reset password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      ) : isInactive ? (
                        <button
                          onClick={() => handleStatusAction(user, "reactivate")}
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                          title="Riattiva amministratore"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusAction(user, "deactivate")}
                          className="rounded p-1 text-amber-600 hover:bg-amber-50"
                          title="Disattiva amministratore"
                        >
                          <PowerOff className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={isBusy}
                        className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-50"
                        title="Elimina amministratore"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
