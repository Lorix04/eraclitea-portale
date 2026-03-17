"use client";

import { ReactNode } from "react";
import { useBranding } from "@/components/BrandingProvider";
import { Skeleton } from "@/components/ui/Skeleton";

type ClientHeaderProps = {
  leftSlot?: ReactNode;
  children?: ReactNode;
};

export default function ClientHeader({ leftSlot, children }: ClientHeaderProps) {
  const { clientName, primaryColor, isLoading } = useBranding();

  return (
    <header className="app-header relative z-40 flex items-center justify-between gap-3 px-4 py-3 md:flex-wrap md:gap-4 md:px-6 md:py-4">
      <div className="flex min-w-0 items-center gap-3">
        {leftSlot}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : (
          <div className="min-w-0">
            <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground md:block">
              PORTALE
            </p>
            <h2
              className="truncate text-base font-display font-semibold md:text-lg"
              style={{ color: primaryColor }}
            >
              {clientName}
            </h2>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 md:gap-3">{children}</div>
    </header>
  );
}
