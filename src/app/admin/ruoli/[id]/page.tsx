"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Loader2,
  Mail,
  Pencil,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  PERMISSION_AREAS,
  ACTION_LABELS,
  type PermissionsMap,
  type PermissionArea,
} from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import RoleModal from "@/components/admin/RoleModal";
import AssignRoleModal from "@/components/admin/AssignRoleModal";
import InviteAdminModal from "@/components/admin/InviteAdminModal";

type RoleDetail = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isDefault: boolean;
  permissions: PermissionsMap;
  users: {
    id: string;
    email: string;
    isActive: boolean;
    lastLoginAt: string | null;
    adminInviteStatus: string | null;
    adminInviteSentAt: string | null;
  }[];
};

export default function AdminRoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { data: session } = useSession();
  const { confirm: confirmDialog } = useConfirmDialog();
  const currentUserId = session?.user?.id;
  const roleId = params.id as string;

  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [reinviting, setReinviting] = useState<string | null>(null);

  const roleQuery = useQuery({
    queryKey: ["admin-role", roleId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/roles/${roleId}`);
      if (!res.ok) throw new Error("Ruolo non trovato");
      const json = await res.json();
      return json.data as RoleDetail;
    },
  });

  const role = roleQuery.data;

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/admin/roles/${roleId}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Errore");
      }
      const json = await res.json();
      toast.success("Ruolo duplicato");
      router.push(`/admin/ruoli/${json.data.id}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUnassign = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/roles/${roleId}/unassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Errore");
      }
      toast.success("Utente rimosso dal ruolo");
      queryClient.invalidateQueries({ queryKey: ["admin-role", roleId] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-role", roleId] });
    queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
  };

  if (roleQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg border bg-muted" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Ruolo non trovato.{" "}
        <Link href="/admin/ruoli" className="text-primary underline">
          Torna ai ruoli
        </Link>
      </div>
    );
  }

  const perms = (role.permissions ?? {}) as PermissionsMap;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/ruoli"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Torna ai ruoli
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${role.isSystem ? "text-amber-500" : "text-primary"}`} />
            <h1 className="text-xl font-semibold">{role.name}</h1>
            {role.isSystem ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                SISTEMA
              </span>
            ) : null}
          </div>
          {role.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          {!role.isSystem && can("ruoli", "edit") ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              <Pencil className="h-4 w-4" /> Modifica
            </button>
          ) : null}
          {can("ruoli", "create") ? (
            <button
              type="button"
              onClick={handleDuplicate}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              <Copy className="h-4 w-4" /> Duplica
            </button>
          ) : null}
        </div>
      </div>

      {/* Permissions table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Permessi
        </h2>
        <div className="overflow-hidden rounded-lg border">
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Area</th>
                <th className="px-4 py-2 text-left font-medium">Permessi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(Object.keys(PERMISSION_AREAS) as PermissionArea[]).map((area) => {
                const areaPerms = perms[area] ?? [];
                const areaConfig = PERMISSION_AREAS[area];
                return (
                  <tr key={area}>
                    <td className="whitespace-nowrap px-4 py-2 font-medium">
                      {areaConfig.label}
                    </td>
                    <td className="px-4 py-2">
                      {areaPerms.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {areaPerms.map((action) => (
                            <span
                              key={action}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                            >
                              <Check className="h-3 w-3" />
                              {ACTION_LABELS[action] || action}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <X className="h-3 w-3" /> Nessun accesso
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Mobile: card view */}
          <div className="divide-y md:hidden">
            {(Object.keys(PERMISSION_AREAS) as PermissionArea[]).map((area) => {
              const areaPerms = perms[area] ?? [];
              const areaConfig = PERMISSION_AREAS[area];
              return (
                <div key={area} className="px-4 py-3">
                  <p className="text-sm font-medium">{areaConfig.label}</p>
                  {areaPerms.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {areaPerms.map((action) => (
                        <span
                          key={action}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                        >
                          <Check className="h-3 w-3" />
                          {ACTION_LABELS[action] || action}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <X className="h-3 w-3" /> Nessun accesso
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Assigned users */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Utenti assegnati ({role.users.length})
          </h2>
          {can("ruoli", "assign") ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              >
                <Mail className="h-4 w-4" /> Invita nuovo utente
              </button>
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted"
              >
                <UserPlus className="h-4 w-4" /> Assegna esistente
              </button>
            </div>
          ) : null}
        </div>
        {role.users.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            Nessun utente assegnato a questo ruolo.
          </div>
        ) : (
          <div className="space-y-2">
            {role.users.map((user) => {
              const isPending = user.adminInviteStatus === "pending";
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Clock className="h-3 w-3" />
                          In attesa di registrazione
                          {user.adminInviteSentAt
                            ? ` · Invito: ${new Date(user.adminInviteSentAt).toLocaleDateString("it-IT")}`
                            : ""}
                        </span>
                      ) : (
                        <>
                          <span className="text-emerald-600">Attivo</span>
                          {user.lastLoginAt
                            ? ` · Ultimo accesso: ${new Date(user.lastLoginAt).toLocaleDateString("it-IT")}`
                            : ""}
                        </>
                      )}
                    </p>
                  </div>
                  {can("ruoli", "assign") ? (
                    <div className="flex gap-1 shrink-0">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            disabled={reinviting === user.id}
                            onClick={async () => {
                              setReinviting(user.id);
                              try {
                                const res = await fetch(`/api/admin/roles/reinvite-user/${user.id}`, { method: "POST" });
                                const json = await res.json();
                                if (!res.ok) throw new Error(json.error);
                                toast.success("Invito reinviato");
                              } catch (err: any) {
                                toast.error(err.message);
                              } finally {
                                setReinviting(null);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          >
                            {reinviting === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                            Reinvia
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirmDialog({ title: "Annulla invito", message: "Annullare l'invito? L'utente verra eliminato.", confirmText: "Annulla invito", variant: "danger" });
                              if (!ok) return;
                              try {
                                const res = await fetch(`/api/admin/roles/reinvite-user/${user.id}`, { method: "DELETE" });
                                const json = await res.json();
                                if (!res.ok) throw new Error(json.error);
                                toast.success("Invito annullato");
                                refresh();
                              } catch (err: any) {
                                toast.error(err.message);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" /> Annulla
                          </button>
                        </>
                      ) : (() => {
                        const isSelf = user.id === currentUserId;
                        const isLastSystemUser = role?.isSystem && role.users.filter(u => u.adminInviteStatus !== "pending").length <= 1;
                        const disabled = isSelf || isLastSystemUser;
                        const tooltip = isSelf
                          ? "Non puoi rimuoverti dal tuo stesso ruolo"
                          : isLastSystemUser
                            ? "Deve esserci sempre almeno un Super Admin"
                            : undefined;
                        return (
                          <button
                            type="button"
                            disabled={!!disabled}
                            title={tooltip}
                            onClick={async () => {
                              const ok = await confirmDialog({ title: "Rimuovi dal ruolo", message: `Rimuovere ${user.email} dal ruolo "${role?.name}"? L'utente perdera tutti i permessi fino alla riassegnazione di un ruolo.`, confirmText: "Rimuovi", variant: "danger" });
                              if (!ok) return;
                              handleUnassign(user.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <UserMinus className="h-3 w-3" /> Rimuovi
                          </button>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editOpen ? (
        <RoleModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          role={role}
          onSaved={() => {
            setEditOpen(false);
            refresh();
          }}
        />
      ) : null}

      {assignOpen ? (
        <AssignRoleModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          roleId={roleId}
          roleName={role.name}
          onAssigned={() => {
            setAssignOpen(false);
            refresh();
          }}
        />
      ) : null}

      {inviteOpen ? (
        <InviteAdminModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          roleId={roleId}
          roleName={role.name}
          onInvited={() => {
            setInviteOpen(false);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}
