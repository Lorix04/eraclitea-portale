"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatItalianDateTime } from "@/lib/date-utils";

const ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "COURSE_CREATE",
  "COURSE_UPDATE",
  "COURSE_PUBLISH",
  "COURSE_ARCHIVE",
  "CLIENT_CREATE",
  "CLIENT_UPDATE",
  "CLIENT_TOGGLE_STATUS",
  "CATEGORY_CREATE",
  "CATEGORY_UPDATE",
  "CATEGORY_DELETE",
  "REGISTRY_SUBMIT",
  "PASSWORD_RESET",
  "PASSWORD_CHANGE",
  "CERT_UPLOAD",
  "CERT_DOWNLOAD",
  "CSV_EXPORT",
  "REGISTRY_UPDATE",
];

const ACTION_BADGES: Record<string, string> = {
  LOGIN: "bg-blue-100 text-blue-700",
  LOGOUT: "bg-gray-100 text-gray-700",
  COURSE_CREATE: "bg-emerald-100 text-emerald-700",
  COURSE_UPDATE: "bg-yellow-100 text-yellow-700",
  COURSE_PUBLISH: "bg-emerald-100 text-emerald-700",
  COURSE_ARCHIVE: "bg-red-100 text-red-700",
  CLIENT_CREATE: "bg-emerald-100 text-emerald-700",
  CLIENT_UPDATE: "bg-yellow-100 text-yellow-700",
  CLIENT_TOGGLE_STATUS: "bg-orange-100 text-orange-700",
  CATEGORY_CREATE: "bg-emerald-100 text-emerald-700",
  CATEGORY_UPDATE: "bg-yellow-100 text-yellow-700",
  CATEGORY_DELETE: "bg-red-100 text-red-700",
  REGISTRY_SUBMIT: "bg-indigo-100 text-indigo-700",
  PASSWORD_RESET: "bg-red-100 text-red-700",
  PASSWORD_CHANGE: "bg-red-100 text-red-700",
  CERT_UPLOAD: "bg-emerald-100 text-emerald-700",
  CERT_DOWNLOAD: "bg-blue-100 text-blue-700",
  CSV_EXPORT: "bg-purple-100 text-purple-700",
  REGISTRY_UPDATE: "bg-slate-100 text-slate-700",
};

type AuditLogRow = {
  id: string;
  createdAt: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  user: { email: string; role: string };
};

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const limit = 50;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return params.toString();
  }, [page, limit, action, entityType, dateFrom, dateTo]);

  const loadAudit = useCallback(async () => {
    const res = await fetch(`/api/admin/audit?${queryString}`);
    const json = await res.json();
    setRows(json.data ?? []);
    setTotal(json.total ?? 0);
  }, [queryString]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Tracciamento azioni degli utenti nel portale.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={action}
          onChange={(event) => {
            setPage(1);
            setAction(event.target.value);
          }}
        >
          <option value="">Tutte le azioni</option>
          {ACTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Entita (es. Course)"
          value={entityType}
          onChange={(event) => {
            setPage(1);
            setEntityType(event.target.value);
          }}
        />
        <input
          type="date"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={dateFrom}
          onChange={(event) => {
            setPage(1);
            setDateFrom(event.target.value);
          }}
        />
        <input
          type="date"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={dateTo}
          onChange={(event) => {
            setPage(1);
            setDateTo(event.target.value);
          }}
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Data/Ora</th>
              <th className="px-4 py-3">Utente</th>
              <th className="px-4 py-3">Azione</th>
              <th className="px-4 py-3">Entita</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Nessun log trovato.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">
                    {formatItalianDateTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">{row.user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        ACTION_BADGES[row.action] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.entityType ?? "-"}</td>
                  <td className="px-4 py-3">{row.entityId ?? "-"}</td>
                  <td className="px-4 py-3">{row.ipAddress ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>
          Pagina {page} di {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Precedente
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Successiva
          </button>
        </div>
      </div>
    </div>
  );
}
