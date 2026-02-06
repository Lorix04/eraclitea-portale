"use client";

import Link, { type LinkProps } from "next/link";
import { cn } from "@/lib/utils";
import { useBranding } from "@/components/BrandingProvider";

type BrandedLinkProps = LinkProps & {
  children: React.ReactNode;
  className?: string;
};

export function BrandedLink({ children, className, ...props }: BrandedLinkProps) {
  const { primaryColor } = useBranding();

  return (
    <Link
      className={cn("transition-colors hover:underline", className)}
      style={{ color: primaryColor }}
      {...props}
    >
      {children}
    </Link>
  );
}
