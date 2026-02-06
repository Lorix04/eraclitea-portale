"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { useBranding } from "@/components/BrandingProvider";

type ClientHeaderProps = {
  leftSlot?: ReactNode;
  children?: ReactNode;
};

export default function ClientHeader({ leftSlot, children }: ClientHeaderProps) {
  const { clientName, logoUrl, logoLightUrl, primaryColor } = useBranding();
  const displayLogo = logoUrl || logoLightUrl;

  return (
    <header className="app-header relative z-40 flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-3">
        {leftSlot}
        <div className="flex items-center gap-3">
          {displayLogo ? (
            <Image
              src={displayLogo}
              alt={clientName}
              width={120}
              height={40}
              unoptimized
              className="h-8 w-auto object-contain"
            />
          ) : null}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Portale
            </p>
            <h2
              className="text-lg font-display font-semibold"
              style={{ color: primaryColor }}
            >
              {clientName}
            </h2>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </header>
  );
}
