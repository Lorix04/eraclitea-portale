"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageSquare, Plus } from "lucide-react";
import NewMessageModal from "@/components/teacher/NewMessageModal";

type Thread = {
  threadId: string;
  subject: string | null;
  lastMessage: { content: string; senderRole: string; senderName: string | null; createdAt: string };
  unreadCount: number;
  messagesCount: number;
  createdAt: string;
};

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1} min fa`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h fa`;
  return new Date(d).toLocaleDateString("it-IT");
}

export default function TeacherMessaggiPage() {
  const [modalOpen, setModalOpen] = useState(false);

  const threadsQuery = useQuery({
    queryKey: ["teacher-messages"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/messages");
      if (!res.ok) throw new Error("Errore");
      return (await res.json()) as { threads: Thread[]; totalUnread: number };
    },
    staleTime: 15_000,
  });

  const threads = threadsQuery.data?.threads ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <MessageSquare className="h-5 w-5" />
            Messaggi
          </h1>
          <p className="text-sm text-muted-foreground">Comunicazioni con la segreteria.</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Nuovo messaggio
        </button>
      </div>

      {threadsQuery.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : threads.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Nessun messaggio. Inizia una nuova conversazione.
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={t.threadId}
              href={`/docente/messaggi/${t.threadId}`}
              className={`block rounded-lg border p-3 transition-colors ${
                t.unreadCount > 0
                  ? "border-l-4 border-l-blue-500 bg-blue-50"
                  : "bg-card hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm truncate ${t.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>
                  {t.subject || "Senza oggetto"}
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(t.lastMessage.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {t.lastMessage.senderRole === "TEACHER" ? "Tu" : t.lastMessage.senderName || "Admin"}: {t.lastMessage.content}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{t.messagesCount} messaggi</span>
                {t.unreadCount > 0 && (
                  <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] text-white">
                    {t.unreadCount} {t.unreadCount === 1 ? "nuovo" : "nuovi"}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <NewMessageModal open={modalOpen} onClose={() => setModalOpen(false)} onSent={() => void threadsQuery.refetch()} />
    </div>
  );
}
