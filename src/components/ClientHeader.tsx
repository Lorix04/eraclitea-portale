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
    <header className="app-header relative z-40 flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-3">
        {leftSlot}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              PORTALE
            </p>
            <h2
              className="text-lg font-display font-semibold"
              style={{ color: primaryColor }}
            >
              {clientName}
            </h2>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </header>
  );
}
