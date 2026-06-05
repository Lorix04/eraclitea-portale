"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { formatItalianDate } from "@/lib/date-utils";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDataTableKeyboard } from "@/components/ui/data-table-keyboard";
import { trackEvent } from "@/lib/analytics";
import { useBranding } from "@/components/BrandingProvider";
import { BrandedButton } from "@/components/BrandedButton";
import { Skeleton } from "@/components/ui/Skeleton";

type CertificateRow = {
  id: string;
  employee: { nome: string; cognome: string };
  courseEdition?: {
    id: string;
    editionNumber: number;
    course?: { title: string } | null;
  } | null;
  achievedAt?: string | null;
  expiresAt?: string | null;
  uploadedAt?: string | null;
  uploadedByEmail?: string | null;
};

// Column descriptor for the certificate table. Keys are opaque + stable
// (persisted per-user via useTablePreferences). The row-selection checkbox
// (first) and "Azioni" (last) are NOT columns here — they stay fixed and are
// excluded from the customizer. `label` drives the customizer display.
export type CertificateColumn = {
  key: string;
  label: string;
  header: string;
  render: (cert: CertificateRow) => React.ReactNode;
  isPrimary?: boolean;
  isSecondary?: boolean;
  isBadge?: boolean;
  hideOnCard?: boolean;
  className?: string;
};

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

type CertificateTableProps = {
  certificates: CertificateRow[];
  /**
   * Customizable data columns, already ordered + filtered (orderedVisibleColumns).
   * Defaults to the full registry when omitted (consumers without a customizer).
   */
  columns?: CertificateColumn[];
  isLoading?: boolean;
  isFetching?: boolean;
  pagination?: PaginationProps;
};

function formatDate(value?: string | null) {
  return formatItalianDate(value) || "-";
}

function getExpiryBadge(expiresAt?: string | null) {
  if (!expiresAt) {
    return { label: "Valido", className: "bg-emerald-100 text-emerald-700" };
  }
  const exp = new Date(expiresAt);
  const now = new Date();
  if (exp < now) {
    return { label: "Scaduto", className: "bg-red-100 text-red-700" };
  }
  const expiring = exp.getTime() - now.getTime() <= 30 * 24 * 60 * 60 * 1000;
  if (expiring) {
    return { label: "In scadenza", className: "bg-orange-100 text-orange-700" };
  }
  return { label: "Valido", className: "bg-emerald-100 text-emerald-700" };
}

function getCourseLabel(cert: CertificateRow) {
  const title = cert.courseEdition?.course?.title ?? "Esterno";
  const edition = cert.courseEdition?.editionNumber;
  return edition ? `${title} (Ed. #${edition})` : title;
}

// Default customizable column registry (default order). The selection checkbox
// and "Azioni" are fixed and handled separately by the table.
export const CERTIFICATE_COLUMNS: CertificateColumn[] = [
  {
    key: "employee",
    label: "Dipendente",
    header: "Dipendente",
    isPrimary: true,
    render: (cert) => `${cert.employee.cognome} ${cert.employee.nome}`,
  },
  {
    key: "course",
    label: "Corso",
    header: "Corso",
    isSecondary: true,
    className: "max-w-[260px] truncate px-4 py-3",
    render: (cert) => (
      <span title={getCourseLabel(cert)}>{getCourseLabel(cert)}</span>
    ),
  },
  {
    key: "achievedAt",
    label: "Data",
    header: "Data",
    render: (cert) => formatDate(cert.achievedAt),
  },
  {
    key: "expiresAt",
    label: "Scadenza",
    header: "Scadenza",
    render: (cert) => formatDate(cert.expiresAt),
  },
  {
    key: "status",
    label: "Stato",
    header: "Stato",
    isBadge: true,
    render: (cert) => {
      const badge = getExpiryBadge(cert.expiresAt);
      return (
        <span className={`rounded-full px-2 py-1 text-xs ${badge.className}`}>
          {badge.label}
        </span>
      );
    },
  },
  {
    key: "uploadedAt",
    label: "Caricato",
    header: "Caricato",
    className: "px-4 py-3 text-xs text-muted-foreground",
    render: (cert) => (cert.uploadedAt ? formatDate(cert.uploadedAt) : "-"),
  },
];

export default function CertificateTable({
  certificates,
  columns = CERTIFICATE_COLUMNS,
  isLoading,
  isFetching,
  pagination,
}: CertificateTableProps) {
  const { primaryColor } = useBranding();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { tableRef, focusedIndex } = useDataTableKeyboard({
    rows: certificates,
    onRowSelect: (row) => {
      toggleSelect(row.id);
    },
  });

  const allSelected = useMemo(
    () => certificates.length > 0 && selectedIds.size === certificates.length,
    [certificates.length, selectedIds.size]
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

  const toggleSelectAll = () => {
    if (selectedIds.size === certificates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(certificates.map((cert) => cert.id)));
    }
  };

  const downloadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/attestati/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateIds: ids }),
      });
      if (!res.ok) {
        throw new Error("Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attestati_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success("Download completato");
      trackEvent.certificatesBulkDownload(selectedIds.size);
      setSelectedIds(new Set());
    },
    onError: () => {
      toast.error("Errore durante il download");
    },
  });

  const cardPrimary = columns.filter((c) => c.isPrimary);
  const cardSecondary = columns.filter((c) => c.isSecondary);
  const cardRest = columns.filter(
    (c) => !c.isPrimary && !c.isSecondary && !c.hideOnCard
  );

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm"
          style={{ backgroundColor: `${primaryColor}10` }}
        >
          <span className="font-medium">
            {selectedIds.size} attestati selezionati
          </span>
          <BrandedButton
            size="sm"
            onClick={() => downloadMutation.mutate(Array.from(selectedIds))}
            disabled={downloadMutation.isPending}
          >
            Scarica ZIP
          </BrandedButton>
          <BrandedButton
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Deseleziona
          </BrandedButton>
        </div>
      ) : null}

      {isFetching ? (
        <div
          className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent"
          role="status"
          aria-live="polite"
        />
      ) : null}

      <div className="hidden md:block">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="overflow-hidden rounded-lg border bg-card">
            <table
              ref={tableRef}
              role="grid"
              aria-label="Lista attestati"
              className="w-full min-w-[980px] text-sm"
              tabIndex={0}
            >
            <thead className="bg-muted/40 text-left">
              <tr role="row">
                <th className="w-12 px-4 py-3" role="columnheader" scope="col">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Seleziona tutti"
                  />
                </th>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3" role="columnheader" scope="col">
                    {col.header}
                  </th>
                ))}
                <th className="px-4 py-3" role="columnheader" scope="col">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, row) => (
                  <tr key={`cert-skel-${row}`} className="border-t">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-4" />
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <Skeleton className="h-6 w-8" />
                    </td>
                  </tr>
                ))
              ) : certificates.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    Nessun attestato trovato.
                  </td>
                </tr>
              ) : (
                certificates.map((cert, index) => {
                  const selected = selectedIds.has(cert.id);
                  const uploadedInfo = cert.uploadedAt
                    ? `Caricato il ${formatDate(cert.uploadedAt)}`
                    : "Caricamento non disponibile";
                  const uploaderInfo = cert.uploadedByEmail
                    ? ` da ${cert.uploadedByEmail}`
                    : "";
                  const rowStyle: React.CSSProperties = {
                    ...(selected ? { backgroundColor: `${primaryColor}08` } : {}),
                    ...(focusedIndex === index ? { outlineColor: primaryColor } : {}),
                  };
                  return (
                    <tr
                      key={cert.id}
                      className={`border-t ${
                        focusedIndex === index ? "outline outline-1" : ""
                      }`}
                      style={rowStyle}
                      title={`${uploadedInfo}${uploaderInfo}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(cert.id)}
                          aria-label={`Seleziona attestato ${cert.employee.cognome}`}
                        />
                      </td>
                      {columns.map((col) => (
                        <td key={col.key} className={col.className ?? "px-4 py-3"}>
                          {col.render(cert)}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <a
                          href={`/api/attestati/${cert.id}/download`}
                          className="btn-brand-outline inline-flex min-h-[44px] items-center rounded-md px-2 py-1 text-xs"
                          aria-label="Scarica attestato"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              aria-label="Seleziona tutti"
            />
            Seleziona tutti
          </label>
          <span className="text-muted-foreground">
            {certificates.length} attestati
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`cert-mobile-skel-${index}`}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-40" />
                <div className="mt-3 flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="mt-3 h-4 w-28" />
              </div>
            ))}
          </div>
        ) : certificates.length === 0 ? (
          <div className="rounded-lg border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Nessun attestato trovato.
          </div>
        ) : (
          certificates.map((cert) => {
            const selected = selectedIds.has(cert.id);
            return (
              <article
                key={cert.id}
                className="space-y-3 rounded-lg border bg-card p-4"
                style={
                  selected
                    ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {cardPrimary.map((col) => (
                      <p key={col.key} className="text-sm font-semibold">
                        {col.render(cert)}
                      </p>
                    ))}
                    {cardSecondary.map((col) => (
                      <p key={col.key} className="text-xs text-muted-foreground">
                        {col.render(cert)}
                      </p>
                    ))}
                  </div>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelect(cert.id)}
                    aria-label={`Seleziona attestato ${cert.employee.cognome}`}
                  />
                </div>

                {cardRest.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {cardRest.map((col) =>
                      col.isBadge ? (
                        <span key={col.key}>{col.render(cert)}</span>
                      ) : (
                        <span key={col.key} className="rounded-full bg-muted px-2 py-1">
                          {col.header}: {col.render(cert)}
                        </span>
                      )
                    )}
                  </div>
                ) : null}

                <div className="flex items-center justify-end text-xs text-muted-foreground">
                  <a
                    href={`/api/attestati/${cert.id}/download`}
                    className="btn-brand-outline inline-flex min-h-[44px] items-center gap-2 rounded-md px-2 py-1 text-xs"
                    aria-label="Scarica attestato"
                  >
                    <Download className="h-4 w-4" />
                    Scarica
                  </a>
                </div>
              </article>
            );
          })
        )}
      </div>

      {pagination ? (
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            Pagina {pagination.page} di {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <BrandedButton
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
            >
              Precedente
            </BrandedButton>
            <BrandedButton
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                pagination.onPageChange(
                  Math.min(pagination.totalPages, pagination.page + 1)
                )
              }
            >
              Successiva
            </BrandedButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
