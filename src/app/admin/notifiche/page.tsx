"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { LoadingTable } from "@/components/ui/loading-table";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  courseEditionId?: string | null;
  ticketId?: string | null;
};

type NotificationsResponse = {
  items: NotificationItem[];
  totalCount: number;
  totalPages: number;
  page: number;
  unreadCount: number;
};

export default function AdminNotifichePage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ["admin-notifications", filter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (filter === "unread") params.set("unreadOnly", "true");
      const res = await fetch(`/api/notifiche?${params.toString()}`);
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifiche/read-all", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Tutte le notifiche segnate come lette");
    } catch {
      toast.error("Errore");
    }
  };

  const handleClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await fetch(`/api/notifiche/${item.id}/read`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (item.ticketId) {
      router.push(`/admin/ticket/${item.ticketId}`);
    } else if (item.courseEditionId) {
      router.push(`/admin/corsi`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Bell className="h-5 w-5" />
          Notifiche
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/preferenze-notifiche"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Preferenze notifiche"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Preferenze</span>
          </Link>
          {(data?.unreadCount ?? 0) > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Check className="h-3.5 w-3.5" />
              Segna tutte ({data?.unreadCount})
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => { setFilter(f); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "all" ? "Tutte" : "Non lette"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingTable rows={5} cols={1} />
      ) : !data?.items?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nessuna notifica.
        </p>
      ) : (
        <div className="space-y-2">
          {data.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item)}
              className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent/30 ${
                !item.isRead ? "border-primary/20 bg-primary/5" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-sm ${!item.isRead ? "font-semibold" : ""}`}>
                    {item.title}
                  </p>
                  {item.message ? (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.message}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </button>
          ))}

          {(data.totalPages ?? 1) > 1 ? (
            <div className="flex justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Precedente
              </button>
              <span className="px-2 py-1.5 text-xs text-muted-foreground">
                {page} / {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= (data.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Successiva
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
