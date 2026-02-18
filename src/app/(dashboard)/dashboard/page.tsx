"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Bell,
  BookOpen,
  CalendarClock,
  ChevronRight,
  LifeBuoy,
  Loader2,
  Users,
} from "lucide-react";
import { formatItalianDate } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/Skeleton";

type DashboardStatsResponse = {
  clientName: string;
  stats: {
    activeCourses: number;
    employees: number;
    certificates: number;
    openTickets: number;
  };
  upcomingEditions: Array<{
    id: string;
    courseTitle: string;
    startDate?: string | null;
    endDate?: string | null;
    deadlineRegistry?: string | null;
    registrationCount: number;
    registryStatus: "SENT" | "PENDING";
  }>;
  recentNotifications: Array<{
    id: string;
    type: string;
    title: string;
    message?: string | null;
    createdAt: string;
    courseEditionId?: string | null;
    ticketId?: string | null;
  }>;
};

async function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  const response = await fetch("/api/dashboard/client-stats");
  if (!response.ok) {
    throw new Error("Impossibile caricare i dati dashboard");
  }
  return response.json();
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const diff = date.getTime() - Date.now();
  const minutes = Math.round(diff / 60000);
  const hours = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);
  const rtf = new Intl.RelativeTimeFormat("it", { numeric: "auto" });

  if (Math.abs(days) >= 1) return rtf.format(days, "day");
  if (Math.abs(hours) >= 1) return rtf.format(hours, "hour");
  if (Math.abs(minutes) < 1) return "adesso";
  return rtf.format(minutes, "minute");
}

function daysUntil(dateValue?: string | null) {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  const diff = target.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function deadlineBadgeClass(days: number | null) {
  if (days === null) return "bg-gray-100 text-gray-600";
  if (days < 0) return "bg-red-100 text-red-700";
  if (days <= 3) return "bg-red-100 text-red-700";
  if (days <= 7) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function notificationLink(notification: DashboardStatsResponse["recentNotifications"][number]) {
  if (notification.ticketId) {
    return `/supporto/${notification.ticketId}`;
  }
  if (notification.courseEditionId) {
    return `/corsi/${notification.courseEditionId}`;
  }
  if (
    notification.type === "CERTIFICATES_AVAILABLE" ||
    notification.type === "CERTIFICATE_EXPIRING_60D" ||
    notification.type === "CERTIFICATE_EXPIRING_30D"
  ) {
    return "/attestati";
  }
  return "/notifiche";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`kpi-${index}`} className="rounded-lg border bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
            <Skeleton className="mt-4 h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 xl:col-span-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-3 h-14 w-full" />
          <Skeleton className="mt-2 h-14 w-full" />
        </div>
        <div className="rounded-lg border bg-card p-5">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-3 h-12 w-full" />
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ClientDashboardPage() {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["dashboard", "client-stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: 60_000,
  });

  const kpis = useMemo(
    () => [
      {
        id: "activeCourses",
        label: "Corsi Attivi",
        value: data?.stats.activeCourses ?? 0,
        icon: BookOpen,
        iconClass: "text-blue-600",
        iconBg: "bg-blue-50",
        href: "/corsi",
      },
      {
        id: "employees",
        label: "Dipendenti",
        value: data?.stats.employees ?? 0,
        icon: Users,
        iconClass: "text-emerald-600",
        iconBg: "bg-emerald-50",
        href: "/dipendenti",
      },
      {
        id: "certificates",
        label: "Attestati",
        value: data?.stats.certificates ?? 0,
        icon: Award,
        iconClass: "text-amber-600",
        iconBg: "bg-amber-50",
        href: "/attestati",
      },
      {
        id: "openTickets",
        label: "Ticket Aperti",
        value: data?.stats.openTickets ?? 0,
        icon: LifeBuoy,
        iconClass: "text-violet-600",
        iconBg: "bg-violet-50",
        href: "/supporto",
      },
    ],
    [data]
  );

  const firstEditionToFill = useMemo(() => {
    if (!data) return null;
    return (
      data.upcomingEditions.find((edition) => edition.registryStatus === "PENDING")
        ?.id ?? null
    );
  }, [data]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Si e verificato un errore nel caricamento della dashboard. Riprova tra
        qualche secondo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Benvenuto, {data.clientName}</h1>
          <p className="text-sm text-muted-foreground">
            Ecco il riepilogo della tua attivita formativa.
          </p>
        </div>
        {isFetching ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Aggiornamento...
          </span>
        ) : null}
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <span className={`rounded-md p-1.5 ${kpi.iconBg}`}>
                  <Icon className={`h-4 w-4 ${kpi.iconClass}`} />
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold">{kpi.value}</p>
              <Link
                href={kpi.href}
                className="link-brand mt-4 inline-flex items-center gap-1 text-xs font-medium"
              >
                Vedi tutti <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-lg border bg-card p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <CalendarClock className="h-4 w-4" />
              Prossime Scadenze / Edizioni Attive
            </h2>
            <Link href="/corsi" className="link-brand text-xs font-medium">
              Vedi tutti i corsi -&gt;
            </Link>
          </div>

          {data.upcomingEditions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nessuna edizione attiva al momento.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.upcomingEditions.map((edition) => {
                const days = daysUntil(edition.deadlineRegistry);
                const deadlineClass = deadlineBadgeClass(days);
                return (
                  <div key={edition.id} className="rounded-md border bg-background/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{edition.courseTitle}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {edition.startDate ? formatItalianDate(edition.startDate) : "-"} -{" "}
                          {edition.endDate ? formatItalianDate(edition.endDate) : "-"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          edition.registryStatus === "SENT"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {edition.registryStatus === "SENT"
                          ? "Anagrafiche inviate"
                          : "Anagrafiche da compilare"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        Dipendenti registrati: {edition.registrationCount}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${deadlineClass}`}>
                        Deadline:{" "}
                        {edition.deadlineRegistry
                          ? `${formatItalianDate(edition.deadlineRegistry)}${
                              days !== null
                                ? days >= 0
                                  ? ` (tra ${days} gg)`
                                  : " (scaduta)"
                                : ""
                            }`
                          : "-"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Bell className="h-4 w-4" />
              Notifiche Recenti
            </h2>
            <Link href="/notifiche" className="link-brand text-xs font-medium">
              Vedi tutte -&gt;
            </Link>
          </div>

          {data.recentNotifications.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nessuna notifica non letta.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {data.recentNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notificationLink(notification)}
                  className="block rounded-md border bg-background/70 p-3 transition hover:bg-muted/40"
                >
                  <p className="text-sm font-medium">{notification.title}</p>
                  {notification.message ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                  ) : null}
                  <p
                    className="mt-2 text-[11px] text-muted-foreground"
                    title={new Date(notification.createdAt).toLocaleString("it-IT")}
                  >
                    {formatRelativeDate(notification.createdAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Azioni Rapide</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={firstEditionToFill ? `/corsi/${firstEditionToFill}` : "/corsi"}
            className="btn-brand-primary inline-flex min-h-[44px] items-center rounded-md px-4 py-2 text-sm"
          >
            Compila anagrafiche
          </Link>
          <Link
            href="/corsi"
            className="inline-flex min-h-[44px] items-center rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            Vai ai corsi
          </Link>
          <Link
            href="/supporto"
            className="inline-flex min-h-[44px] items-center rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            Apri ticket supporto
          </Link>
        </div>
      </section>
    </div>
  );
}
