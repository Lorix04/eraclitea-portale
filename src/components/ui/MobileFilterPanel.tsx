"use client";

import { type ReactNode, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileFilterPanelProps {
  children: ReactNode;
  searchBar?: ReactNode;
  activeFiltersCount?: number;
  onReset?: () => void;
  resultCount?: ReactNode;
  actions?: ReactNode;
}

export default function MobileFilterPanel({
  children,
  searchBar,
  activeFiltersCount = 0,
  onReset,
  resultCount,
  actions,
}: MobileFilterPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Row 1: search bar + Filtra button + Resetta */}
      <div className="flex items-center gap-2">
        {searchBar ? (
          <div className="min-w-0 flex-1">{searchBar}</div>
        ) : null}
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
            activeFiltersCount > 0
              ? "border-amber-400 bg-amber-50 text-amber-700"
              : "hover:bg-muted"
          )}
          onClick={() => setOpen((prev) => !prev)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filtra</span>
          {activeFiltersCount > 0 ? (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-semibold text-white">
              {activeFiltersCount}
            </span>
          ) : null}
        </button>
        {activeFiltersCount > 0 && onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Resetta</span>
          </button>
        ) : null}
      </div>

      {/* Filter panel: collapsible on all screen sizes */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open
            ? "max-h-[800px] opacity-100"
            : "max-h-0 opacity-0 pointer-events-none"
        )}
      >
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="space-y-3 sm:space-y-0">
            {children}
          </div>
        </div>
      </div>

      {/* Row 3: actions + result count (always visible) */}
      {actions || resultCount != null ? (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {resultCount != null ? (
            <span className="ml-auto text-sm text-muted-foreground">
              {resultCount}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
