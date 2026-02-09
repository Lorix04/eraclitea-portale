"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormLabelProps {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}

export function FormLabel({
  children,
  required = false,
  htmlFor,
  className,
}: FormLabelProps) {
  return (
    <label htmlFor={htmlFor} className={cn("text-sm font-medium", className)}>
      {children}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </label>
  );
}
