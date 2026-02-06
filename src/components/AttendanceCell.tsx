"use client";

import { AttendanceStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_ORDER: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "ABSENT_JUSTIFIED",
];

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "P",
  ABSENT: "A",
  ABSENT_JUSTIFIED: "G",
};

const STATUS_CLASSES: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700",
  ABSENT: "bg-red-100 text-red-700",
  ABSENT_JUSTIFIED: "bg-amber-100 text-amber-700",
};

interface AttendanceCellProps {
  status: AttendanceStatus;
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
  const handleClick = () => {
    if (readonly || !onChange) return;
    const currentIndex = STATUS_ORDER.indexOf(status);
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
        STATUS_CLASSES[status],
        readonly && "cursor-default"
      )}
      title={notes ? `Note: ${notes}` : undefined}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {STATUS_LABELS[status]}
    </button>
  );
}
