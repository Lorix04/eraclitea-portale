"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getArrayData } from "@/lib/api-response";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import TableSkeleton from "@/components/ui/TableSkeleton";
import CardSkeleton from "@/components/ui/CardSkeleton";
import ErrorMessage from "@/components/ui/ErrorMessage";

type EmailLogItem = {
  id: string;
  recipientEmail: string;
  recipientName: string | null;
  recipientId: string | null;
  emailType: string;
  label: string;
  subject: string;
  courseEditionId: string | null;
  status: "SENT" | "FAILED" | "PENDING" | string;
  errorMessage: string | null;
  sentAt: string;
  sensitive: boolean;
  retryable: boolean;
  retryCount: number;
  lastRetryAt: string | null;
  retryStatus: string | null;
};

type EmailLogResponse = {
  data: EmailLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type QueueStatus = {
  active: boolean;
  pending: number;
  sent: number;
  failed: number;
  total: number;
  estimatedRemainingSeconds: number;
};

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isRetryCandidate(row: EmailLogItem) {
  return row.status === "FAILED" && row.retryable;
}

export default function EmailLogPage() {
  const [rows, setRows] = useState<EmailLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [retryStatusFilter, setRetryStatusFilter] = useState("");
  const [retryableFilter, setRetryableFilter] = useState("");
  const [sensitiveFilter, setSensitiveFilter] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (retryStatusFilter) params.set("retryStatus", retryStatusFilter);
    if (retryableFilter) params.set("retryable", retryableFilter);
    if (sensitiveFilter) params.set("sensitive", sensitiveFilter);
    if (search.trim()) params.set("search", search.trim());
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    return params.toString();
  }, [
    fromDate,
    limit,
    page,
    retryStatusFilter,
    retryableFilter,
    search,
    sensitiveFilter,
    statusFilter,
    toDate,
    typeFilter,
  ]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(`/api/admin/email-log?${query}`, {
        cache: "no-store",
      });
      const payload = (await res.json()) as EmailLogResponse | { error?: string };
      if (!res.ok) {
        setError((payload as { error?: string }).error || "Errore caricamento log");
        setRows([]);
        return;
      }
      const data = payload as EmailLogResponse;
      setRows(getArrayData<EmailLogItem>(data));
      setTotal(typeof data.total === "number" ? data.total : 0);
      setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 1);
      setLimit(typeof data.limit === "number" ? data.limit : 20);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Errore caricamento log"
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const fetchQueueStatus = useCallback(async () => {
    try {
      const res = await fetchWithRetry("/api/admin/smtp/queue-status", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as QueueStatus;
      setQueueStatus(data);
    } catch {
      // ignore transient errors on polling
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    void fetchQueueStatus();
  }, [fetchQueueStatus]);

  useEffect(() => {
    const timer = setInterval(() => {
      void fetchQueueStatus();
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchQueueStatus]);

  useEffect(() => {
    const visibleRetryable = new Set(
      rows.filter(isRetryCandidate).map((row) => row.id)
    );
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visibleRetryable.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [rows]);

  const uniqueTypes = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.emailType))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const retryableRowsOnPage = useMemo(
    () => rows.filter(isRetryCandidate),
    [rows]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allVisibleSelected =
        retryableRowsOnPage.length > 0 &&
        retryableRowsOnPage.every((row) => prev.has(row.id));
      if (allVisibleSelected) {
        const next = new Set(prev);
        retryableRowsOnPage.forEach((row) => next.delete(row.id));
        return next;
      }
      const next = new Set(prev);
      retryableRowsOnPage.forEach((row) => next.add(row.id));
      return next;
    });
  };

  const handleRetrySingle = async (row: EmailLogItem) => {
    if (!isRetryCandidate(row)) return;
    setActionLoading(`retry:${row.id}`);
    try {
      const res = await fetch(`/api/admin/smtp/retry/${row.id}`, {
        method: "POST",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        toast.error(payload?.error || "Retry non riuscito");
        return;
      }
      toast.success(
        payload?.action === "regenerated"
          ? "Nuove credenziali generate e inviate"
          : "Email reinviata con successo"
      );
      await Promise.all([fetchLogs(), fetchQueueStatus()]);
    } catch {
      toast.error("Errore durante il retry");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryBulk = async (emailIds?: string[]) => {
    setActionLoading("retry-bulk");
    try {
      const res = await fetch("/api/admin/smtp/retry-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailIds && emailIds.length > 0 ? { emailIds } : {}),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload?.error || "Retry massivo non riuscito");
        return;
      }

      const queued = Number(payload?.queued || 0);
      const sensitive = Number(payload?.sensitive || 0);
      const skipped = Number(payload?.skipped || 0);
      toast.success(
        `In coda: ${queued} · Sensibili: ${sensitive} · Skipped: ${skipped}`
      );

      if (sensitive > 0) {
        toast.warning(
          `${sensitive} email sensibili richiedono rigenerazione singola`
        );
      }

      setSelectedIds(new Set());
      await Promise.all([fetchLogs(), fetchQueueStatus()]);
    } catch {
      toast.error("Errore durante il retry massivo");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAbortQueue = async () => {
    setActionLoading("abort-queue");
    try {
      const res = await fetch("/api/admin/smtp/queue-abort", {
        method: "POST",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload?.error || "Interruzione coda non riuscita");
        return;
      }
      toast.success("Coda interrotta");
      await Promise.all([fetchLogs(), fetchQueueStatus()]);
    } catch {
      toast.error("Errore durante l'interruzione della coda");
    } finally {
      setActionLoading(null);
    }
  };

  const allVisibleSelected =
    retryableRowsOnPage.length > 0 &&
    retryableRowsOnPage.every((row) => selectedIds.has(row.id));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/admin/smtp"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {"<-"} Configurazione SMTP
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Log Email Inviate</h1>
          <p className="text-sm text-muted-foreground">
            Tracciamento invii automatici, retry manuale e stato coda.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" />
          Filtri
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-8">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Tutti i tipi</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Tutti gli stati</option>
            <option value="SENT">SENT</option>
            <option value="FAILED">FAILED</option>
            <option value="PENDING">PENDING</option>
          </select>

          <select
            value={retryableFilter}
            onChange={(e) => {
              setRetryableFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Retryable: tutti</option>
            <option value="true">Retryable: sì</option>
            <option value="false">Retryable: no</option>
          </select>

          <select
            value={sensitiveFilter}
            onChange={(e) => {
              setSensitiveFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Sensibili: tutte</option>
            <option value="true">Sensibili: sì</option>
            <option value="false">Sensibili: no</option>
          </select>

          <select
            value={retryStatusFilter}
            onChange={(e) => {
              setRetryStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Retry status: tutti</option>
            <option value="pending">pending</option>
            <option value="retrying">retrying</option>
            <option value="success">success</option>
            <option value="abandoned">abandoned</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cerca destinatario o oggetto"
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => void handleRetryBulk(Array.from(selectedIds))}
            disabled={selectedIds.size === 0 || actionLoading !== null}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs disabled:opacity-50 md:gap-2 md:px-3 md:py-2 md:text-sm"
          >
            {actionLoading === "retry-bulk" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin md:h-4 md:w-4" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5 md:h-4 md:w-4" />
            )}
            Retry selezionate ({selectedIds.size})
          </button>
          <button
            type="button"
            onClick={() => void handleRetryBulk()}
            disabled={actionLoading !== null}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs disabled:opacity-50 md:gap-2 md:px-3 md:py-2 md:text-sm"
          >
            <PlayCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
            Retry tutte ritentabili
          </button>
          <button
            type="button"
            onClick={() => void handleAbortQueue()}
            disabled={actionLoading !== null || !queueStatus?.active}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          >
            {actionLoading === "abort-queue" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PauseCircle className="h-4 w-4" />
            )}
            Interrompi coda
          </button>
        </div>

        {queueStatus ? (
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-6">
            <div className="rounded-md border bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-500">Stato coda</span>
              <p className="font-medium">
                {queueStatus.active ? "Attiva" : "Inattiva"}
              </p>
            </div>
            <div className="rounded-md border bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-500">Pending</span>
              <p className="font-medium">{queueStatus.pending}</p>
            </div>
            <div className="rounded-md border bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-500">Sent</span>
              <p className="font-medium">{queueStatus.sent}</p>
            </div>
            <div className="rounded-md border bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-500">Failed</span>
              <p className="font-medium">{queueStatus.failed}</p>
            </div>
            <div className="rounded-md border bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-500">Totale</span>
              <p className="font-medium">{queueStatus.total}</p>
            </div>
            <div className="rounded-md border bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-500">Tempo stimato</span>
              <p className="font-medium">
                {queueStatus.estimatedRemainingSeconds}s
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <CardSkeleton key={`queue-skeleton-${index}`} />
            ))}
          </div>
        )}
      </div>

      {error ? <ErrorMessage message={error} onRetry={() => void fetchLogs()} /> : null}

      {loading ? (
        <TableSkeleton rows={8} columns={11} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Seleziona tutte le righe ritentabili visibili"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Destinatario
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Oggetto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Stato
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Sensibile
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Ritentabile
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Retry
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Dettagli
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-gray-400">
                    Nessun log email trovato.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const expanded = expandedId === row.id;
                  const isCandidate = isRetryCandidate(row);
                  const isRowActionLoading = actionLoading === `retry:${row.id}`;

                  return (
                    <Fragment key={row.id}>
                      <tr key={row.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleSelect(row.id)}
                            disabled={!isCandidate}
                            aria-label={`Seleziona ${row.subject}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDateTime(row.sentAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{row.label}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {row.recipientEmail}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {row.subject.length > 44
                            ? `${row.subject.slice(0, 44)}...`
                            : row.subject}
                        </td>
                        <td className="px-4 py-3">
                          {row.status === "SENT" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Inviata
                            </span>
                          ) : row.status === "FAILED" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                              <XCircle className="h-3.5 w-3.5" />
                              Fallita
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {row.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.sensitive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              Sì
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.retryable ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                              Sì
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <div>{row.retryCount}</div>
                          <div>{row.retryStatus || "-"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : row.id)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            {expanded ? (
                              <>
                                <ChevronUp className="h-3 w-3" />
                                Chiudi
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                Apri
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {row.status !== "FAILED" ? (
                            <span className="text-xs text-gray-400">-</span>
                          ) : !row.retryable ? (
                            <span
                              className="inline-flex items-center gap-1 text-xs text-amber-700"
                              title="Email non ritentabile: le credenziali sono state aggiornate"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Non ritentabile
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleRetrySingle(row)}
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                              disabled={isRowActionLoading}
                            >
                              {isRowActionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : row.sensitive ? (
                                <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              {row.sensitive ? "Rigenera e invia" : "Retry"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expanded ? (
                        <tr key={`${row.id}-details`} className="border-b bg-gray-50/60">
                          <td colSpan={11} className="px-4 py-4 text-sm text-gray-700">
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                              <p>
                                <span className="font-medium">Oggetto completo:</span>{" "}
                                {row.subject}
                              </p>
                              <p>
                                <span className="font-medium">Email type:</span>{" "}
                                {row.emailType}
                              </p>
                              <p>
                                <span className="font-medium">Recipient ID:</span>{" "}
                                {row.recipientId || "-"}
                              </p>
                              <p>
                                <span className="font-medium">Course Edition ID:</span>{" "}
                                {row.courseEditionId || "-"}
                              </p>
                              <p>
                                <span className="font-medium">Ultimo retry:</span>{" "}
                                {formatDateTime(row.lastRetryAt)}
                              </p>
                              <p>
                                <span className="font-medium">Retry status:</span>{" "}
                                {row.retryStatus || "-"}
                              </p>
                            </div>
                            {row.errorMessage ? (
                              <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-red-700">
                                <span className="font-medium">Errore:</span>{" "}
                                {row.errorMessage}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
        <p>
          Mostrando {(page - 1) * limit + 1}-{Math.min(page * limit, total)} di{" "}
          {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="rounded border px-3 py-1.5 disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Pagina {page}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="rounded border px-3 py-1.5 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
