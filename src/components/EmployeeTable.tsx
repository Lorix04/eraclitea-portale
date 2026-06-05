"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

// Column descriptor for the employee tables. Keys are opaque + stable (persisted
// per-user via useTablePreferences). "Azioni" is NOT a column here — it stays
// fixed/last, rendered via `renderActions`. `label` drives the customizer display.
export type EmployeeColumn<T> = {
  key: string;
  label: string;
  header: string;
  render: (item: T) => React.ReactNode;
  isPrimary?: boolean;
  isSecondary?: boolean;
  hideOnCard?: boolean;
  className?: string;
};

type EmployeeTableProps<T extends { id: string }> = {
  employees: T[];
  /** Customizable data columns, already ordered + filtered (orderedVisibleColumns). */
  columns: EmployeeColumn<T>[];
  basePath: string;
  isLoading?: boolean;
  useBranding?: boolean;
  onDelete?: (employee: T) => void;
  renderActions?: (employee: T) => React.ReactNode;
};

export default function EmployeeTable<T extends { id: string }>({
  employees,
  columns,
  basePath,
  isLoading,
  useBranding = false,
  onDelete,
  renderActions,
}: EmployeeTableProps<T>) {
  const router = useRouter();
  const linkClass = useBranding ? "link-brand" : "text-primary";
  const hasDelete = Boolean(onDelete);

  const primaryCols = columns.filter((c) => c.isPrimary);
  const secondaryCols = columns.filter((c) => c.isSecondary);
  const detailCols = columns.filter(
    (c) => !c.isPrimary && !c.isSecondary && !c.hideOnCard
  );

  const renderFallbackActions = (employee: T) => (
    <div className="flex items-center gap-2">
      <Link href={`${basePath}/${employee.id}`} className={linkClass}>
        Dettaglio
      </Link>
      {hasDelete ? (
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center text-destructive"
          onClick={() => onDelete?.(employee)}
          title="Elimina"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3">
                    {col.header}
                  </th>
                ))}
                <th className="px-4 py-3">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, row) => (
                  <tr key={`emp-skel-${row}`} className="border-t">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <Skeleton className="h-6 w-16" />
                    </td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    Nessun dipendente trovato.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-t cursor-pointer hover:bg-muted/30"
                    onClick={() => router.push(`${basePath}/${employee.id}`)}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={col.className ?? "px-4 py-3"}>
                        {col.render(employee)}
                      </td>
                    ))}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {renderActions
                        ? renderActions(employee)
                        : renderFallbackActions(employee)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`emp-mobile-skel-${index}`}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-40" />
                <Skeleton className="mt-2 h-3 w-36" />
                <div className="mt-3 flex items-center justify-between">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="rounded-lg border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Nessun dipendente trovato.
          </div>
        ) : (
          employees.map((employee) => (
            <article
              key={employee.id}
              className="space-y-2 rounded-lg border bg-card p-4 cursor-pointer active:bg-muted/50"
              onClick={() => router.push(`${basePath}/${employee.id}`)}
            >
              {primaryCols.length > 0 || secondaryCols.length > 0 ? (
                <div>
                  {primaryCols.map((col) => (
                    <p key={col.key} className="text-sm font-semibold">
                      {col.render(employee)}
                    </p>
                  ))}
                  {secondaryCols.map((col) => (
                    <p key={col.key} className="text-xs text-muted-foreground">
                      {col.render(employee)}
                    </p>
                  ))}
                </div>
              ) : null}
              {detailCols.map((col) => (
                <div key={col.key} className="text-xs text-muted-foreground">
                  {col.header}: {col.render(employee)}
                </div>
              ))}
              <div
                className="flex items-center justify-end pt-1"
                onClick={(e) => e.stopPropagation()}
              >
                {renderActions
                  ? renderActions(employee)
                  : renderFallbackActions(employee)}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
