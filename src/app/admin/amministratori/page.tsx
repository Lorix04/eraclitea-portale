"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Eye,
  Lock,
  Search,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import ResponsiveTable from "@/components/ui/ResponsiveTable";
import MobileFilterPanel from "@/components/ui/MobileFilterPanel";
import CreateUserModal from "@/components/admin/CreateUserModal";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN";
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  isLocked: boolean;
  lockedUntil: string | null;
  failedLoginAttempts: number;
  adminRole: { id: string; name: string; isSystem: boolean } | null;
};

function formatDate(d: string | null) {
  if (!d) return "Mai";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(d: string | null) {
  if (!d) return "Mai";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UtentiPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const { confirm } = useConfirmDialog();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [adminRoleFilter, setAdminRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch admin roles for filter dropdown
  const rolesQuery = useQuery({
    queryKey: ["admin-roles-filter"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) return [];
      const json = await res.json();
      return (Array.isArray(json) ? json : json.data ?? []) as {
        id: string;
        name: string;
      }[];
    },
    staleTime: 5 * 60_000,
  });

  const queryKey = [
    "admin-amministratori",
    search,
    adminRoleFilter,
    statusFilter,
    sortBy,
    sortOrder,
  ];

  const usersQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (adminRoleFilter !== "all")
        params.set("adminRoleId", adminRoleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("limit", "200");
      const res = await fetch(`/api/admin/amministratori?${params}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json.error || "Errore nel caricamento utenti");
      return json as { data: UserRow[]; total: number };
    },
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const users = usersQuery.data?.data ?? [];
  const total = usersQuery.data?.total ?? 0;

  const statusCounts = useMemo(() => {
    const counts = { all: 0, active: 0, locked: 0, mustChange: 0 };
    for (const u of users) {
      counts.all++;
      if (u.isLocked) counts.locked++;
      else if (u.mustChangePassword) counts.mustChange++;
      else if (u.isActive) counts.active++;
    }
    return counts;
  }, [users]);

  const activeFilterCount =
    (adminRoleFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  const resetFilters = () => {
    setSearch("");
    setAdminRoleFilter("all");
    setStatusFilter("all");
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const getStatusBadge = (u: UserRow) => {
    if (u.isLocked)
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
          <Lock className="h-3 w-3" /> Bloccato
        </span>
      );
    if (u.mustChangePassword)
      return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
          Cambio password
        </span>
      );
    if (!u.isActive)
      return (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          Disattivo
        </span>
      );
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
        Attivo
      </span>
    );
  };

  const columns = [
    {
      key: "email",
      header: "Email",
      isPrimary: true,
      sortable: true,
      render: (u: UserRow) => (
        <span className="font-medium text-sm">{u.email}</span>
      ),
    },
    {
      key: "name",
      header: "Nome",
      isSecondary: true,
      render: (u: UserRow) => (
        <span className="text-sm">
          {u.name || <span className="text-muted-foreground">{"\u2014"}</span>}
        </span>
      ),
    },
    {
      key: "role",
      header: "Ruolo",
      isBadge: true,
      render: (u: UserRow) => {
        if (!u.adminRole) {
          return (
            <span className="text-xs text-muted-foreground">
              Nessun ruolo
            </span>
          );
        }
        return (
          <span
            className={`inline-block w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
              u.adminRole.isSystem
                ? "bg-amber-100 text-amber-700"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            {u.adminRole.name}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Stato",
      isBadge: true,
      render: (u: UserRow) => getStatusBadge(u),
    },
    {
      key: "lastLoginAt",
      header: "Ultimo accesso",
      sortable: true,
      render: (u: UserRow) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(u.lastLoginAt)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Creato il",
      sortable: true,
      hideOnCard: true,
      render: (u: UserRow) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(u.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <UsersRound className="h-6 w-6 text-primary" /> Amministratori
          </h1>
          <p className="text-sm text-muted-foreground">
            Tutti gli amministratori registrati nel portale
            {!usersQuery.isLoading && (
              <span className="ml-1 font-medium">({total})</span>
            )}
          </p>
        </div>
        {can("amministratori", "create") && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" /> Nuovo Amministratore
          </button>
        )}
      </div>

      {/* Filters */}
      <MobileFilterPanel
        activeFiltersCount={activeFilterCount}
        onReset={resetFilters}
        resultCount={users.length}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cerca per email o ruolo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border py-2 pl-9 pr-8 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Admin role filter */}
          <select
            value={adminRoleFilter}
            onChange={(e) => setAdminRoleFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="all">Tutti i ruoli</option>
            <option value="none">Senza ruolo</option>
            {(rolesQuery.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="all">Tutti gli stati</option>
            <option value="active">
              Attivo ({statusCounts.active})
            </option>
            <option value="locked">
              Bloccato ({statusCounts.locked})
            </option>
            <option value="mustChange">
              Cambio password ({statusCounts.mustChange})
            </option>
          </select>

          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="hidden rounded-md border px-3 py-2 text-sm hover:bg-muted sm:block"
            >
              Resetta
            </button>
          )}
        </div>
      </MobileFilterPanel>

      {/* Error */}
      {usersQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {usersQuery.error?.message || "Errore nel caricamento utenti"}
          <button
            onClick={() => usersQuery.refetch()}
            className="ml-2 underline hover:no-underline"
          >
            Riprova
          </button>
        </div>
      )}

      {/* Table */}
      <ResponsiveTable
        columns={columns}
        data={users}
        keyExtractor={(u) => u.id}
        loading={usersQuery.isLoading}
        skeletonCount={8}
        emptyMessage="Nessun amministratore trovato"
        sortKey={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        actions={(u) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push(`/admin/amministratori/${u.id}`)}
              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Eye className="h-3.5 w-3.5" /> Dettaglio
            </button>
            {can("amministratori", "delete") && (
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: "Elimina amministratore",
                    message: `Eliminare definitivamente l'amministratore ${u.email}?\nQuesta azione e irreversibile.`,
                    confirmText: "Elimina",
                    variant: "danger",
                  });
                  if (!ok) return;
                  const res = await fetch(`/api/admin/amministratori/${u.id}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ confirmText: u.email }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (res.ok) {
                    toast.success("Amministratore eliminato");
                    usersQuery.refetch();
                  } else {
                    toast.error(json?.error ?? "Errore eliminazione");
                  }
                }}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
                title="Elimina"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      />

      {/* Create admin modal */}
      <CreateUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => usersQuery.refetch()}
      />
    </div>
  );
}
