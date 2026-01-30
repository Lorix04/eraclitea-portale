"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationItem } from "@/components/NotificationList";

type UseNotificationsReturn = {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useNotifications(pollInterval = 30000): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        fetch("/api/notifiche?limit=10"),
        fetch("/api/notifiche/count"),
      ]);

      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.data ?? []);
      }
      if (countRes.ok) {
        const countData = await countRes.json();
        setUnreadCount(countData.unread ?? 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, pollInterval);
    return () => clearInterval(interval);
  }, [fetchNotifications, pollInterval]);

  useEffect(() => {
    const handleFocus = () => fetchNotifications();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifiche/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await fetch("/api/notifiche/read-all", { method: "POST" });
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
