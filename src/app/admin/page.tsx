"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  Building2,
  AlertTriangle,
  Users,
  Plus,
  Layers,
} from "lucide-react";
import StatsCard from "@/components/admin/StatsCard";
import ActivityItem from "@/components/admin/ActivityItem";
import RegistrationItem from "@/components/admin/RegistrationItem";
import { Skeleton } from "@/components/ui/Skeleton";

type AdminStats = {
  totalClients: number;
  activeClients: number;
  totalCourses: number;
  publishedCourses: number;
  totalEditions: number;
  activeEditions: number;
  totalEmployees: number;
  totalCertificates: number;
  pendingRegistrations: number;
  coursesNearDeadline: number;
  expiringCertificates: number;
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
    user: { email: string };
  }>;
  recentRegistrations: Array<{
    id: string;
    updatedAt: string;
    client: { ragioneSociale: string };
    courseEdition?: {
      editionNumber?: number | null;
      course?: { title: string } | null;
    } | null;
    employee: { nome: string; cognome: string };
  }>;
};

async function fetchStats() {
  const res = await fetch("/api/admin/stats");
  if (!res.ok) {
    throw new Error("Failed to fetch admin stats");
  }
  return res.json();
}

export default function AdminPage() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: fetchStats,
    staleTime: 60 * 1000,
  });

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white p-6"
            >
              <Skeleton className="h-5 w-32" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((__, row) => (
                  <Skeleton key={row} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard Admin</h1>
        <p className="text-sm text-muted-foreground">
          Panoramica generale della piattaforma.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/corsi/nuovo"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuovo Corso
        </Link>
        <Link
          href="/admin/clienti/nuovo"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          Nuovo Cliente
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatsCard
          title="Clienti attivi"
          value={stats.activeClients}
          total={stats.totalClients}
          icon={<Building2 className="h-5 w-5" />}
          href="/admin/clienti"
        />
        <StatsCard
          title="Edizioni attive"
          value={stats.activeEditions ?? stats.publishedCourses}
          icon={<BookOpen className="h-5 w-5" />}
          href="/admin/corsi"
        />
        <StatsCard
          title="Totale edizioni"
          value={stats.totalEditions}
          icon={<Layers className="h-5 w-5" />}
          href="/admin/edizioni"
        />
        <StatsCard
          title="Dipendenti totali"
          value={stats.totalEmployees}
          icon={<Users className="h-5 w-5" />}
        />
        <StatsCard
          title="Attestati caricati"
          value={stats.totalCertificates}
          icon={<Award className="h-5 w-5" />}
          href="/admin/attestati"
        />
      </div>

      {stats.pendingRegistrations > 0 ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Ci sono {stats.pendingRegistrations} anagrafiche in attesa di essere
              elaborate.
            </span>
            <Link href="/admin/corsi" className="underline">
              Visualizza
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Attivita recente</h2>
            <Link href="/admin/audit" className="text-sm text-primary">
              Vedi tutto
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna attivita recente.</p>
            ) : (
              stats.recentActivity.map((log) => <ActivityItem key={log.id} log={log} />)
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Ultime iscrizioni</h2>
          <div className="mt-4 space-y-3">
            {stats.recentRegistrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna registrazione.</p>
            ) : (
              stats.recentRegistrations.map((reg) => (
                <RegistrationItem key={reg.id} registration={reg} />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Edizioni con deadline vicina: {stats.coursesNearDeadline}
        </div>
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Attestati in scadenza: {stats.expiringCertificates}
        </div>
      </div>
    </div>
  );
}
