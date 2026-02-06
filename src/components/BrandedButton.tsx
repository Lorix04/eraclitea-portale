"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useBranding } from "@/components/BrandingProvider";

type BrandedButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type BrandedButtonSize = "sm" | "md" | "lg";

export type BrandedButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: BrandedButtonVariant;
    size?: BrandedButtonSize;
    isActive?: boolean;
  };

export const BrandedButton = forwardRef<HTMLButtonElement, BrandedButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isActive = false,
      style,
      type = "button",
      ...props
    },
    ref
  ) => {
    const { primaryColor, secondaryColor } = useBranding();

    const sizeClasses: Record<BrandedButtonSize, string> = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    const variantStyles = getVariantStyles({
      variant,
      isActive,
      primaryColor,
      secondaryColor,
    });

    const buttonStyle: React.CSSProperties = {
      backgroundColor: variantStyles.backgroundColor,
      color: variantStyles.color,
      border: variantStyles.border,
      ...(style || {}),
      ["--hover-bg" as any]: variantStyles.hoverBg,
      ["--ring-color" as any]: primaryColor,
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "branded-button inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          sizeClasses[size],
          className
        )}
        style={buttonStyle}
        {...props}
      />
    );
  }
);

BrandedButton.displayName = "BrandedButton";

type VariantStyleInput = {
  variant: BrandedButtonVariant;
  isActive: boolean;
  primaryColor: string;
  secondaryColor: string;
};

type VariantStyleOutput = {
  backgroundColor: string;
  color: string;
  border: string;
  hoverBg: string;
};

function getVariantStyles({
  variant,
  isActive,
  primaryColor,
  secondaryColor,
}: VariantStyleInput): VariantStyleOutput {
  switch (variant) {
    case "secondary":
      return {
        backgroundColor: secondaryColor,
        color: "#FFFFFF",
        border: "none",
        hoverBg: adjustColor(secondaryColor, -10),
      };
    case "outline":
      return {
        backgroundColor: "transparent",
        color: primaryColor,
        border: `1px solid ${primaryColor}`,
        hoverBg: `${primaryColor}10`,
      };
    case "ghost":
      if (isActive) {
        return {
          backgroundColor: primaryColor,
          color: "#FFFFFF",
          border: "none",
          hoverBg: adjustColor(primaryColor, -10),
        };
      }
      return {
        backgroundColor: "transparent",
        color: "inherit",
        border: "1px solid #E5E7EB",
        hoverBg: `${primaryColor}15`,
      };
    default:
      return {
        backgroundColor: primaryColor,
        color: "#FFFFFF",
        border: "none",
        hoverBg: adjustColor(primaryColor, -10),
      };
  }
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
