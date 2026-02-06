"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import NotificationList, {
  type NotificationItem,
} from "@/components/NotificationList";
import { LoadingTable } from "@/components/ui/loading-table";
import { BrandedButton } from "@/components/BrandedButton";
import { BrandedTabs } from "@/components/BrandedTabs";

type FilterType =
  | "all"
  | "unread"
  | "COURSE_PUBLISHED"
  | "CERT_UPLOADED"
  | "REMINDER";

type NotificationsResponse = {
  items: NotificationItem[];
  totalCount: number;
  totalPages: number;
  page: number;
  unreadCount: number;
};

async function fetchNotifications(filter: FilterType, page: number) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "20");
  if (filter === "unread") params.set("unreadOnly", "true");
  if (["COURSE_PUBLISHED", "CERT_UPLOADED", "REMINDER"].includes(filter)) {
    params.set("type", filter);
  }

  const res = await fetch(`/api/notifiche?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch notifications");
  }
  return res.json();
}

export default function NotifichePage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery<NotificationsResponse>({
    queryKey: ["notifications", "list", filter, page],
    queryFn: () => fetchNotifications(filter, page),
    placeholderData: (prev) => prev,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifiche/read-all", { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to mark all as read");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Tutte le notifiche segnate come lette");
    },
    onError: () => {
      toast.error("Errore durante l'operazione");
    },
  });

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await fetch(`/api/notifiche/${item.id}/read`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (item.courseId) {
      window.location.href = `/corsi/${item.courseId}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Bell className="h-5 w-5" />
          Notifiche
        </h1>
        {data?.unreadCount ? (
          <BrandedButton
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            Segna tutte come lette ({data.unreadCount})
          </BrandedButton>
        ) : null}
      </div>

      <BrandedTabs
        tabs={[
          { id: "all", label: "Tutte" },
          { id: "unread", label: "Non lette" },
          { id: "COURSE_PUBLISHED", label: "Corsi" },
          { id: "CERT_UPLOADED", label: "Attestati" },
          { id: "REMINDER", label: "Promemoria" },
        ]}
        activeTab={filter}
        onTabChange={(value) => {
          setFilter(value as FilterType);
          setPage(1);
        }}
      />

      <div className="relative">
        {isFetching && !isLoading ? (
          <div className="absolute right-2 top-2 h-4 w-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        ) : null}

        {isLoading ? (
          <LoadingTable rows={5} cols={2} />
        ) : data?.items.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-3 h-10 w-10 opacity-50" />
            Nessuna notifica
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-3">
            <NotificationList
              items={data?.items ?? []}
              onItemClick={handleItemClick}
              emptyText="Nessuna notifica disponibile"
            />
          </div>
        )}
      </div>

      {data && data.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span>
            Pagina {page} di {data.totalPages}
          </span>
          <div className="flex gap-2">
            <BrandedButton
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Precedente
            </BrandedButton>
            <BrandedButton
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((prev) => Math.min(data.totalPages, prev + 1))}
            >
              Successiva
            </BrandedButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
