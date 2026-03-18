"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageSquare, Search } from "lucide-react";

type Thread = {
  threadId: string;
  teacherId: string;
  teacherName: string;
  subject: string | null;
  lastMessage: { content: string; senderRole: string; senderName: string | null; createdAt: string };
  unreadCount: number;
  messagesCount: number;
};

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1} min fa`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h fa`;
  return new Date(d).toLocaleDateString("it-IT");
}

export default function AdminMessaggiDocentiPage() {
  const [search, setSearch] = useState("");

  const threadsQuery = useQuery({
    queryKey: ["admin-teacher-messages"],
    queryFn: async () => {
      const res = await fetch("/api/admin/teacher-messages");
      if (!res.ok) throw new Error("Errore");
      return (await res.json()) as { threads: Thread[] };
    },
    staleTime: 15_000,
  });

  const threads = (threadsQuery.data?.threads ?? []).filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (t.teacherName?.toLowerCase().includes(q)) ||
      (t.subject?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <MessageSquare className="h-5 w-5" />
          Messaggi Docenti
        </h1>
        <p className="text-sm text-muted-foreground">Comunicazioni con i docenti.</p>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca per docente o oggetto..." className="min-h-[44px] w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm" />
      </div>

      {threadsQuery.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : threads.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Nessun messaggio dai docenti.
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link key={t.threadId} href={`/admin/messaggi-docenti/${t.threadId}`}
              className={`block rounded-lg border p-3 transition-colors ${t.unreadCount > 0 ? "border-l-4 border-l-blue-500 bg-blue-50" : "bg-card hover:bg-muted/30"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm truncate ${t.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>
                    {t.teacherName} — {t.subject || "Senza oggetto"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(t.lastMessage.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {t.lastMessage.senderRole === "ADMIN" ? "Tu" : t.teacherName}: {t.lastMessage.content}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{t.messagesCount} messaggi</span>
                {t.unreadCount > 0 && (
                  <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] text-white">{t.unreadCount}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
