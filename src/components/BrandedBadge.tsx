"use client";

import { cn } from "@/lib/utils";
import { useBranding } from "@/components/BrandingProvider";

type BrandedBadgeVariant = "default" | "success" | "warning" | "error" | "outline";

type BrandedBadgeProps = {
  children: React.ReactNode;
  variant?: BrandedBadgeVariant;
  className?: string;
};

export function BrandedBadge({
  children,
  variant = "default",
  className,
}: BrandedBadgeProps) {
  const { primaryColor } = useBranding();

  const style = getVariantStyles(variant, primaryColor);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}

function getVariantStyles(
  variant: BrandedBadgeVariant,
  primaryColor: string
): React.CSSProperties {
  switch (variant) {
    case "success":
      return { backgroundColor: "#D1FAE5", color: "#065F46" };
    case "warning":
      return { backgroundColor: "#FEF3C7", color: "#92400E" };
    case "error":
      return { backgroundColor: "#FEE2E2", color: "#991B1B" };
    case "outline":
      return {
        backgroundColor: "transparent",
        color: primaryColor,
        border: `1px solid ${primaryColor}`,
      };
    default:
      return { backgroundColor: `${primaryColor}15`, color: primaryColor };
  }
}
