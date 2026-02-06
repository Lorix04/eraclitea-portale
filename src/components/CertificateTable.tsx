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

type CertificateRow = {
  id: string;
  employee: { nome: string; cognome: string };
  course?: { title: string } | null;
  achievedAt?: string | null;
  expiresAt?: string | null;
  uploadedAt?: string | null;
  uploadedByEmail?: string | null;
};

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

type CertificateTableProps = {
  certificates: CertificateRow[];
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

export default function CertificateTable({
  certificates,
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
        <div className="overflow-hidden rounded-lg border bg-card">
          <table
            ref={tableRef}
            role="grid"
            aria-label="Lista attestati"
            className="w-full text-sm"
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
                <th className="px-4 py-3" role="columnheader" scope="col">
                  Dipendente
                </th>
                <th className="px-4 py-3" role="columnheader" scope="col">
                  Corso
                </th>
                <th className="px-4 py-3" role="columnheader" scope="col">
                  Data
                </th>
                <th className="px-4 py-3" role="columnheader" scope="col">
                  Scadenza
                </th>
                <th className="px-4 py-3" role="columnheader" scope="col">
                  Stato
                </th>
                <th className="px-4 py-3" role="columnheader" scope="col">
                  Caricato
                </th>
                <th className="px-4 py-3" role="columnheader" scope="col">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    Caricamento attestati...
                  </td>
                </tr>
              ) : certificates.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    Nessun attestato trovato.
                  </td>
                </tr>
              ) : (
                certificates.map((cert, index) => {
                  const badge = getExpiryBadge(cert.expiresAt);
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
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(cert.id)}
                          aria-label={`Seleziona attestato ${cert.employee.cognome}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {cert.employee.cognome} {cert.employee.nome}
                      </td>
                      <td className="px-4 py-3">
                        {cert.course?.title ?? "Esterno"}
                      </td>
                      <td
                        className="px-4 py-3"
                        title={`${uploadedInfo}${uploaderInfo}`}
                      >
                        {formatDate(cert.achievedAt)}
                      </td>
                      <td className="px-4 py-3">{formatDate(cert.expiresAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {cert.uploadedAt ? formatDate(cert.uploadedAt) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/api/attestati/${cert.id}/download`}
                          className="btn-brand-outline inline-flex items-center rounded-md px-2 py-1 text-xs"
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
          <div className="rounded-lg border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Caricamento attestati...
          </div>
        ) : certificates.length === 0 ? (
          <div className="rounded-lg border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Nessun attestato trovato.
          </div>
        ) : (
          certificates.map((cert) => {
            const badge = getExpiryBadge(cert.expiresAt);
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
                    <p className="text-sm font-semibold">
                      {cert.employee.cognome} {cert.employee.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cert.course?.title ?? "Esterno"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelect(cert.id)}
                    aria-label={`Seleziona attestato ${cert.employee.cognome}`}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-1 ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1">
                    Data: {formatDate(cert.achievedAt)}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1">
                    Scadenza: {formatDate(cert.expiresAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Caricato: {cert.uploadedAt ? formatDate(cert.uploadedAt) : "-"}
                  </span>
                  <a
                    href={`/api/attestati/${cert.id}/download`}
                    className="btn-brand-outline inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs"
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
