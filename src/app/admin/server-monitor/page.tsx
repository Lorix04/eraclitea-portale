"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  FileText,
  HardDrive,
  LayoutDashboard,
  Lock,
  Mail,
  Monitor,
  RefreshCw,
  Server,
  Shield,
  Unlock,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type ServerData = {
  _error?: string;
  _stale?: boolean;
  _age_seconds?: number;
  timestamp?: string;
  uptime?: string;
  kernel?: string;
  cpu?: { load1: number; load5: number; load15: number; cores: number };
  memory?: { total_mb: number; used_mb: number; free_mb: number };
  disk?: { total: string; used: string; free: string; percent: string };
  docker?: {
    app: { status: string; health: string; started_at: string };
    db: { status: string; health: string; started_at: string };
  };
  ssl?: { expiry: string; days_left: number; last_renewal: string };
  fail2ban?: {
    sshd: { currently_banned: number; total_banned: number };
    nginx: { currently_banned: number; total_banned: number };
  };
  ssh?: {
    failed_24h: number;
    top_attackers: { ip: string; count: number }[];
    last_failed: { time: string; ip: string }[];
  };
  backups?: {
    count: number;
    latest_date: string;
    latest_size: string;
    list: { file: string; size: string; date: string }[];
  };
  cron?: Record<string, string>;
  storage?: { total: string; detail: { dir: string; size: string }[] };
  nginx_version?: string;
  firewall?: string;
  response_time?: string;
};

type AppData = {
  _error?: string;
  email?: {
    sent_today: number;
    in_queue: number;
    failed_today: number;
    last_success: { sentAt: string; recipientEmail: string } | null;
    last_fail: { sentAt: string; errorMessage: string | null } | null;
  };
  accounts?: {
    locked: number;
    locked_list: {
      id: string;
      name: string | null;
      email: string;
      role: string;
      failedLoginAttempts: number;
      lockedUntil: string | null;
      lastLoginAt: string | null;
    }[];
    admins_suspended: number;
  };
  sessions?: { admin: number; client: number; teacher: number; total: number };
  cv_dpr445?: Record<string, number>;
  integrity?: { teachers_with_issues: number };
  records?: Record<string, number>;
  admin_logins?: { createdAt: string; ipAddress: string | null; user: { name: string | null; email: string } }[];
};

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "yellow" | "red" | "gray" | "blue" }) {
  const cls = {
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-600",
    blue: "bg-blue-100 text-blue-700",
  }[color];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const c = color || (pct < 70 ? "bg-emerald-500" : pct < 90 ? "bg-amber-500" : "bg-red-500");
  return (
    <div className="h-2 w-full rounded-full bg-gray-200">
      <div className={`h-2 rounded-full transition-all ${c}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Card({ title, icon: Icon, children, border }: { title: string; icon: any; children: React.ReactNode; border?: string }) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${border || ""}`}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </h3>
      {children}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function fmtDt(d: string | null | undefined) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ServerMonitorPage() {
  const [data, setData] = useState<{ server: ServerData; app: AppData } | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [lockedOpen, setLockedOpen] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const { confirm } = useConfirmDialog();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/server-monitor");
      if (res.ok) {
        setData(await res.json());
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { fetchData(); return 60; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const s = data?.server;
  const a = data?.app;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const cpuPct = s?.cpu ? Math.round((s.cpu.load1 / s.cpu.cores) * 100) : 0;
  const ramPct = s?.memory ? Math.round((s.memory.used_mb / s.memory.total_mb) * 100) : 0;
  const diskPct = s?.disk ? parseInt(s.disk.percent) || 0 : 0;
  const respMs = s?.response_time && s.response_time !== "N/A" ? Math.round(parseFloat(s.response_time) * 1000) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Monitor className="h-5 w-5 text-primary" /> Server Monitor
          </h1>
          <p className="text-sm text-muted-foreground">
            {s?.timestamp ? `Dati del ${fmtDt(s.timestamp)}` : "In attesa di dati..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Aggiornamento tra {countdown}s
          </span>
          <button
            onClick={() => { fetchData(); setCountdown(60); }}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Aggiorna
          </button>
        </div>
      </div>

      {/* Stale warning */}
      {s?._stale && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertTriangle className="mr-1 inline h-4 w-4" />
          I dati del server non sono aggiornati da {Math.round((s._age_seconds || 0) / 60)} minuti. Lo script cron potrebbe non funzionare.
        </div>
      )}
      {s?._error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="mr-1 inline h-4 w-4" />
          {s._error}
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-gray-200">
        <div
          className="h-1 rounded-full bg-primary transition-all"
          style={{ width: `${((60 - countdown) / 60) * 100}%` }}
        />
      </div>

      {/* Section 1: Server */}
      {!s?._error && (
        <>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Server className="h-4 w-4" /> Server
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Services */}
            <Card title="Servizi" icon={Activity} border={s?.docker?.app?.status === "running" && s?.docker?.db?.status === "running" ? "border-emerald-200" : "border-red-300"}>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Docker App</span>
                  <Badge color={s?.docker?.app?.status === "running" ? "green" : "red"}>
                    {s?.docker?.app?.status || "unknown"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Docker DB</span>
                  <Badge color={s?.docker?.db?.status === "running" ? "green" : "red"}>
                    {s?.docker?.db?.status || "unknown"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Nginx</span>
                  <span className="text-xs text-muted-foreground">{s?.nginx_version || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Firewall</span>
                  <Badge color={s?.firewall === "active" ? "green" : "red"}>{s?.firewall || "N/A"}</Badge>
                </div>
                <div className="border-t pt-2 text-xs text-muted-foreground">
                  {s?.uptime} | {s?.kernel}
                </div>
              </div>
            </Card>

            {/* Resources */}
            <Card title="Risorse" icon={HardDrive}>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>CPU</span>
                    <span>{s?.cpu?.load1 ?? 0} / {s?.cpu?.cores ?? 1} cores ({cpuPct}%)</span>
                  </div>
                  <ProgressBar value={cpuPct} max={100} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>RAM</span>
                    <span>{s?.memory?.used_mb ?? 0} / {s?.memory?.total_mb ?? 0} MB ({ramPct}%)</span>
                  </div>
                  <ProgressBar value={ramPct} max={100} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>Disco</span>
                    <span>{s?.disk?.used ?? "?"} / {s?.disk?.total ?? "?"} ({diskPct}%)</span>
                  </div>
                  <ProgressBar value={diskPct} max={100} />
                </div>
                {respMs !== null && (
                  <div className="flex items-center justify-between border-t pt-2 text-xs">
                    <span>Risposta sito</span>
                    <Badge color={respMs < 500 ? "green" : respMs < 1000 ? "yellow" : "red"}>{respMs}ms</Badge>
                  </div>
                )}
              </div>
            </Card>

            {/* Security */}
            <Card title="Sicurezza" icon={Shield} border={(s?.fail2ban?.sshd?.currently_banned || 0) > 0 ? "border-red-200" : ""}>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Fail2ban SSH</span>
                  <span>{s?.fail2ban?.sshd?.currently_banned ?? 0} bannati ({s?.fail2ban?.sshd?.total_banned ?? 0} totali)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fail2ban Nginx</span>
                  <span>{s?.fail2ban?.nginx?.currently_banned ?? 0} bannati</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tentativi SSH</span>
                  <Badge color={(s?.ssh?.failed_24h ?? 0) < 10 ? "green" : (s?.ssh?.failed_24h ?? 0) < 50 ? "yellow" : "red"}>
                    {s?.ssh?.failed_24h ?? 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>SSL</span>
                  <Badge color={(s?.ssl?.days_left ?? 0) > 30 ? "green" : (s?.ssl?.days_left ?? 0) > 7 ? "yellow" : "red"}>
                    {(s?.ssl?.days_left ?? -1) >= 0 ? `${s?.ssl?.days_left} giorni` : "N/A"}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Backups */}
            <Card title="Backup" icon={Database} border={s?.backups?.latest_date === "mai" ? "border-red-300" : ""}>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Ultimo backup</span>
                  <span className="text-xs">{s?.backups?.latest_date ?? "mai"} ({s?.backups?.latest_size ?? "?"})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Totale</span>
                  <span>{s?.backups?.count ?? 0} backup</span>
                </div>
                {(s?.backups?.list?.length ?? 0) > 0 && (
                  <div className="max-h-24 overflow-y-auto border-t pt-2">
                    {s!.backups!.list.map((b, i) => (
                      <div key={i} className="flex justify-between text-[10px] text-muted-foreground">
                        <span className="truncate">{b.file.split("/").pop()}</span>
                        <span>{b.size}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Cron */}
            <Card title="Cron Jobs" icon={Clock}>
              <div className="space-y-2 text-sm">
                {Object.entries(s?.cron ?? {}).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs">{key.replace(/_/g, " ")}</span>
                    <span className="text-[10px] text-muted-foreground">{val}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Storage */}
            <Card title="Spazio Upload" icon={HardDrive}>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between font-medium">
                  <span>Totale</span>
                  <span>{s?.storage?.total ?? "N/A"}</span>
                </div>
                {(s?.storage?.detail?.length ?? 0) > 0 && (
                  <div className="space-y-1 border-t pt-2">
                    {s!.storage!.detail.map((d, i) => (
                      <div key={i} className="flex justify-between text-xs text-muted-foreground">
                        <span className="truncate">{d.dir.split("/").pop()}</span>
                        <span>{d.size}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Section 2: Application */}
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <LayoutDashboard className="h-4 w-4" /> Applicazione
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Email */}
        <Card title="Email" icon={Mail} border={(a?.email?.failed_today ?? 0) > 0 ? "border-red-200" : ""}>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Inviate oggi</span>
              <Badge color="green">{a?.email?.sent_today ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>In coda</span>
              <Badge color={(a?.email?.in_queue ?? 0) > 0 ? "yellow" : "gray"}>{a?.email?.in_queue ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Fallite oggi</span>
              <Badge color={(a?.email?.failed_today ?? 0) > 0 ? "red" : "gray"}>{a?.email?.failed_today ?? 0}</Badge>
            </div>
            {a?.email?.last_success && (
              <div className="border-t pt-2 text-[10px] text-muted-foreground">
                Ultimo invio: {fmtDt(a.email.last_success.sentAt)}
              </div>
            )}
            {a?.email?.last_fail && (
              <div className="text-[10px] text-red-600">
                Ultimo errore: {a.email.last_fail.errorMessage?.slice(0, 80) ?? ""}
              </div>
            )}
          </div>
        </Card>

        {/* Accounts */}
        <Card title="Account e Sessioni" icon={Users}>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Sessioni attive</span>
              <span className="font-semibold">{a?.sessions?.total ?? 0}</span>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>{a?.sessions?.admin ?? 0} admin</span>
              <span>{a?.sessions?.client ?? 0} client</span>
              <span>{a?.sessions?.teacher ?? 0} docenti</span>
            </div>
            <div className="border-t pt-2">
              <button
                type="button"
                onClick={() => setLockedOpen((v) => !v)}
                className="flex w-full items-center justify-between hover:text-primary"
              >
                <span>Account bloccati</span>
                <div className="flex items-center gap-1">
                  <Badge color={(a?.accounts?.locked ?? 0) > 0 ? "red" : "green"}>{a?.accounts?.locked ?? 0}</Badge>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${lockedOpen ? "rotate-180" : ""}`} />
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${lockedOpen ? "mt-2 max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                {(a?.accounts?.locked ?? 0) === 0 ? (
                  <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Nessun account bloccato
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium">Utente</th>
                          <th className="px-2 py-1.5 text-left font-medium">Ruolo</th>
                          <th className="px-2 py-1.5 text-left font-medium">Tentativi</th>
                          <th className="px-2 py-1.5 text-left font-medium">Bloccato fino a</th>
                          <th className="px-2 py-1.5 text-right font-medium">Azione</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {a!.accounts!.locked_list.map((u) => {
                          const roleBadge: Record<string, string> = {
                            ADMIN: "bg-purple-100 text-purple-700",
                            CLIENT: "bg-blue-100 text-blue-700",
                            TEACHER: "bg-emerald-100 text-emerald-700",
                          };
                          const expired = u.lockedUntil && new Date(u.lockedUntil) < new Date();
                          return (
                            <tr key={u.id}>
                              <td className="px-2 py-1.5">
                                <div>{u.name || "\u2014"}</div>
                                <div className="text-[10px] text-muted-foreground">{u.email}</div>
                              </td>
                              <td className="px-2 py-1.5">
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${roleBadge[u.role] || "bg-gray-100"}`}>{u.role}</span>
                              </td>
                              <td className="px-2 py-1.5 text-center">{u.failedLoginAttempts}</td>
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                {expired ? (
                                  <span className="text-amber-600">Scaduto</span>
                                ) : (
                                  fmtDt(u.lockedUntil)
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                <button
                                  disabled={unlocking === u.id}
                                  onClick={async () => {
                                    const ok = await confirm({
                                      title: "Sblocca account",
                                      message: `Sbloccare l'account di ${u.name || u.email}? L'utente potra tentare nuovamente il login.`,
                                      confirmText: "Sblocca",
                                    });
                                    if (!ok) return;
                                    setUnlocking(u.id);
                                    try {
                                      const res = await fetch("/api/admin/server-monitor/unlock", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ userId: u.id }),
                                      });
                                      if (res.ok) {
                                        toast.success(`Account di ${u.name || u.email} sbloccato`);
                                        fetchData();
                                      } else {
                                        const json = await res.json().catch(() => ({}));
                                        toast.error(json.error || "Errore sblocco");
                                      }
                                    } catch {
                                      toast.error("Errore di rete");
                                    } finally {
                                      setUnlocking(null);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  <Unlock className="h-3 w-3" /> Sblocca
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Admin sospesi</span>
              <Badge color={(a?.accounts?.admins_suspended ?? 0) > 0 ? "red" : "green"}>{a?.accounts?.admins_suspended ?? 0}</Badge>
            </div>
          </div>
        </Card>

        {/* Records */}
        <Card title="Conteggi" icon={Database}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Utenti" value={a?.records?.users ?? 0} icon={Users} />
            <Stat label="Clienti" value={a?.records?.clients ?? 0} icon={Briefcase} />
            <Stat label="Dipendenti" value={a?.records?.employees ?? 0} icon={Users} />
            <Stat label="Docenti" value={a?.records?.teachers ?? 0} icon={Users} />
            <Stat label="Corsi" value={a?.records?.courses ?? 0} icon={FileText} />
            <Stat label="Edizioni" value={a?.records?.editions ?? 0} icon={FileText} />
            <Stat label="Ticket" value={`${a?.records?.tickets ?? 0}`} icon={Mail} />
            <Stat label="Ticket aperti" value={a?.records?.tickets_open ?? 0} icon={AlertTriangle} />
          </div>
        </Card>
      </div>

      {/* Section 3: Business */}
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Briefcase className="h-4 w-4" /> Business
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {/* CV DPR 445 */}
        <Card title="CV DPR 445" icon={FileText}>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "not_requested", label: "Non richiesti", color: "gray" as const },
              { key: "requested", label: "Richiesti", color: "blue" as const },
              { key: "submitted", label: "Inviati", color: "yellow" as const },
              { key: "approved", label: "Approvati", color: "green" as const },
              { key: "rejected", label: "Rifiutati", color: "red" as const },
            ].map((s) => (
              <Badge key={s.key} color={s.color}>
                {s.label}: {a?.cv_dpr445?.[s.key] ?? 0}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Integrity */}
        <Card title="Integrita Docenti" icon={AlertTriangle} border={(a?.integrity?.teachers_with_issues ?? 0) > 0 ? "border-red-200" : ""}>
          {(a?.integrity?.teachers_with_issues ?? 0) > 0 ? (
            <Badge color="red">{a!.integrity!.teachers_with_issues} docenti con problemi</Badge>
          ) : (
            <Badge color="green">Nessun problema rilevato</Badge>
          )}
        </Card>
      </div>

      {/* Section 4: Security detail (collapsible) */}
      <details className="rounded-lg border">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted/30">
          <Shield className="h-4 w-4" /> Dettaglio Sicurezza
        </summary>
        <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Top attackers */}
          <Card title="Top IP Attaccanti" icon={Lock}>
            <div className="max-h-48 overflow-y-auto">
              {(s?.ssh?.top_attackers?.length ?? 0) > 0 ? (
                <table className="w-full text-xs">
                  <thead><tr className="text-muted-foreground"><th className="pb-1 text-left">#</th><th className="pb-1 text-left">IP</th><th className="pb-1 text-right">Tentativi</th></tr></thead>
                  <tbody>
                    {s!.ssh!.top_attackers.map((a, i) => (
                      <tr key={i} className="border-t"><td>{i + 1}</td><td className="font-mono">{a.ip}</td><td className="text-right">{a.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-muted-foreground">Nessun dato</p>
              )}
            </div>
          </Card>

          {/* Last failed SSH */}
          <Card title="Ultimi SSH Falliti" icon={XCircle}>
            <div className="max-h-48 overflow-y-auto">
              {(s?.ssh?.last_failed?.length ?? 0) > 0 ? (
                <table className="w-full text-xs">
                  <thead><tr className="text-muted-foreground"><th className="pb-1 text-left">Ora</th><th className="pb-1 text-left">IP</th></tr></thead>
                  <tbody>
                    {s!.ssh!.last_failed.map((f, i) => (
                      <tr key={i} className="border-t"><td>{f.time}</td><td className="font-mono">{f.ip}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-muted-foreground">Nessun dato</p>
              )}
            </div>
          </Card>

          {/* Admin logins */}
          <Card title="Ultimi Login Admin" icon={Users}>
            <div className="max-h-48 overflow-y-auto">
              {(a?.admin_logins?.length ?? 0) > 0 ? (
                <table className="w-full text-xs">
                  <thead><tr className="text-muted-foreground"><th className="pb-1 text-left">Ora</th><th className="pb-1 text-left">Email</th><th className="pb-1 text-left">IP</th></tr></thead>
                  <tbody>
                    {a!.admin_logins!.map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="whitespace-nowrap">{fmtDt(l.createdAt)}</td>
                        <td className="truncate max-w-[120px]">{l.user.name || l.user.email}</td>
                        <td className="font-mono">{l.ipAddress || "\u2014"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-muted-foreground">Nessun dato</p>
              )}
            </div>
          </Card>
        </div>
      </details>
    </div>
  );
}
