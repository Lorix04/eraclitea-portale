"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  KeyRound,
  LogIn,
  Mail,
  Pencil,
  Phone,
  MapPin,
  Users,
  BookOpen,
  Award,
  Bell,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import ClientCustomFieldsConfig from "@/components/admin/ClientCustomFieldsConfig";
import ClientUsersSection from "@/components/admin/ClientUsersSection";
import { usePermissions } from "@/hooks/usePermissions";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import ErrorMessage from "@/components/ui/ErrorMessage";

type ClientDetail = {
  id: string;
  ragioneSociale: string;
  piva: string;
  indirizzo: string | null;
  referenteNome: string;
  referenteEmail: string;
  telefono: string | null;
  isActive: boolean;
  logoPath: string | null;
  logoLightPath: string | null;
  user: { id: string; email: string; isActive: boolean } | null;
  categories: { id: string; name: string; color: string | null }[];
};

type EditionSummary = {
  id: string;
  editionNumber: number;
  status: string;
  courseName: string;
  startDate: string | null;
  endDate: string | null;
};

type Stats = {
  employeesCount: number;
  editionsCount: number;
  certificatesCount: number;
  editions: EditionSummary[];
};

const STATUS_LABELS: Record<string, { cls: string; label: string }> = {
  DRAFT: { cls: "bg-gray-100 text-gray-700", label: "Bozza" },
  PUBLISHED: { cls: "bg-blue-100 text-blue-700", label: "Pubblicato" },
  CLOSED: { cls: "bg-amber-100 text-amber-700", label: "Chiuso" },
  ARCHIVED: { cls: "bg-gray-100 text-gray-500", label: "Archiviato" },
};

function DefaultNotifyPolicySection({ clientId }: { clientId: string }) {
  const [policy, setPolicy] = useState<string>("REFERENT_ONLY");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/clienti/${clientId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json?.data?.defaultNotifyPolicy) {
          setPolicy(json.data.defaultNotifyPolicy);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [clientId]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/clienti/${clientId}/notify-policy`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultNotifyPolicy: policy }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Default notifiche aggiornato");
    } else {
      toast.error("Errore durante il salvataggio");
    }
  };

  if (!loaded) return null;

  const options = [
    { value: "REFERENT_ONLY", label: "Solo referente" },
    { value: "REFERENT_PLUS", label: "Referente + selezionati" },
    { value: "ALL", label: "Tutti gli utenti" },
  ];

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Bell className="h-4 w-4" />
        Default notifiche edizioni
      </h3>
      <p className="text-xs text-muted-foreground">
        Questa impostazione viene applicata automaticamente a ogni nuova edizione creata per questo cliente.
      </p>
      <div className="flex items-center gap-2">
        <select
          value={policy}
          onChange={(e) => setPolicy(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
        >
          {saving ? "..." : "Salva"}
        </button>
      </div>
    </div>
  );
}

export default function AdminClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { confirm: confirmDialog } = useConfirmDialog();
  const { can, canAccess } = usePermissions();
  const [impersonating, setImpersonating] = useState(false);

  const clientQuery = useQuery({
    queryKey: ["admin-client-detail", id],
    queryFn: async () => {
      const res = await fetchWithRetry(`/api/admin/clienti/${id}`);
      if (!res.ok) throw new Error("Errore caricamento cliente");
      const json = await res.json();
      return json.data as ClientDetail;
    },
  });

  const statsQuery = useQuery({
    queryKey: ["admin-client-stats", id],
    queryFn: async () => {
      const [empRes, edRes, certRes] = await Promise.all([
        fetchWithRetry(`/api/dipendenti?clientId=${id}&limit=1`),
        fetchWithRetry(`/api/edizioni?clientId=${id}`),
        fetchWithRetry(`/api/attestati?clientId=${id}&limit=1`),
      ]);

      let employeesCount = 0;
      let certificatesCount = 0;
      const editions: EditionSummary[] = [];

      if (empRes.ok) {
        const empJson = await empRes.json();
        employeesCount = empJson.total ?? (Array.isArray(empJson.data) ? empJson.data.length : 0);
      }
      if (edRes.ok) {
        const edJson = await edRes.json();
        const edData = Array.isArray(edJson) ? edJson : Array.isArray(edJson.data) ? edJson.data : [];
        for (const ed of edData) {
          editions.push({
            id: ed.id,
            editionNumber: ed.editionNumber,
            status: ed.status,
            courseName: ed.course?.title ?? ed.courseName ?? "—",
            startDate: ed.startDate,
            endDate: ed.endDate,
          });
        }
      }
      if (certRes.ok) {
        const certJson = await certRes.json();
        certificatesCount = certJson.total ?? (Array.isArray(certJson.data) ? certJson.data.length : 0);
      }

      return {
        employeesCount,
        editionsCount: editions.length,
        certificatesCount,
        editions,
      } satisfies Stats;
    },
  });

  const client = clientQuery.data;
  const stats = statsQuery.data;

  const handleImpersonate = async () => {
    if (!client?.user?.id) {
      toast.error("Utente cliente non disponibile per l'impersonazione.");
      return;
    }
    try {
      setImpersonating(true);
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientUserId: client.user.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload?.error ?? "Errore durante l'impersonazione");
        return;
      }
      window.location.href = payload?.redirectTo || "/dashboard";
    } finally {
      setImpersonating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!client) return;
    const ok = await confirmDialog({ title: "Reset password", message: `Reimpostare la password di "${client.ragioneSociale}"?`, confirmText: "Reimposta", variant: "danger" });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/clienti/${client.id}/reset-password`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Errore reset password");
      toast.success(`Password reimpostata. Nuova password: ${json.newPassword}`);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  if (!canAccess("clienti")) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Accesso non consentito</p>
      </div>
    );
  }

  if (clientQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clientQuery.error || !client) {
    return (
      <div className="space-y-4">
        <Link href="/admin/clienti" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Torna alla lista
        </Link>
        <ErrorMessage message="Impossibile caricare il cliente." onRetry={() => clientQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/clienti" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Clienti
          </Link>
          <div className="flex items-center gap-3">
            {client.logoPath ? (
              <Image
                src={`/api/storage/clients/${client.logoPath.replace(/\\/g, "/")}`}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="h-12 w-12 rounded-lg border object-contain"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold">{client.ragioneSociale}</h1>
              <p className="text-sm text-muted-foreground">P.IVA {client.piva}</p>
            </div>
            <span className={`ml-2 rounded-full px-2 py-1 text-xs ${client.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {client.isActive ? "Attivo" : "Disattivo"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("clienti", "edit") && (
            <Link
              href={`/admin/clienti/${client.id}/edit`}
              className="inline-flex min-h-[36px] items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <Pencil className="h-4 w-4" /> Modifica
            </Link>
          )}
          {can("clienti", "impersonate") && (
            <button
              type="button"
              onClick={handleImpersonate}
              disabled={!client.user?.id || impersonating}
              className="inline-flex min-h-[36px] items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" /> Accedi come
            </button>
          )}
          {can("clienti", "reset-password") && (
            <button
              type="button"
              onClick={handleResetPassword}
              className="inline-flex min-h-[36px] items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <KeyRound className="h-4 w-4" /> Reset password
            </button>
          )}
        </div>
      </div>

      {/* Info + Stats grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Info card */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Informazioni</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email referente</p>
                <p>{client.referenteEmail}</p>
              </div>
            </div>
            {client.user?.email && client.user.email !== client.referenteEmail ? (
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email accesso portale</p>
                  <p>{client.user.email}</p>
                </div>
              </div>
            ) : null}
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Referente</p>
                <p>{client.referenteNome}</p>
              </div>
            </div>
            {client.telefono ? (
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Telefono</p>
                  <p>{client.telefono}</p>
                </div>
              </div>
            ) : null}
            {client.indirizzo ? (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Indirizzo</p>
                  <p>{client.indirizzo}</p>
                </div>
              </div>
            ) : null}
            {client.categories.length > 0 ? (
              <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Categorie</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {client.categories.map((cat) => (
                      <span key={cat.id} className="rounded-full px-2 py-0.5 text-xs text-white" style={{ backgroundColor: cat.color ?? "#6B7280" }}>
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Stats cards */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-card p-4 text-center">
              <Users className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
              <p className="text-2xl font-semibold">{stats?.employeesCount ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Dipendenti</p>
            </div>
            <div className="rounded-lg border bg-card p-4 text-center">
              <BookOpen className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
              <p className="text-2xl font-semibold">{stats?.editionsCount ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Edizioni</p>
            </div>
            <div className="rounded-lg border bg-card p-4 text-center">
              <Award className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
              <p className="text-2xl font-semibold">{stats?.certificatesCount ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Attestati</p>
            </div>
          </div>

          {/* Editions list */}
          {stats && stats.editions.length > 0 ? (
            <div className="rounded-lg border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Edizioni ({stats.editions.length})
              </h2>
              <div className="space-y-2">
                {stats.editions.slice(0, 10).map((ed) => {
                  const st = STATUS_LABELS[ed.status] ?? STATUS_LABELS.DRAFT;
                  return (
                    <Link
                      key={ed.id}
                      href={`/admin/edizioni`}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition hover:bg-muted/30"
                    >
                      <span>
                        <span className="font-medium">{ed.courseName}</span>
                        <span className="ml-1 text-muted-foreground">#{ed.editionNumber}</span>
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${st.cls}`}>
                        {st.label}
                      </span>
                    </Link>
                  );
                })}
                {stats.editions.length > 10 ? (
                  <p className="text-center text-xs text-muted-foreground">
                    e altre {stats.editions.length - 10} edizioni...
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* Custom Fields */}
        <div className="rounded-lg border bg-card p-5">
          <ClientCustomFieldsConfig
            clientId={client.id}
            canEdit={can("clienti", "manage-custom-fields")}
          />
        </div>

        {/* Default Notify Policy */}
        <div className="rounded-lg border bg-card p-5">
          <DefaultNotifyPolicySection clientId={client.id} />
        </div>

        {/* Users */}
        <div className="rounded-lg border bg-card p-5">
          <ClientUsersSection
            clientId={client.id}
            canManageUsers={can("clienti", "manage-users")}
            canEditLimit={can("clienti", "edit")}
          />
        </div>
      </div>
    </div>
  );
}
