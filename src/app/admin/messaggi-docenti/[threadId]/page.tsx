"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

type Message = {
  id: string;
  content: string;
  senderRole: string;
  senderName: string | null;
  createdAt: string;
};

export default function AdminThreadPage() {
  const params = useParams();
  const threadId = params.threadId as string;
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const threadQuery = useQuery({
    queryKey: ["admin-teacher-thread", threadId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/teacher-messages/${threadId}`);
      if (!res.ok) throw new Error("Errore");
      return (await res.json()) as {
        thread: { threadId: string; subject: string | null; teacherId: string; teacherName: string };
        messages: Message[];
      };
    },
    staleTime: 10_000,
  });

  const messages = threadQuery.data?.messages ?? [];
  const thread = threadQuery.data?.thread;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/teacher-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, content: reply.trim() }),
      });
      if (!res.ok) { toast.error("Errore invio"); return; }
      setReply("");
      void threadQuery.refetch();
    } catch {
      toast.error("Errore di connessione");
    } finally {
      setSending(false);
    }
  }, [reply, threadId, threadQuery]);

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="mb-4">
        <Link href="/admin/messaggi-docenti" className="text-xs text-primary">← Torna ai messaggi</Link>
        <h1 className="mt-1 text-lg font-semibold">
          {thread?.teacherName ?? "Docente"} — {thread?.subject || "Conversazione"}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 rounded-lg border bg-gray-50 p-4">
        {threadQuery.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          messages.map((m) => {
            const isAdmin = m.senderRole === "ADMIN";
            return (
              <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${isAdmin ? "bg-blue-50 border border-blue-200" : "bg-white border border-gray-200"}`}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-xs font-medium">{isAdmin ? "Tu (Admin)" : m.senderName || "Docente"}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <textarea rows={2} className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm resize-none" placeholder="Rispondi..." value={reply} onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
        />
        <button type="button" onClick={handleSend} disabled={sending || !reply.trim()} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
