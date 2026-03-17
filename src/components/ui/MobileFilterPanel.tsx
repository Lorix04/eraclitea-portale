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
      {/* Row 1: search bar + mobile toggle */}
      {searchBar ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{searchBar}</div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm md:hidden"
            onClick={() => setOpen((prev) => !prev)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filtri</span>
            {activeFiltersCount > 0 ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
                {activeFiltersCount}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      {/* Filter panel: collapsible on mobile, always visible on desktop */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          "md:!max-h-none md:!opacity-100 md:!pointer-events-auto md:overflow-visible",
          open
            ? "max-h-[800px] opacity-100"
            : "max-h-0 opacity-0 pointer-events-none md:max-h-none md:opacity-100 md:pointer-events-auto"
        )}
      >
        <div className="rounded-xl border bg-muted/30 p-3 md:border-0 md:bg-transparent md:p-0">
          <div className="space-y-3 md:space-y-0">
            {children}
          </div>
          {onReset ? (
            <button
              type="button"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground md:hidden"
            >
              <X className="h-3.5 w-3.5" />
              Resetta filtri
            </button>
          ) : null}
        </div>
      </div>

      {/* Row 3: actions + result count (always visible) */}
      {actions || resultCount || (onReset && typeof resultCount !== "undefined") ? (
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {actions}
          {resultCount != null ? (
            <span className="ml-auto text-sm text-muted-foreground">
              {resultCount}
            </span>
          ) : null}
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="hidden items-center rounded-md border px-3 py-2 text-sm text-muted-foreground md:inline-flex"
            >
              <X className="mr-1 h-4 w-4" />
              Resetta
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
