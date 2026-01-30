import { useQuery } from "@tanstack/react-query";

export function useNotificationsQuery() {
  return useQuery({
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
    refetchInterval: 30 * 1000,
  });
}
