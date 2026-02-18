"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NotificationList, {
  type NotificationItem,
} from "@/components/NotificationList";
import { useMarkNotificationRead } from "@/hooks/useMarkNotificationRead";
import { Skeleton } from "@/components/ui/Skeleton";

export default function NotificationBell() {
  const { data: session } = useSession();
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
    const isAdmin = session?.user?.role === "ADMIN";

    if (!isAdmin && !item.isRead) {
      markAsRead.mutate(item.id);
    }
    setOpen(false);

    if (isAdmin) {
      if (item.ticketId) {
        router.push(`/admin/ticket/${item.ticketId}`);
        return;
      }
      if (
        item.type === "CERT_UPLOADED" ||
        item.type === "CERTIFICATES_AVAILABLE" ||
        item.type === "CERTIFICATE_EXPIRING_60D" ||
        item.type === "CERTIFICATE_EXPIRING_30D"
      ) {
        router.push("/admin/attestati");
        return;
      }
      if (item.courseEditionId) {
        router.push("/admin/edizioni");
        return;
      }
      router.push("/admin");
      return;
    }

    if (item.ticketId) {
      router.push(`/supporto/${item.ticketId}`);
      return;
    }

    if (
      item.type === "CERT_UPLOADED" ||
      item.type === "CERTIFICATES_AVAILABLE" ||
      item.type === "CERTIFICATE_EXPIRING_60D" ||
      item.type === "CERTIFICATE_EXPIRING_30D"
    ) {
      router.push("/attestati");
      return;
    }
    if (item.courseEditionId) {
      router.push(`/corsi/${item.courseEditionId}`);
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
              {hasUnread && session?.user?.role !== "ADMIN" ? (
                <button
                  type="button"
                  className="link-brand"
                  onClick={handleReadAll}
                >
                  Segna tutte
                </button>
              ) : null}
              <Link
                href={session?.user?.role === "ADMIN" ? "/admin/ticket" : "/notifiche"}
                className="link-brand"
              >
                Vedi tutte
              </Link>
            </div>
          </div>
          <div className="max-h-[360px] overflow-auto p-2">
            {isLoading ? (
              <div className="space-y-2 px-2 py-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`notification-skeleton-${index}`}
                    className="rounded-md border border-gray-200 bg-white p-3"
                  >
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="mt-2 h-3 w-1/2" />
                  </div>
                ))}
              </div>
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
