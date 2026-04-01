"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  MapPin,
  Phone,
  ScrollText,
  Shield,
  ShieldCheck,
  Trash2,
  Pencil,
  Unlock,
  User,
  UserCircle,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type UserDetail = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "CLIENT" | "TEACHER";
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  lockedUntil: string | null;
  failedLoginAttempts: number;
  adminRoleId: string | null;
  adminRole: {
    id: string;
    name: string;
    isSystem: boolean;
    permissions: Record<string, string[]>;
  } | null;
  client: {
    id: string;
    ragioneSociale: string;
    piva: string;
    logoPath: string | null;
    isActive: boolean;
    hasCustomFields: boolean;
    _count: { employees: number; editions: number };
  } | null;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    province: string | null;
    region: string | null;
    status: string;
    fiscalCode: string | null;
    birthDate: string | null;
    birthPlace: string | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    specialization: string | null;
    profession: string | null;
    vatNumber: string | null;
    pec: string | null;
    createdAt: string;
    _count: {
      assignments: number;
      workExperiences: number;
      educations: number;
    };
    categories: { id: string; name: string; color: string | null }[];
  } | null;
  auditLogs: {
    id: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    ipAddress: string | null;
    createdAt: string;
  }[];
};

const ROLE_BADGE: Record<string, { cls: string; label: string }> = {
  ADMIN: { cls: "bg-purple-100 text-purple-700", label: "Admin" },
  CLIENT: { cls: "bg-blue-100 text-blue-700", label: "Client" },
  TEACHER: { cls: "bg-emerald-100 text-emerald-700", label: "Docente" },
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm break-all">{value || "\u2014"}</p>
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { can } = usePermissions();
  const { confirm, prompt } = useConfirmDialog();
  const id = params.id as string;

  const [actionLoading, setActionLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const userQuery = useQuery({
    queryKey: ["admin-amministratori", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/amministratori/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Utente non trovato");
      return json.data as UserDetail;
    },
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
  });

  const user = userQuery.data;
  const isLocked = user?.lockedUntil
    ? new Date(user.lockedUntil) > new Date()
    : false;

  const handleAction = async (
    action: string,
    successMsg: string
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/amministratori/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Errore");
        return;
      }
      toast.success(successMsg);
      userQuery.refetch();
    } catch {
      toast.error("Errore di rete");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    const typed = await prompt({
      title: "Eliminazione utente",
      message: `Stai per eliminare definitivamente l'utente:\n${user.email} (${ROLE_BADGE[user.role].label})\n\nQuesta azione e IRREVERSIBILE. Verranno eliminati:\n- L'account utente e tutti i dati di accesso\n${user.role === "TEACHER" ? "- Assegnazioni lezioni, disponibilita, documenti firmati, CV\n" : ""}${user.role === "CLIENT" ? "- L'accesso al portale per questo utente\n" : ""}- I log di attivita associati\n\nPer confermare, digita l'email dell'utente:`,
      placeholder: user.email,
    });
    if (!typed) return;
    if (typed.toLowerCase() !== user.email.toLowerCase()) {
      toast.error("L'email non corrisponde");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/amministratori/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: typed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Errore eliminazione");
        return;
      }
      toast.success("Utente eliminato");
      router.push("/admin/amministratori");
    } catch {
      toast.error("Errore di rete");
    } finally {
      setDeleting(false);
    }
  };

  // Loading
  if (userQuery.isLoading) {
    return (
      <div className="space-y-4 p-2">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-lg border bg-muted" />
        <div className="h-64 animate-pulse rounded-lg border bg-muted" />
      </div>
    );
  }

  // Error
  if (userQuery.isError || !user) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-red-600">
        Utente non trovato.{" "}
        <Link href="/admin/amministratori" className="text-primary underline">
          Torna alla lista
        </Link>
      </div>
    );
  }

  const badge = ROLE_BADGE[user.role];

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/admin/amministratori"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Amministratori
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <UserCircle className="h-6 w-6 text-primary" />
            {user.name || user.email}
          </h1>
          {user.name && (
            <p className="text-sm text-muted-foreground">{user.email}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}
            >
              {badge.label}
            </span>
            {user.adminRole && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {user.adminRole.name}
              </span>
            )}
            {isLocked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                <Lock className="h-3 w-3" /> Bloccato
              </span>
            )}
            {user.mustChangePassword && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                Cambio password richiesto
              </span>
            )}
            {!user.isActive && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                Disattivo
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        {/* ─── Left sidebar ──────────────────────── */}
        <div className="space-y-4">
          {/* Account info */}
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4" /> Informazioni Account
            </h2>
            <InfoRow icon={User} label="Nome" value={user.name || "\u2014"} />
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow
              icon={Calendar}
              label="Creato il"
              value={fmtDate(user.createdAt)}
            />
            <InfoRow
              icon={Clock}
              label="Ultimo accesso"
              value={fmtDateTime(user.lastLoginAt)}
            />
            {user.failedLoginAttempts > 0 && (
              <InfoRow
                icon={Lock}
                label="Tentativi falliti"
                value={
                  <span className="text-red-600">
                    {user.failedLoginAttempts}
                  </span>
                }
              />
            )}
            {isLocked && user.lockedUntil && (
              <InfoRow
                icon={Lock}
                label="Bloccato fino a"
                value={
                  <span className="text-red-600">
                    {fmtDateTime(user.lockedUntil)}
                  </span>
                }
              />
            )}
          </div>

          {/* Actions */}
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Azioni</h2>
            <div className="flex flex-col gap-2">
              <button
                disabled={actionLoading}
                onClick={async () => {
                  const newName = await prompt({
                    title: "Modifica nome",
                    message: "Inserisci il nome dell'amministratore:",
                    placeholder: "es. Mario Rossi",
                    defaultValue: user.name || "",
                  });
                  if (newName === null) return;
                  setActionLoading(true);
                  try {
                    const res = await fetch(`/api/admin/amministratori/${id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "updateName", name: newName }),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      toast.error(json.error ?? "Errore");
                      return;
                    }
                    toast.success("Nome aggiornato");
                    userQuery.refetch();
                  } catch {
                    toast.error("Errore di rete");
                  } finally {
                    setActionLoading(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" /> Modifica nome
              </button>
              {isLocked && (
                <button
                  disabled={actionLoading}
                  onClick={() =>
                    handleAction("unlock", "Account sbloccato")
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                >
                  <Unlock className="h-4 w-4" /> Sblocca account
                </button>
              )}
              <button
                disabled={actionLoading || user.mustChangePassword}
                onClick={async () => {
                  const ok = await confirm({
                    title: "Forza cambio password",
                    message: `L'utente ${user.email} dovra cambiare password al prossimo accesso.`,
                    confirmText: "Conferma",
                  });
                  if (!ok) return;
                  handleAction(
                    "forcePasswordChange",
                    "Cambio password forzato"
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" /> Forza cambio password
              </button>

              {/* Impersonate */}
              {user.role === "CLIENT" &&
                user.client &&
                can("clienti", "impersonate") && (
                  <button
                    onClick={async () => {
                      const res = await fetch(
                        "/api/admin/impersonate",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            clientUserId: user.id,
                          }),
                        }
                      );
                      const json = await res
                        .json()
                        .catch(() => ({}));
                      if (res.ok) {
                        window.location.href =
                          json?.redirectTo || "/dashboard";
                      } else {
                        toast.error(
                          json?.error ??
                            "Errore impersonazione"
                        );
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                  >
                    <LogIn className="h-4 w-4" /> Accedi come
                    cliente
                  </button>
                )}
              {user.role === "TEACHER" &&
                user.teacher?.status === "ACTIVE" &&
                can("docenti", "impersonate") && (
                  <button
                    onClick={async () => {
                      const res = await fetch(
                        "/api/admin/impersonate-teacher",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            teacherId: user.teacher!.id,
                          }),
                        }
                      );
                      const json = await res
                        .json()
                        .catch(() => ({}));
                      if (res.ok) {
                        window.location.href =
                          json?.redirectTo || "/docente";
                      } else {
                        toast.error(
                          json?.error ??
                            "Errore impersonazione"
                        );
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                  >
                    <LogIn className="h-4 w-4" /> Accedi come
                    docente
                  </button>
                )}

              {/* Delete */}
              {can("amministratori", "delete") && (
                <button
                  disabled={deleting}
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Elimina utente
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Main content ──────────────────────── */}
        <div className="space-y-6">
          {/* ADMIN role info */}
          {user.role === "ADMIN" && user.adminRole && (
            <div className="rounded-lg border bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-purple-600" /> Ruolo
                Admin
              </h2>
              <div className="mb-3 flex items-center gap-2">
                <Link
                  href={`/admin/ruoli/${user.adminRole.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {user.adminRole.name}
                </Link>
                {user.adminRole.isSystem && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] text-purple-700">
                    Sistema
                  </span>
                )}
              </div>
              {user.adminRole.permissions &&
                Object.keys(user.adminRole.permissions).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(user.adminRole.permissions).map(
                      ([area, actions]) => (
                        <span
                          key={area}
                          className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600"
                          title={
                            Array.isArray(actions)
                              ? actions.join(", ")
                              : ""
                          }
                        >
                          {area}
                        </span>
                      )
                    )}
                  </div>
                )}
            </div>
          )}

          {/* CLIENT info */}
          {user.role === "CLIENT" && user.client && (
            <div className="rounded-lg border bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Building2 className="h-4 w-4 text-blue-600" /> Azienda
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Ragione Sociale
                  </p>
                  <Link
                    href={`/admin/clienti/${user.client.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {user.client.ragioneSociale}
                  </Link>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    P.IVA
                  </p>
                  <p className="text-sm">{user.client.piva}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Dipendenti
                  </p>
                  <p className="text-sm font-medium">
                    {user.client._count.employees}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Edizioni
                  </p>
                  <p className="text-sm font-medium">
                    {user.client._count.editions}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Stato
                  </p>
                  <p className="text-sm">
                    {user.client.isActive ? (
                      <span className="text-emerald-600">Attivo</span>
                    ) : (
                      <span className="text-red-600">Disattivo</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Campi personalizzati
                  </p>
                  <p className="text-sm">
                    {user.client.hasCustomFields ? "Attivi" : "Non attivi"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TEACHER info */}
          {user.role === "TEACHER" && user.teacher && (
            <div className="rounded-lg border bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <GraduationCap className="h-4 w-4 text-emerald-600" />{" "}
                Profilo Docente
              </h2>
              <div className="mb-3 flex items-center gap-2">
                <Link
                  href={`/admin/docenti/${user.teacher.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {user.teacher.firstName} {user.teacher.lastName}
                </Link>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    user.teacher.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : user.teacher.status === "SUSPENDED"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {user.teacher.status}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {user.teacher.fiscalCode && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Codice Fiscale
                    </p>
                    <p className="text-sm font-mono">
                      {user.teacher.fiscalCode}
                    </p>
                  </div>
                )}
                {user.teacher.email && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Email docente
                    </p>
                    <p className="text-sm">{user.teacher.email}</p>
                  </div>
                )}
                {(user.teacher.phone || user.teacher.mobile) && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Telefono
                    </p>
                    <p className="text-sm">
                      {user.teacher.phone || user.teacher.mobile}
                    </p>
                  </div>
                )}
                {user.teacher.birthDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Data nascita
                    </p>
                    <p className="text-sm">
                      {fmtDate(user.teacher.birthDate)}
                    </p>
                  </div>
                )}
                {user.teacher.birthPlace && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Luogo nascita
                    </p>
                    <p className="text-sm">{user.teacher.birthPlace}</p>
                  </div>
                )}
                {user.teacher.gender && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Sesso
                    </p>
                    <p className="text-sm">{user.teacher.gender}</p>
                  </div>
                )}
                {(user.teacher.address ||
                  user.teacher.city ||
                  user.teacher.postalCode) && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Indirizzo
                    </p>
                    <p className="text-sm">
                      {[
                        user.teacher.address,
                        user.teacher.city,
                        user.teacher.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}
                {user.teacher.province && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Provincia / Regione
                    </p>
                    <p className="text-sm">
                      {user.teacher.province}
                      {user.teacher.region
                        ? ` (${user.teacher.region})`
                        : ""}
                    </p>
                  </div>
                )}
                {user.teacher.specialization && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Specializzazione
                    </p>
                    <p className="text-sm">
                      {user.teacher.specialization}
                    </p>
                  </div>
                )}
                {user.teacher.profession && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Professione
                    </p>
                    <p className="text-sm">{user.teacher.profession}</p>
                  </div>
                )}
                {user.teacher.vatNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      P.IVA
                    </p>
                    <p className="text-sm">{user.teacher.vatNumber}</p>
                  </div>
                )}
                {user.teacher.pec && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      PEC
                    </p>
                    <p className="text-sm">{user.teacher.pec}</p>
                  </div>
                )}
              </div>

              {/* Counts */}
              <div className="mt-4 flex flex-wrap gap-4 border-t pt-3">
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {user.teacher._count.assignments}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lezioni assegnate
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {user.teacher._count.workExperiences}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Esperienze CV
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {user.teacher._count.educations}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Titoli studio
                  </p>
                </div>
              </div>

              {/* Categories */}
              {user.teacher.categories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                  {user.teacher.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: cat.color
                          ? `${cat.color}20`
                          : "#f3f4f6",
                        color: cat.color || "#6b7280",
                      }}
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Audit logs */}
          <div className="rounded-lg border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ScrollText className="h-4 w-4" /> Attivita recente
            </h2>
            {user.auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna attivita registrata
              </p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {user.auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 rounded px-2 py-1.5 text-sm even:bg-muted/30"
                  >
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px]">
                      {log.action}
                    </span>
                    <span className="flex-1 truncate text-muted-foreground">
                      {log.entityType && (
                        <>
                          {log.entityType}
                          {log.entityId && (
                            <span className="ml-1 font-mono text-[10px]">
                              {log.entityId.slice(0, 8)}...
                            </span>
                          )}
                        </>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fmtDateTime(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
