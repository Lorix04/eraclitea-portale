"use client";

import {
  Archive,
  BookOpen,
  Eye,
  FileEdit,
  Lock,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

type EditionStatus = "DRAFT" | "OPEN" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

const statusConfig: Record<
  EditionStatus,
  {
    label: string;
    className: string;
    Icon: ComponentType<{ className?: string }>;
  }
> = {
  DRAFT: {
    label: "Bozza",
    className: "bg-gray-100 text-gray-600",
    Icon: FileEdit,
  },
  OPEN: {
    label: "Aperto",
    className: "bg-green-100 text-green-700",
    Icon: BookOpen,
  },
  PUBLISHED: {
    label: "Pubblicato",
    className: "bg-blue-100 text-blue-700",
    Icon: Eye,
  },
  CLOSED: {
    label: "Chiuso",
    className: "bg-amber-100 text-amber-700",
    Icon: Lock,
  },
  ARCHIVED: {
    label: "Archiviato",
    className: "bg-gray-200 text-gray-500",
    Icon: Archive,
  },
};

type EditionStatusBadgeProps = {
  status?: string | null;
  className?: string;
};

export default function EditionStatusBadge({
  status,
  className,
}: EditionStatusBadgeProps) {
  const normalized = (status || "").toUpperCase();
  const mappedStatus: EditionStatus =
    normalized === "OPEN"
      ? "OPEN"
      : normalized === "PUBLISHED"
      ? "PUBLISHED"
      : normalized === "CLOSED"
      ? "CLOSED"
      : normalized === "ARCHIVED"
      ? "ARCHIVED"
      : "DRAFT";

  const config = statusConfig[mappedStatus];
  const Icon = config.Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
