"use client";

import { type ReactNode } from "react";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  isPrimary?: boolean;
  isSecondary?: boolean;
  isBadge?: boolean;
  hideOnCard?: boolean;
  className?: string;
  sortable?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  actions?: (item: T) => ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  skeletonCount?: number;
  onRowClick?: (item: T) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
}

function SkeletonPulse({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />;
}

export default function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  actions,
  emptyMessage = "Nessun risultato.",
  loading = false,
  skeletonCount = 5,
  onRowClick,
  sortKey,
  sortOrder,
  onSort,
}: ResponsiveTableProps<T>) {
  const primaryCols = columns.filter((c) => c.isPrimary);
  const secondaryCols = columns.filter((c) => c.isSecondary);
  const badgeCols = columns.filter((c) => c.isBadge);
  const detailCols = columns.filter(
    (c) => !c.isPrimary && !c.isSecondary && !c.isBadge && !c.hideOnCard
  );

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm" style={{ minWidth: `${Math.max(columns.length * 120, 600)}px` }}>
            <thead className="bg-muted/40 text-left">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={cn("whitespace-nowrap px-4 py-3", col.className)}>
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold"
                      >
                        {col.header}
                        <ArrowUpDown
                          className={cn(
                            "h-3.5 w-3.5",
                            sortKey === col.key
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                        />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
                {actions ? <th className="sticky right-0 z-20 min-w-[130px] border-l border-gray-200 bg-gray-50 px-4 py-3">Azioni</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: skeletonCount }).map((_, i) => (
                    <tr key={`skel-${i}`} className="border-t">
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3">
                          <SkeletonPulse className="h-4 w-full" />
                        </td>
                      ))}
                      {actions ? (
                        <td className="sticky right-0 z-10 min-w-[130px] border-l border-gray-200 bg-white px-4 py-3">
                          <SkeletonPulse className="h-4 w-16" />
                        </td>
                      ) : null}
                    </tr>
                  ))
                : data.length === 0
                  ? (
                    <tr>
                      <td
                        colSpan={columns.length + (actions ? 1 : 0)}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        {emptyMessage}
                      </td>
                    </tr>
                  )
                  : data.map((item) => (
                    <tr key={keyExtractor(item)} className="group border-t even:bg-gray-50 hover:bg-gray-50">
                      {columns.map((col) => (
                        <td key={col.key} className={cn("px-4 py-3", col.className)}>
                          {col.render(item)}
                        </td>
                      ))}
                      {actions ? (
                        <td className="sticky right-0 z-10 min-w-[130px] border-l border-gray-200 bg-white group-even:bg-gray-50 group-hover:bg-gray-50 px-4 py-3">{actions(item)}</td>
                      ) : null}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`card-skel-${i}`}
                className="overflow-hidden rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="space-y-3">
                  <SkeletonPulse className="h-5 w-3/4" />
                  <SkeletonPulse className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <SkeletonPulse className="h-5 w-16 rounded-full" />
                    <SkeletonPulse className="h-5 w-16 rounded-full" />
                  </div>
                  <SkeletonPulse className="h-4 w-full" />
                  <SkeletonPulse className="h-4 w-2/3" />
                </div>
              </div>
            ))
          : data.length === 0
            ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            )
            : data.map((item) => (
              <div
                key={keyExtractor(item)}
                className={cn(
                  "overflow-hidden rounded-xl border bg-card p-4 shadow-sm",
                  onRowClick && "cursor-pointer active:bg-muted/50"
                )}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {/* Primary title */}
                {primaryCols.map((col) => (
                  <div
                    key={col.key}
                    className="truncate text-base font-semibold text-foreground"
                  >
                    {col.render(item)}
                  </div>
                ))}

                {/* Secondary subtitle */}
                {secondaryCols.map((col) => (
                  <div
                    key={col.key}
                    className="truncate text-sm text-muted-foreground"
                  >
                    {col.render(item)}
                  </div>
                ))}

                {/* Badges */}
                {badgeCols.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {badgeCols.map((col) => (
                      <span key={col.key}>{col.render(item)}</span>
                    ))}
                  </div>
                ) : null}

                {/* Detail fields — always show, use dash for empty */}
                {detailCols.length > 0 ? (
                  <div className="mt-3 space-y-1 border-t pt-3">
                    {detailCols.map((col) => {
                      const value = col.render(item);
                      return (
                        <div
                          key={col.key}
                          className="flex items-start justify-between gap-2 text-sm"
                        >
                          <span className="shrink-0 text-muted-foreground">
                            {col.header}
                          </span>
                          <span className="min-w-0 truncate text-right text-foreground">
                            {value === null || value === undefined || value === ""
                              ? "—"
                              : value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Actions — always at bottom */}
                {actions ? (
                  <div
                    className="mt-3 flex flex-wrap gap-2 border-t pt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions(item)}
                  </div>
                ) : null}
              </div>
            ))}
      </div>
    </>
  );
}
