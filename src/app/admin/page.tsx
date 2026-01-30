"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen, Building2, AlertTriangle, Users } from "lucide-react";
import StatsCard from "@/components/admin/StatsCard";
import ActivityItem from "@/components/admin/ActivityItem";
import RegistrationItem from "@/components/admin/RegistrationItem";

type AdminStats = {
  totalClients: number;
  activeClients: number;
  totalCourses: number;
  publishedCourses: number;
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
    course: { title: string };
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
    return <p className="text-sm text-muted-foreground">Caricamento dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard Admin</h1>
        <p className="text-sm text-muted-foreground">
          Panoramica generale della piattaforma.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Clienti attivi"
          value={stats.activeClients}
          total={stats.totalClients}
          icon={<Building2 className="h-5 w-5" />}
          href="/admin/clienti"
        />
        <StatsCard
          title="Corsi pubblicati"
          value={stats.publishedCourses}
          total={stats.totalCourses}
          icon={<BookOpen className="h-5 w-5" />}
          href="/admin/corsi"
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
          Corsi con deadline vicina: {stats.coursesNearDeadline}
        </div>
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Attestati in scadenza: {stats.expiringCertificates}
        </div>
      </div>
    </div>
  );
}
