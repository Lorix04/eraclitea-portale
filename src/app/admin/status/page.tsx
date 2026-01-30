"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Database, HardDrive, Mail } from "lucide-react";

type StatusResponse = {
  database: { ok: boolean; latency: number };
  email: { ok: boolean; provider: string };
  storage: { ok: boolean; used: string; total: string };
  api: { ok: boolean; uptime: number };
  metrics: { requestsToday: number; errorsToday: number; avgResponseTime: number };
};

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs ${
        ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
      }`}
    >
      {ok ? "Operativo" : "Problema"}
    </span>
  );
}

export default function StatusPage() {
  const { data: status, isLoading } = useQuery<StatusResponse>({
    queryKey: ["system", "status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    refetchInterval: 30 * 1000,
  });

  if (isLoading || !status) {
    return <p className="text-sm text-muted-foreground">Caricamento stato...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Stato Sistema</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between text-sm font-medium">
            Database
            <Database className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3 space-y-2">
            <StatusBadge ok={status.database.ok} />
            <p className="text-xs text-muted-foreground">
              Latenza: {status.database.latency}ms
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between text-sm font-medium">
            Email
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3 space-y-2">
            <StatusBadge ok={status.email.ok} />
            <p className="text-xs text-muted-foreground">{status.email.provider}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between text-sm font-medium">
            Storage
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3 space-y-2">
            <StatusBadge ok={status.storage.ok} />
            <p className="text-xs text-muted-foreground">
              {status.storage.used} / {status.storage.total}
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between text-sm font-medium">
            API
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3 space-y-2">
            <StatusBadge ok={status.api.ok} />
            <p className="text-xs text-muted-foreground">
              Uptime: {Math.round(status.api.uptime)}s
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Metriche Recenti</h2>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{status.metrics.requestsToday}</p>
            <p className="text-sm text-muted-foreground">Richieste oggi</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{status.metrics.errorsToday}</p>
            <p className="text-sm text-muted-foreground">Errori oggi</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{status.metrics.avgResponseTime}ms</p>
            <p className="text-sm text-muted-foreground">
              Tempo risposta medio
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
