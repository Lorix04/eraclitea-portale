"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NotificationList, {
  type NotificationItem,
} from "@/components/NotificationList";
import { useMarkNotificationRead } from "@/hooks/useMarkNotificationRead";

export default function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const markAsRead = useMarkNotificationRead();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const [notifRes, countRes] = await Promise.all([
        fetch("/api/notifiche?limit=10"),
        fetch("/api/notifiche/count"),
      ]);
      if (!notifRes.ok || !countRes.ok) {
        throw new Error("Failed to fetch notifications");
      }
      const notificationsJson = await notifRes.json();
      const { unread } = await countRes.json();
      return { notifications: notificationsJson.items ?? [], unreadCount: unread };
    },
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const handleClickOutside = (event: MouseEvent) => {
    if (!dropdownRef.current) return;
    if (!dropdownRef.current.contains(event.target as Node)) {
      setOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      markAsRead.mutate(item.id);
    }
    setOpen(false);
    if (item.courseId) {
      router.push(`/corsi/${item.courseId}`);
      return;
    }
    router.push("/notifiche");
  };

  const unreadCount = data?.unreadCount ?? 0;
  const hasUnread = useMemo(() => unreadCount > 0, [unreadCount]);
  const items = data?.notifications?.slice(0, 5) ?? [];

  const handleReadAll = async () => {
    await fetch("/api/notifiche/read-all", { method: "POST" });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="relative z-50 notification-bell" ref={dropdownRef}>
      <button
        type="button"
        aria-label={`Notifiche${hasUnread ? `, ${unreadCount} non lette` : ""}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border bg-background"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell className="h-5 w-5" />
        {hasUnread ? (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-80 rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-medium">Notifiche</p>
            <div className="flex items-center gap-2 text-xs">
              {hasUnread ? (
                <button
                  type="button"
                  className="link-brand"
                  onClick={handleReadAll}
                >
                  Segna tutte
                </button>
              ) : null}
              <Link href="/notifiche" className="link-brand">
                Vedi tutte
              </Link>
            </div>
          </div>
          <div className="max-h-[360px] overflow-auto p-2">
            {isLoading ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Caricamento...
              </p>
            ) : (
              <NotificationList
                items={items}
                onItemClick={handleItemClick}
                compact
                emptyText="Nessuna notifica recente"
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
