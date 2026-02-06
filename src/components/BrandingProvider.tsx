"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface BrandingContextType {
  clientName: string;
  primaryColor: string;
  secondaryColor: string;
  sidebarBgColor: string;
  sidebarTextColor: string;
  logoUrl: string | null;
  logoLightUrl: string | null;
  isLoading: boolean;
}

const defaultBranding: BrandingContextType = {
  clientName: "Portale Clienti",
  primaryColor: "#3B82F6",
  secondaryColor: "#60A5FA",
  sidebarBgColor: "#FFFFFF",
  sidebarTextColor: "#1F2937",
  logoUrl: null,
  logoLightUrl: null,
  isLoading: true,
};

const BrandingContext = createContext<BrandingContextType>(defaultBranding);

export function useBranding() {
  return useContext(BrandingContext);
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingContextType>(defaultBranding);

  useEffect(() => {
    let active = true;
    async function fetchBranding() {
      try {
        const res = await fetch("/api/branding");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!active) return;
        setBranding({
          clientName: data.clientName || defaultBranding.clientName,
          primaryColor: data.primaryColor || defaultBranding.primaryColor,
          secondaryColor: data.secondaryColor || defaultBranding.secondaryColor,
          sidebarBgColor: data.sidebarBgColor || defaultBranding.sidebarBgColor,
          sidebarTextColor: data.sidebarTextColor || defaultBranding.sidebarTextColor,
          logoUrl: data.logoUrl || null,
          logoLightUrl: data.logoLightUrl || null,
          isLoading: false,
        });
      } catch {
        if (!active) return;
        setBranding((prev) => ({ ...prev, isLoading: false }));
      }
    }
    fetchBranding();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (branding.isLoading) return;
    document.title = `Portale ${branding.clientName}`;

    const faviconUrl = branding.logoUrl || branding.logoLightUrl;
    if (faviconUrl) {
      const updateLink = (rel: string) => {
        const link = document.querySelector<HTMLLinkElement>(
          `link[rel='${rel}']`
        );
        if (link) {
          link.href = faviconUrl;
          return;
        }
        const newLink = document.createElement("link");
        newLink.rel = rel;
        newLink.href = faviconUrl;
        document.head.appendChild(newLink);
      };
      updateLink("icon");
      updateLink("shortcut icon");
    }

    document.documentElement.style.setProperty(
      "--color-primary",
      branding.primaryColor
    );
    document.documentElement.style.setProperty(
      "--color-secondary",
      branding.secondaryColor
    );
    document.documentElement.style.setProperty(
      "--color-sidebar-bg",
      branding.sidebarBgColor
    );
    document.documentElement.style.setProperty(
      "--color-sidebar-text",
      branding.sidebarTextColor
    );
  }, [branding]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}
