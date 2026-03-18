"use client";

import { useCallback, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

type NewMessageModalProps = {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
};

export default function NewMessageModal({ open, onClose, onSent }: NewMessageModalProps) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("Oggetto e messaggio sono obbligatori");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/teacher/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), content: content.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Errore invio"); return; }
      toast.success("Messaggio inviato");
      setSubject("");
      setContent("");
      onSent();
      onClose();
    } catch {
      toast.error("Errore di connessione");
    } finally {
      setSending(false);
    }
  }, [subject, content, onSent, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="modal-panel border bg-white shadow-xl sm:max-w-lg">
        <div className="modal-header flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nuovo messaggio</h2>
          <button type="button" onClick={onClose} disabled={sending} className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="modal-body modal-scroll space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Oggetto <span className="text-red-400">*</span></span>
            <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="es. Domanda su orario lezione" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Messaggio <span className="text-red-400">*</span></span>
            <textarea rows={5} className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Scrivi il tuo messaggio..." />
          </label>
        </div>
        <div className="modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={sending} className="inline-flex min-h-[44px] items-center justify-center rounded-md border px-4 py-2 text-sm">Annulla</button>
          <button type="button" onClick={handleSend} disabled={sending || !subject.trim() || !content.trim()} className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
            {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Invio...</> : "Invia messaggio"}
          </button>
        </div>
      </div>
    </div>
  );
}
