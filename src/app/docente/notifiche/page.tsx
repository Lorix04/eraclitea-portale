"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  CheckCheck,
  Clock,
  Loader2,
  MessageSquare,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  readAt: string | null;
  createdAt: string;
  courseEditionId: string | null;
};

const TYPE_ICONS: Record<string, typeof Bell> = {
  LESSON_ASSIGNED: BookOpen,
  LESSON_UPDATED: BookOpen,
  LESSON_CANCELLED: BookOpen,
  TEACHER_MESSAGE_RECEIVED: MessageSquare,
  ATTENDANCE_RECORDED: Clock,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ora";
  if (mins < 60) return `${mins} min fa`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? "ora" : "ore"} fa`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ieri";
  if (days < 7) return `${days} giorni fa`;
  return new Date(dateStr).toLocaleDateString("it-IT");
}

function getNotifLink(n: Notification): string | null {
  if (n.type === "TEACHER_MESSAGE_RECEIVED") return "/docente/messaggi";
  if (
    n.type === "LESSON_ASSIGNED" ||
    n.type === "LESSON_UPDATED" ||
    n.type === "LESSON_CANCELLED"
  )
    return "/docente/lezioni";
  return null;
}

export default function TeacherNotifichePage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);

  const notifQuery = useQuery({
    queryKey: ["teacher-notifications", filter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (filter === "unread") params.set("unreadOnly", "true");
      const res = await fetch(`/api/teacher/notifications?${params}`);
      if (!res.ok) throw new Error("Errore");
      return (await res.json()) as {
        notifications: Notification[];
        unreadCount: number;
        total: number;
      };
    },
    staleTime: 15_000,
  });

  const notifications = notifQuery.data?.notifications ?? [];
  const unreadCount = notifQuery.data?.unreadCount ?? 0;
  const total = notifQuery.data?.total ?? 0;
  const hasMore = notifications.length < total;

  const markRead = useCallback(
    async (id: string) => {
      await fetch(`/api/teacher/notifications/${id}/read`, { method: "PATCH" });
      void notifQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ["teacher-notif-unread"] });
    },
    [notifQuery, queryClient]
  );

  const markAllRead = useCallback(async () => {
    const res = await fetch("/api/teacher/notifications/read-all", {
      method: "POST",
    });
    if (res.ok) {
      toast.success("Tutte le notifiche segnate come lette");
      void notifQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ["teacher-notif-unread"] });
    }
  }, [notifQuery, queryClient]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Bell className="h-5 w-5" />
            Notifiche
          </h1>
          <p className="text-sm text-muted-foreground">
            Le tue notifiche recenti.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/docente/preferenze-notifiche"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Preferenze notifiche"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Preferenze</span>
          </Link>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Segna tutte come lette
          </button>
        )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setFilter("all"); setPage(1); }}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Tutte
        </button>
        <button
          type="button"
          onClick={() => { setFilter("unread"); setPage(1); }}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === "unread" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Non lette {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {/* List */}
      {notifQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Nessuna notifica.
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const isUnread = !n.readAt;
            const Icon = TYPE_ICONS[n.type] ?? Bell;
            const link = getNotifLink(n);

            const content = (
              <div
                className={`rounded-lg border p-3 transition-colors ${
                  isUnread
                    ? "border-l-4 border-l-blue-500 bg-blue-50"
                    : "bg-card hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isUnread ? "text-blue-600" : "text-muted-foreground"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${isUnread ? "font-semibold" : "font-medium"}`}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    {n.message && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {n.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );

            if (link) {
              return (
                <Link
                  key={n.id}
                  href={link}
                  onClick={() => { if (isUnread) void markRead(n.id); }}
                  className="block"
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={n.id}
                type="button"
                onClick={() => { if (isUnread) void markRead(n.id); }}
                className="block w-full text-left"
              >
                {content}
              </button>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            Carica altre
          </button>
        </div>
      )}
    </div>
  );
}
