"use client";

import Image from "next/image";

interface BrandingPreviewProps {
  clientName: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  sidebarBgColor: string | null;
  sidebarTextColor: string | null;
  logoUrl: string | null;
}

export function BrandingPreview({
  clientName,
  primaryColor,
  secondaryColor,
  sidebarBgColor,
  sidebarTextColor,
  logoUrl,
}: BrandingPreviewProps) {
  const colors = {
    primary: primaryColor || "#3B82F6",
    secondary: secondaryColor || "#60A5FA",
    sidebarBg: sidebarBgColor || "#FFFFFF",
    sidebarText: sidebarTextColor || "#1F2937",
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div
        className="w-48 space-y-3 p-3"
        style={{ backgroundColor: colors.sidebarBg, color: colors.sidebarText }}
      >
        <div className="flex items-center justify-center rounded bg-white/10 p-2">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={clientName}
              width={120}
              height={48}
              unoptimized
              className="h-10 w-auto object-contain"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-white/20 text-xs">
              Logo
            </div>
          )}
        </div>
        <div className="text-center text-sm font-medium truncate">
          {clientName || "Nome Azienda"}
        </div>
        <div className="space-y-1 text-sm">
          <div
            className="rounded px-2 py-1.5 text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Dashboard
          </div>
          <div className="rounded px-2 py-1.5 hover:bg-white/10">Corsi</div>
          <div className="rounded px-2 py-1.5 hover:bg-white/10">
            Dipendenti
          </div>
        </div>
        <div className="pt-2">
          <button
            className="w-full rounded px-3 py-1.5 text-sm text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Pulsante Esempio
          </button>
        </div>
      </div>
    </div>
  );
}
