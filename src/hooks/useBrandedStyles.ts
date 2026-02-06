"use client";

import { useMemo } from "react";
import { useBranding } from "@/components/BrandingProvider";

type BrandedStyles = {
  primaryButton: React.CSSProperties;
  primaryButtonHover: React.CSSProperties;
  secondaryButton: React.CSSProperties;
  secondaryButtonHover: React.CSSProperties;
  outlineButton: React.CSSProperties;
  outlineButtonHover: React.CSSProperties;
  ghostButton: React.CSSProperties;
  ghostButtonActive: React.CSSProperties;
  ghostButtonHover: React.CSSProperties;
  badge: React.CSSProperties;
  link: React.CSSProperties;
  tabActive: React.CSSProperties;
  tabInactive: React.CSSProperties;
  focusRing: React.CSSProperties;
};

export function useBrandedStyles() {
  const { primaryColor, secondaryColor } = useBranding();

  const styles = useMemo<BrandedStyles>(
    () => ({
      primaryButton: {
        backgroundColor: primaryColor,
        color: "#FFFFFF",
        border: "none",
      },
      primaryButtonHover: {
        backgroundColor: adjustColor(primaryColor, -10),
      },
      secondaryButton: {
        backgroundColor: secondaryColor,
        color: "#FFFFFF",
        border: "none",
      },
      secondaryButtonHover: {
        backgroundColor: adjustColor(secondaryColor, -10),
      },
      outlineButton: {
        backgroundColor: "transparent",
        color: primaryColor,
        border: `1px solid ${primaryColor}`,
      },
      outlineButtonHover: {
        backgroundColor: `${primaryColor}10`,
      },
      ghostButton: {
        backgroundColor: "transparent",
        color: "inherit",
      },
      ghostButtonActive: {
        backgroundColor: primaryColor,
        color: "#FFFFFF",
      },
      ghostButtonHover: {
        backgroundColor: `${primaryColor}15`,
      },
      badge: {
        backgroundColor: `${primaryColor}15`,
        color: primaryColor,
      },
      link: {
        color: primaryColor,
      },
      tabActive: {
        backgroundColor: primaryColor,
        color: "#FFFFFF",
      },
      tabInactive: {
        backgroundColor: "transparent",
        color: "inherit",
      },
      focusRing: {
        outline: `2px solid ${primaryColor}`,
        outlineOffset: "2px",
      },
    }),
    [primaryColor, secondaryColor]
  );

  return { styles, primaryColor, secondaryColor };
}

function adjustColor(hex: string, percent: number): string {
  if (!hex) return hex;
  const cleaned = hex.replace("#", "");
  const num = parseInt(cleaned, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(Math.min((num >> 16) + amt, 255), 0);
  const g = Math.max(Math.min(((num >> 8) & 0x00ff) + amt, 255), 0);
  const b = Math.max(Math.min((num & 0x0000ff) + amt, 255), 0);
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b)
    .toString(16)
    .slice(1)}`;
}
