"use client";

import { AttendanceStatus } from "@/types";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_ORDER: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "ABSENT_JUSTIFIED",
];

const STATUS_CLASSES: Record<AttendanceStatus, string> = {
  PRESENT: "bg-green-100 text-green-700 border-green-200",
  ABSENT: "bg-red-100 text-red-700 border-red-200",
  ABSENT_JUSTIFIED: "bg-green-100 text-green-700 border-green-200",
};

type DisplayStatus = AttendanceStatus | "UNRECORDED";

interface AttendanceCellProps {
  status?: AttendanceStatus | null;
  notes?: string | null;
  readonly?: boolean;
  onChange?: (status: AttendanceStatus) => void;
  onOpenNotes?: () => void;
}

export function AttendanceCell({
  status,
  notes,
  readonly = false,
  onChange,
  onOpenNotes,
}: AttendanceCellProps) {
  const displayStatus: DisplayStatus = status ?? "UNRECORDED";

  const handleClick = () => {
    if (readonly || !onChange) return;
    const baseStatus: AttendanceStatus = status ?? "PRESENT";
    const currentIndex = STATUS_ORDER.indexOf(baseStatus);
    const nextStatus =
      STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
    onChange(nextStatus);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    if (readonly || !onOpenNotes) return;
    event.preventDefault();
    onOpenNotes();
  };

  return (
    <button
      type="button"
      className={cn(
        "flex h-8 w-full items-center justify-center rounded-md border text-xs font-semibold",
        displayStatus === "UNRECORDED"
          ? "bg-gray-50 text-gray-500 border-gray-200"
          : STATUS_CLASSES[displayStatus],
        readonly && "cursor-default"
      )}
      title={notes ? `Note: ${notes}` : undefined}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {displayStatus === "UNRECORDED" ? (
        <span aria-label="Non registrato">-</span>
      ) : displayStatus === "ABSENT" ? (
        <X className="h-3.5 w-3.5" aria-label="Assente" />
      ) : (
        <Check className="h-3.5 w-3.5" aria-label="Presente" />
      )}
    </button>
  );
}
