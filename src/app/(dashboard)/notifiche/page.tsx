"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import ClientNotificationList, {
  type NotificationItem,
} from "@/components/ClientNotificationList";
import { LoadingTable } from "@/components/ui/loading-table";
import { BrandedButton } from "@/components/BrandedButton";
import { BrandedTabs } from "@/components/BrandedTabs";
import {
  CLIENT_NOTIFICATION_TYPES,
  type ClientNotificationType,
} from "@/lib/client-notification-types";

type FilterType =
  | "all"
  | "unread"
  | ClientNotificationType;

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
  if (
    filter !== "all" &&
    filter !== "unread" &&
    CLIENT_NOTIFICATION_TYPES.includes(filter as ClientNotificationType)
  ) {
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
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, isError } = useQuery<NotificationsResponse>({
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

  const getNotificationLink = (item: NotificationItem) => {
    if (item.ticketId) {
      return `/supporto/${item.ticketId}`;
    }

    if (item.courseEditionId) {
      return `/corsi/${item.courseEditionId}`;
    }

    if (
      item.type === "CERT_UPLOADED" ||
      item.type === "CERTIFICATES_AVAILABLE" ||
      item.type === "CERTIFICATE_EXPIRING_60D" ||
      item.type === "CERTIFICATE_EXPIRING_30D"
    ) {
      return "/attestati";
    }

    return null;
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await fetch(`/api/notifiche/${item.id}/read`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    const link = getNotificationLink(item);
    if (link) {
      router.push(link);
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
          { id: "NEW_EDITION", label: "Nuove edizioni" },
          { id: "DEADLINE_REMINDER_7D", label: "Scadenze" },
          { id: "DEADLINE_REMINDER_2D", label: "Urgenti 2gg" },
          { id: "CERTIFICATES_AVAILABLE", label: "Attestati" },
          { id: "CERTIFICATE_EXPIRING_30D", label: "Scadenze attestati" },
          { id: "REGISTRY_RECEIVED", label: "Anagrafiche" },
          { id: "EDITION_DATES_CHANGED", label: "Variazioni" },
          { id: "EDITION_CANCELLED", label: "Annullamenti" },
          { id: "TICKET_REPLY", label: "Supporto" },
          { id: "TICKET_STATUS_CHANGED", label: "Stato ticket" },
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

        {isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.
          </div>
        ) : isLoading ? (
          <LoadingTable rows={5} cols={2} />
        ) : data?.items.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-3 h-10 w-10 opacity-50" />
            Nessuna notifica
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-3">
            <ClientNotificationList
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
