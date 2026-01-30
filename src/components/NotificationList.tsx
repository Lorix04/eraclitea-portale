"use client";

import { Bell, BookOpen, FileCheck } from "lucide-react";

export type NotificationItem = {
  id: string;
  type: "COURSE_PUBLISHED" | "CERT_UPLOADED" | "REMINDER";
  title: string;
  message?: string;
  courseId?: string;
  createdAt: string | Date;
  isRead: boolean;
};

type NotificationListProps = {
  items: NotificationItem[];
  onItemClick?: (item: NotificationItem) => void;
  emptyText?: string;
  compact?: boolean;
};

const ICONS = {
  COURSE_PUBLISHED: BookOpen,
  CERT_UPLOADED: FileCheck,
  REMINDER: Bell,
};

function formatRelativeTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const diff = date.getTime() - Date.now();
  const minutes = Math.round(diff / 60000);
  const hours = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);

  const rtf = new Intl.RelativeTimeFormat("it", { numeric: "auto" });
  if (Math.abs(days) >= 1) return rtf.format(days, "day");
  if (Math.abs(hours) >= 1) return rtf.format(hours, "hour");
  if (Math.abs(minutes) < 1) return "adesso";
  return rtf.format(minutes, "minute");
}

export default function NotificationList({
  items,
  onItemClick,
  emptyText,
  compact,
}: NotificationListProps) {
  if (!items.length) {
    return (
      <p className="px-3 py-4 text-sm text-muted-foreground">
        {emptyText ?? "Nessuna notifica"}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = ICONS[item.type] ?? Bell;
        return (
          <button
            key={item.id}
            type="button"
            className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition hover:bg-muted/50 ${
              item.isRead ? "" : "bg-muted/30"
            }`}
            onClick={() => onItemClick?.(item)}
          >
            <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium">{item.title}</span>
              {!compact && item.message ? (
                <span className="text-xs text-muted-foreground">
                  {item.message}
                </span>
              ) : null}
              <span className="text-[11px] text-muted-foreground">
                {formatRelativeTime(item.createdAt)}
              </span>
            </span>
            {!item.isRead ? (
              <span className="mt-2 h-2 w-2 rounded-full bg-destructive" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
