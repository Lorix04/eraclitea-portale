"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, Filter, XCircle } from "lucide-react";

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
};

type EmailLogResponse = {
  data: EmailLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    return params.toString();
  }, [fromDate, limit, page, search, statusFilter, toDate, typeFilter]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/email-log?${query}`, {
        cache: "no-store",
      });
      const payload = (await res.json()) as EmailLogResponse | { error?: string };
      if (!res.ok) {
        setError((payload as { error?: string }).error || "Errore caricamento log");
        setRows([]);
        return;
      }
      const data = payload as EmailLogResponse;
      setRows(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setLimit(data.limit);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Errore caricamento log");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const uniqueTypes = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.emailType))
      ).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/admin/impostazioni/email"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {"<-"} Configurazione Email
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Log Email Inviate</h1>
          <p className="text-sm text-muted-foreground">
            Tracciamento invii automatici con stato e dettagli errore.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" />
          Filtri
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
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
            className="rounded-lg border px-3 py-2 text-sm xl:col-span-2"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
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
                  Dettagli
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Caricamento...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Nessun log email trovato.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const expanded = expandedId === row.id;
                  return (
                    <>
                      <tr key={row.id} className="border-b hover:bg-gray-50">
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
                          {row.subject.length > 52
                            ? `${row.subject.slice(0, 52)}...`
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
                              {row.status}
                            </span>
                          )}
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
                      </tr>
                      {expanded && (
                        <tr className="border-b bg-gray-50/60">
                          <td colSpan={6} className="px-4 py-4 text-sm text-gray-700">
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
                            </div>
                            {row.errorMessage && (
                              <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-red-700">
                                <span className="font-medium">Errore:</span>{" "}
                                {row.errorMessage}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
