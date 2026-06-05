"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatItalianDateTime } from "@/lib/date-utils";
import { getArrayData } from "@/lib/api-response";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import ResponsiveTable, { type Column } from "@/components/ui/ResponsiveTable";
import ErrorMessage from "@/components/ui/ErrorMessage";
import MobileFilterPanel from "@/components/ui/MobileFilterPanel";
import TableColumnCustomizer from "@/components/TableColumnCustomizer";
import { useTablePreferences } from "@/hooks/useTablePreferences";

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

// Customizable column registry for /admin/audit. Read-only table (no "Azioni").
// `label` drives the customizer display.
type AuditColumn = Column<AuditLogRow> & { label: string };

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(`/api/admin/audit?${queryString}`);
      if (!res.ok) {
        setError("Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.");
        setRows([]);
        setTotal(0);
        return;
      }
      const json = await res.json();
      setRows(getArrayData<AuditLogRow>(json));
      setTotal(json.total ?? 0);
    } catch {
      setError("Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Customizable column registry (default order). Read-only table — no fixed col.
  const auditColumns = useMemo<AuditColumn[]>(
    () => [
      {
        key: "action",
        label: "Azione",
        header: "Azione",
        isBadge: true,
        render: (row) => (
          <span
            className={`rounded-full px-2 py-1 text-xs ${
              ACTION_BADGES[row.action] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {row.action}
          </span>
        ),
      },
      {
        key: "user",
        label: "Utente",
        header: "Utente",
        isPrimary: true,
        render: (row) => row.user.email,
      },
      {
        key: "createdAt",
        label: "Data/Ora",
        header: "Data/Ora",
        isSecondary: true,
        render: (row) => formatItalianDateTime(row.createdAt),
      },
      {
        key: "entityType",
        label: "Entita",
        header: "Entita",
        render: (row) => row.entityType ?? "-",
      },
      {
        key: "entityId",
        label: "ID",
        header: "ID",
        render: (row) => row.entityId ?? "-",
      },
      {
        key: "ip",
        label: "IP",
        header: "IP",
        render: (row) => row.ipAddress ?? "-",
      },
    ],
    []
  );

  const {
    orderedVisibleColumns,
    allColumns,
    isHidden,
    setVisibility,
    reorder,
    reset: resetColumns,
  } = useTablePreferences<AuditColumn>({
    tableKey: "admin.audit",
    columns: auditColumns,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Tracciamento azioni degli utenti nel portale.
        </p>
      </div>

      <MobileFilterPanel
        searchBar={
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Entita (es. Course)"
            value={entityType}
            onChange={(event) => {
              setPage(1);
              setEntityType(event.target.value);
            }}
          />
        }
        activeFiltersCount={
          (action !== "" ? 1 : 0) +
          (entityType !== "" ? 1 : 0) +
          (dateFrom !== "" ? 1 : 0) +
          (dateTo !== "" ? 1 : 0)
        }
        trailingControl={
          <TableColumnCustomizer
            columns={allColumns.map((c) => ({ key: c.key, label: c.label }))}
            isHidden={isHidden}
            setVisibility={setVisibility}
            reorder={reorder}
            reset={resetColumns}
          />
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-auto"
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
            type="date"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-auto"
            value={dateFrom}
            onChange={(event) => {
              setPage(1);
              setDateFrom(event.target.value);
            }}
          />
          <input
            type="date"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-auto"
            value={dateTo}
            onChange={(event) => {
              setPage(1);
              setDateTo(event.target.value);
            }}
          />
        </div>
      </MobileFilterPanel>

      {error ? <ErrorMessage message={error} onRetry={() => void loadAudit()} /> : null}

      <ResponsiveTable<AuditLogRow>
        columns={orderedVisibleColumns}
        data={rows}
        keyExtractor={(row) => row.id}
        loading={loading}
        skeletonCount={6}
        emptyMessage="Nessun log trovato."
      />

      <div className="flex items-center justify-between text-sm">
        <span>
          Pagina {page} di {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="min-h-[44px] rounded-md border px-3 py-1"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Precedente
          </button>
          <button
            type="button"
            className="min-h-[44px] rounded-md border px-3 py-1"
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
