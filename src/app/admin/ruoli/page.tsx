"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, Pencil, Shield, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import ActionMenu from "@/components/ui/ActionMenu";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { usePermissions } from "@/hooks/usePermissions";

type RoleItem = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isDefault: boolean;
  usersCount: number;
};

export default function AdminRolesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rolesQuery = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Errore caricamento ruoli");
      const json = await res.json();
      return (json.data ?? []) as RoleItem[];
    },
  });

  const roles = rolesQuery.data ?? [];

  const handleDuplicate = async (roleId: string) => {
    try {
      const res = await fetch(`/api/admin/roles/${roleId}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Errore durante la duplicazione");
      }
      const json = await res.json();
      toast.success("Ruolo duplicato");
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      router.push(`/admin/ruoli/${json.data.id}`);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const handleDelete = async (roleId: string) => {
    setDeletingId(roleId);
    try {
      const res = await fetch(`/api/admin/roles/${roleId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Errore durante l'eliminazione");
      }
      toast.success("Ruolo eliminato");
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <ShieldCheck className="h-5 w-5" />
            Ruoli e Permessi
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestisci i ruoli di accesso al portale admin.
          </p>
        </div>
        {can("ruoli", "create") ? (
          <Link
            href="/admin/ruoli/nuovo"
            className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            + Nuovo ruolo
          </Link>
        ) : null}
      </div>

      {rolesQuery.error ? (
        <ErrorMessage
          message="Errore caricamento ruoli"
          onRetry={() => void rolesQuery.refetch()}
        />
      ) : null}

      {rolesQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Nessun ruolo trovato.
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className={`h-4 w-4 ${role.isSystem ? "text-amber-500" : "text-muted-foreground"}`} />
                  <span className="font-semibold">{role.name}</span>
                  {role.isSystem ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      SISTEMA
                    </span>
                  ) : null}
                  {role.isDefault ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      DEFAULT
                    </span>
                  ) : null}
                </div>
                {role.description ? (
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                ) : null}
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {role.usersCount} utent{role.usersCount === 1 ? "e" : "i"} assegnat{role.usersCount === 1 ? "o" : "i"}
                </p>
              </div>
              <ActionMenu
                primaryAction={{
                  key: "view",
                  label: "Dettaglio",
                  icon: Eye,
                  variant: "info",
                  href: `/admin/ruoli/${role.id}`,
                }}
                secondaryActions={[
                  ...(!role.isSystem && can("ruoli", "create")
                    ? [{
                        key: "duplicate",
                        label: "Duplica",
                        icon: Copy,
                        variant: "default" as const,
                        onClick: () => handleDuplicate(role.id),
                      }]
                    : []),
                  ...(!role.isSystem && can("ruoli", "edit")
                    ? [{
                        key: "edit",
                        label: "Modifica",
                        icon: Pencil,
                        variant: "default" as const,
                        href: `/admin/ruoli/${role.id}?edit=1`,
                        shortcutKey: "e",
                      }]
                    : []),
                  ...(!role.isSystem && can("ruoli", "delete")
                    ? [{
                        key: "delete",
                        label: "Elimina",
                        icon: Trash2,
                        variant: "danger" as const,
                        requireConfirm: true,
                        confirmMessage: role.usersCount > 0
                          ? `Impossibile eliminare: ${role.usersCount} utenti assegnati`
                          : `Eliminare il ruolo "${role.name}"?`,
                        disabled: role.usersCount > 0 || deletingId === role.id,
                        onClick: () => handleDelete(role.id),
                        shortcutKey: "Delete",
                        shortcutLabel: "Del",
                      }]
                    : []),
                ]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
