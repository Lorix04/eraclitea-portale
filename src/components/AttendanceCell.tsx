"use client";

import { useRef } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  MessageSquare,
  Minus,
  X,
} from "lucide-react";
import { AttendanceStatus } from "@/types";
import { getEffectiveHours } from "@/lib/attendance-utils";
import { cn } from "@/lib/utils";

interface AttendanceCellProps {
  status?: AttendanceStatus | null;
  durationHours: number;
  hoursAttended?: number | null;
  notes?: string | null;
  readonly?: boolean;
  onToggle?: () => void;
  onContextMenuRequest?: (coordinates: { x: number; y: number }) => void;
}

function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export function AttendanceCell({
  status,
  durationHours,
  hoursAttended,
  notes,
  readonly = false,
  onToggle,
  onContextMenuRequest,
}: AttendanceCellProps) {
  const cellRef = useRef<HTMLButtonElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const hasStatus = Boolean(status);
  const effectiveStatus: AttendanceStatus = status ?? "ABSENT";
  const showHours =
    effectiveStatus === "PRESENT" || effectiveStatus === "ABSENT_JUSTIFIED";
  const effectiveHours = showHours
    ? getEffectiveHours(
        {
          status: effectiveStatus,
          hoursAttended: hoursAttended ?? null,
        },
        durationHours
      )
    : 0;
  const isPartial = showHours && effectiveHours < durationHours;
  const hasNotes = Boolean(notes?.trim());

  const statusClasses = !hasStatus
    ? "border-gray-200 bg-gray-50 text-gray-600"
    : effectiveStatus === "ABSENT"
      ? "border-red-300 bg-red-100 text-red-700"
      : effectiveStatus === "ABSENT_JUSTIFIED"
        ? "border-blue-300 bg-blue-100 text-blue-700"
        : isPartial
          ? "border-amber-300 bg-amber-100 text-amber-700"
          : "border-emerald-300 bg-emerald-100 text-emerald-700";

  const renderStatusIcon = () => {
    if (!hasStatus) return <Minus className="h-4 w-4" />;
    if (effectiveStatus === "ABSENT") return <X className="h-4 w-4" />;
    if (effectiveStatus === "ABSENT_JUSTIFIED") {
      return <AlertCircle className="h-4 w-4" />;
    }
    return <Check className="h-4 w-4" />;
  };

  const openContextMenuAt = (x: number, y: number) => {
    if (readonly || !onContextMenuRequest) return;
    onContextMenuRequest({ x, y });
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    openContextMenuAt(event.clientX, event.clientY);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = () => {
    if (readonly || !onContextMenuRequest) return;
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      const rect = cellRef.current?.getBoundingClientRect();
      if (!rect) return;
      longPressTriggeredRef.current = true;
      openContextMenuAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }, 500);
  };

  return (
    <button
      ref={cellRef}
      type="button"
      className={cn(
        "h-10 w-full min-w-[120px] rounded-md border px-2 transition-colors",
        "hover:brightness-[0.98]",
        "inline-flex items-center justify-between gap-2 text-xs font-semibold",
        statusClasses,
        readonly ? "cursor-default" : "cursor-pointer"
      )}
      onClick={() => {
        if (readonly) return;
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          return;
        }
        onToggle?.();
      }}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={clearLongPressTimer}
      onTouchCancel={clearLongPressTimer}
      title={hasNotes ? notes ?? undefined : undefined}
      aria-label="Cella presenza"
    >
      <span className="inline-flex items-center gap-1.5">
        {renderStatusIcon()}
        {showHours ? <span>{formatHours(effectiveHours)}</span> : null}
      </span>

      <span className="inline-flex items-center gap-1">
        {isPartial ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> : null}
        {hasNotes ? <MessageSquare className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
}
