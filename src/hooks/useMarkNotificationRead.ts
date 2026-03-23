import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useMarkNotificationRead(isTeacher = false) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const endpoint = isTeacher
        ? `/api/teacher/notifications/${notificationId}/read`
        : `/api/notifiche/${notificationId}/read`;
      await fetch(endpoint, { method: "POST" });
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData(["notifications"]);

      queryClient.setQueryData(["notifications"], (old: any) => ({
        ...(old || {}),
        notifications: (old?.notifications || []).map((item: any) =>
          item.id === notificationId ? { ...item, isRead: true } : item
        ),
        unreadCount: Math.max(0, (old?.unreadCount || 0) - 1),
      }));

      return { previous };
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notifications"], context.previous);
      }
    },
  });
}
