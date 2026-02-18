"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarClock,
  Clock,
  Users,
} from "lucide-react";
import { formatItalianDate } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/Skeleton";

type DashboardResponse = {
  stats: {
    activeEditions: number;
    totalEmployees: number;
    validCertificates: number;
    averageAttendance: number;
  };
  upcomingDeadlines: Array<
    | {
        type: "registry_deadline";
        courseTitle: string;
        editionNumber: number;
        date: string;
        editionId: string;
      }
    | {
        type: "certificate_expiring";
        employeeName: string;
        courseTitle: string;
        date: string;
        certificateId: string;
      }
  >;
  recentEditions: Array<{
    id: string;
    courseTitle: string;
    editionNumber: number;
    startDate?: string | null;
    endDate?: string | null;
    status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
    registrationCount: number;
    deadlineRegistry?: string | null;
  }>;
};

function daysUntil(dateValue: string) {
  const target = new Date(dateValue);
  const diff = target.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch("/api/dashboard/cliente");
  if (!res.ok) {
    throw new Error("Impossibile caricare la dashboard");
  }
  return res.json();
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-52" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`kpi-skeleton-${index}`} className="rounded-lg border bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-5">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-4/5" />
      </div>
      <div className="rounded-lg border bg-card p-5">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="mt-3 h-16 w-full" />
        <Skeleton className="mt-2 h-16 w-full" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["dashboard", "cliente"],
    queryFn: fetchDashboard,
    refetchInterval: 60 * 1000,
  });

  const cards = useMemo(
    () => [
      {
        id: "activeEditions",
        label: "Edizioni attive",
        value: data?.stats.activeEditions ?? 0,
        icon: BookOpen,
        accent: "text-blue-600",
        bg: "bg-blue-50",
      },
      {
        id: "totalEmployees",
        label: "Dipendenti totali",
        value: data?.stats.totalEmployees ?? 0,
        icon: Users,
        accent: "text-emerald-600",
        bg: "bg-emerald-50",
      },
      {
        id: "validCertificates",
        label: "Attestati validi",
        value: data?.stats.validCertificates ?? 0,
        icon: Award,
        accent: "text-amber-600",
        bg: "bg-amber-50",
      },
      {
        id: "averageAttendance",
        label: "Presenza media",
        value: `${data?.stats.averageAttendance ?? 0}%`,
        icon: Clock,
        accent: "text-violet-600",
        bg: "bg-violet-50",
      },
    ],
    [data]
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Errore caricamento dashboard. Riprova tra qualche secondo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Panoramica corsi, scadenze e stato formativo.
          </p>
        </div>
        {isFetching ? (
          <span className="text-xs text-muted-foreground">Aggiornamento...</span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <span className={`rounded-md p-1.5 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.accent}`} />
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold">{card.value}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CalendarClock className="h-4 w-4" />
          Prossime scadenze
        </h2>
        {data.upcomingDeadlines.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nessuna scadenza imminente.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.upcomingDeadlines.map((item, index) => {
              const days = item.date ? daysUntil(item.date) : null;
              if (item.type === "registry_deadline") {
                return (
                  <li
                    key={`deadline-registry-${index}`}
                    className="rounded-md border bg-background/70 p-3 text-sm"
                  >
                    <p className="font-medium">
                      Deadline anagrafiche: {item.courseTitle} (Ed. #{item.editionNumber})
                    </p>
                    <p className="text-muted-foreground">
                      Data: {formatItalianDate(item.date)}{" "}
                      {days !== null ? `(${days >= 0 ? `tra ${days} giorni` : "scaduta"})` : ""}
                    </p>
                  </li>
                );
              }

              return (
                <li
                  key={`deadline-certificate-${index}`}
                  className="rounded-md border bg-background/70 p-3 text-sm"
                >
                  <p className="font-medium">
                    Attestato in scadenza: {item.courseTitle} - {item.employeeName}
                  </p>
                  <p className="text-muted-foreground">
                    Data: {formatItalianDate(item.date)}{" "}
                    {days !== null ? `(${days >= 0 ? `tra ${days} giorni` : "scaduta"})` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Edizioni recenti</h2>
        {data.recentEditions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nessuna edizione disponibile.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {data.recentEditions.map((edition) => {
              const deadlineDays =
                edition.deadlineRegistry ? daysUntil(edition.deadlineRegistry) : null;
              const showDeadlineWarning =
                edition.status === "PUBLISHED" &&
                deadlineDays !== null &&
                deadlineDays >= 0 &&
                deadlineDays <= 7;

              return (
                <div
                  key={edition.id}
                  className="rounded-md border bg-background/70 p-4"
                >
                  <p className="text-sm font-semibold">
                    {edition.courseTitle} - Ed. #{edition.editionNumber}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Periodo: {edition.startDate ? formatItalianDate(edition.startDate) : "-"} -{" "}
                    {edition.endDate ? formatItalianDate(edition.endDate) : "-"} | Dipendenti: {" "}
                    {edition.registrationCount}
                  </p>

                  {showDeadlineWarning && edition.deadlineRegistry ? (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Inserisci le anagrafiche entro il{" "}
                      {formatItalianDate(edition.deadlineRegistry)}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {edition.status === "PUBLISHED" ? (
                      <Link
                        href={`/corsi/${edition.id}`}
                        className="btn-brand-primary inline-flex rounded-md px-3 py-2 text-xs"
                      >
                        Gestisci Anagrafiche
                      </Link>
                    ) : null}
                    <Link
                      href={`/corsi/${edition.id}`}
                      className="btn-brand-outline inline-flex rounded-md px-3 py-2 text-xs"
                    >
                      Vedi Dettaglio
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
