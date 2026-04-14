"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Crown,
  Loader2,
  Mail,
  PowerOff,
  RotateCcw,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type ClientUserData = {
  users: {
    id: string;
    name: string | null;
    email: string;
    isOwner: boolean;
    status: string;
    invitedAt: string;
    lastLoginAt: string | null;
  }[];
  invites: {
    id: string;
    email: string;
    createdAt: string;
    expiresAt: string;
  }[];
  limits: {
    current: number;
    max: number | null;
    activeCount: number;
    inactiveCount: number;
  };
  clientName: string;
};

function fmtDate(d: string | null) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ClientUsersPage() {
  const { data: session } = useSession();
  const { confirm, prompt } = useConfirmDialog();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [rowActionUserId, setRowActionUserId] = useState<string | null>(null);

  const isOwner = session?.user?.isClientOwner === true;

  const query = useQuery({
    queryKey: ["client-users"],
    queryFn: async () => {
      const res = await fetch("/api/clienti/utenti");
      if (!res.ok) throw new Error("Errore caricamento");
      return (await res.json()) as ClientUserData;
    },
  });

  const data = query.data;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/clienti/utenti/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore");
      toast.success(json.message || "Invito inviato");
      setInviteEmail("");
      setShowInviteForm(false);
      query.refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (email: string) => {
    const ok = await confirm({
      title: "Reinvia invito",
      message: `Reinviare l'invito a ${email}? Il link precedente non sara piu valido.`,
      confirmText: "Reinvia",
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/clienti/utenti/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore");
      toast.success(`Invito reinviato a ${email}`);
      query.refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore reinvio invito");
    }
  };

  const handleRevokeInvite = async (inviteId: string, email: string) => {
    const ok = await confirm({
      title: "Revoca invito",
      message: `Revocare l'invito a ${email}?`,
      confirmText: "Revoca",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/clienti/utenti/invite/${inviteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Errore");
      }
      toast.success(`Invito a ${email} revocato`);
      query.refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore revoca invito");
    }
  };

  const handleMembershipAction = async (
    userId: string,
    email: string,
    action: "deactivate" | "reactivate" | "delete"
  ) => {
    const copy =
      action === "delete"
        ? {
            title: "Elimina amministratore",
            message: `Eliminare definitivamente ${email}? Questa azione libera lo slot amministratore.`,
            confirmText: "Elimina",
            method: "DELETE" as const,
          }
        : action === "deactivate"
          ? {
              title: "Disattiva amministratore",
              message: `Disattivare ${email}? Restera nel conteggio del limite amministratori, ma non potra accedere al portale.`,
              confirmText: "Disattiva",
              method: "PATCH" as const,
            }
          : {
              title: "Riattiva amministratore",
              message: `Riattivare ${email}? Tornera ad accedere senza occupare uno slot aggiuntivo.`,
              confirmText: "Riattiva",
              method: "PATCH" as const,
            };

    const ok = await confirm({
      title: copy.title,
      message: copy.message,
      confirmText: copy.confirmText,
      variant: action === "reactivate" ? "default" : "danger",
    });
    if (!ok) return;

    setRowActionUserId(userId);
    try {
      const res = await fetch(`/api/clienti/utenti/${userId}`, {
        method: copy.method,
        headers:
          copy.method === "PATCH"
            ? { "Content-Type": "application/json" }
            : undefined,
        body:
          copy.method === "PATCH"
            ? JSON.stringify({ action })
            : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Errore");
        return;
      }
      toast.success(
        json.message ||
          (action === "delete"
            ? "Amministratore eliminato"
            : action === "deactivate"
              ? "Amministratore disattivato"
              : "Amministratore riattivato")
      );
      await query.refetch();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setRowActionUserId(null);
    }
  };

  const handleTransfer = async (userId: string, name: string) => {
    const typed = await prompt({
      title: "Trasferisci proprieta",
      message: `Stai per trasferire la proprieta a ${name}. Non potrai piu gestire gli amministratori.\n\nScrivi TRASFERISCI per confermare:`,
      placeholder: "TRASFERISCI",
    });
    if (typed !== "TRASFERISCI") {
      if (typed !== null) toast.error("Conferma non valida");
      return;
    }
    const res = await fetch("/api/clienti/utenti/transfer-ownership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newOwnerId: userId }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success("Proprieta trasferita");
      window.location.reload();
    } else {
      toast.error(json.error || "Errore");
    }
  };

  if (!isOwner) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">
          Accesso riservato al proprietario dell&apos;account.
        </p>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const limitText = data?.limits.max
    ? `${data.limits.current} di ${data.limits.max} amministratori`
    : `${data?.limits.current ?? 0} amministratori`;
  const limitDetails =
    data && data.limits.inactiveCount > 0
      ? `${data.limits.activeCount} attivi, ${data.limits.inactiveCount} disattivati`
      : `${data?.limits.activeCount ?? 0} attivi`;
  const canInvite = data?.limits.max
    ? data.limits.current < data.limits.max
    : true;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Users className="h-5 w-5" /> Gestione Amministratori
          </h1>
          <p className="text-sm text-muted-foreground">{limitText}</p>
          <p className="text-xs text-muted-foreground">{limitDetails}</p>
        </div>
        <button
          onClick={() => canInvite && setShowInviteForm(true)}
          disabled={!canInvite}
          title={!canInvite ? "Limite raggiunto. Contatta l'amministratore del portale." : undefined}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus className="h-4 w-4" /> Invita amministratore
        </button>
      </div>

      {showInviteForm && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">
            Invita un nuovo amministratore
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            L&apos;amministratore ricevera un&apos;email con il link per accettare
            l&apos;invito e accedere ai dati di {data?.clientName}.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@esempio.com"
              className="flex-1 rounded-md border px-3 py-2 text-sm"
              disabled={inviting}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invia"}
            </button>
            <button
              onClick={() => {
                setShowInviteForm(false);
                setInviteEmail("");
              }}
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Un amministratore disattivato continua a occupare uno slot finche non
            viene eliminato definitivamente.
          </p>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">
                  Amministratore
                </th>
                <th className="px-4 py-2.5 text-left font-medium">Ruolo</th>
                <th className="px-4 py-2.5 text-left font-medium">Stato</th>
                <th className="px-4 py-2.5 text-left font-medium">
                  Ultimo accesso
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.users.map((user) => {
                const isInactive = user.status === "INACTIVE";
                const isBusy = rowActionUserId === user.id;

                return (
                  <tr key={user.id} className={isInactive ? "bg-muted/20" : ""}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name || user.email}</p>
                      {user.name && (
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.isOwner ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <Crown className="h-3 w-3" /> Proprietario
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          Amministratore
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isInactive ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          Disattivato
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                          Attivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {fmtDate(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!user.isOwner && user.id !== session?.user?.id && (
                        <div className="flex justify-end gap-1">
                          {!isInactive && (
                            <button
                              onClick={() =>
                                handleTransfer(user.id, user.name || user.email)
                              }
                              className="rounded px-2 py-1 text-xs hover:bg-muted"
                              title="Trasferisci proprieta"
                              disabled={isBusy}
                            >
                              <Crown className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isBusy ? (
                            <span className="inline-flex items-center px-2 py-1 text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            </span>
                          ) : isInactive ? (
                            <button
                              onClick={() =>
                                handleMembershipAction(
                                  user.id,
                                  user.email,
                                  "reactivate"
                                )
                              }
                              className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
                              title="Riattiva"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handleMembershipAction(
                                  user.id,
                                  user.email,
                                  "deactivate"
                                )
                              }
                              className="rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50"
                              title="Disattiva"
                            >
                              <PowerOff className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() =>
                              handleMembershipAction(user.id, user.email, "delete")
                            }
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                            title="Elimina"
                            disabled={isBusy}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(data?.invites?.length ?? 0) > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Mail className="h-4 w-4" /> Inviti in attesa ({data!.invites.length})
          </h3>
          <div className="space-y-2">
            {data!.invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <span>{invite.email}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    Scade il {fmtDate(invite.expiresAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    In attesa
                  </span>
                  {isOwner ? (
                    <>
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Reinvia invito"
                        onClick={() => handleResendInvite(invite.email)}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Revoca invito"
                        onClick={() => handleRevokeInvite(invite.id, invite.email)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
