"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, LifeBuoy, Loader2, MessageSquare, Paperclip, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import {
  TICKET_ATTACHMENT_ALLOWED_TYPES,
  TICKET_ATTACHMENT_MAX_FILES,
  TICKET_ATTACHMENT_MAX_SIZE_BYTES,
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/tickets";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type TicketCategory =
  | "TECHNICAL"
  | "INFO_REQUEST"
  | "REGISTRY"
  | "CERTIFICATES"
  | "BILLING"
  | "OTHER";

type TicketListItem = {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  messagesCount: number;
  lastMessage?: {
    id: string;
    message: string;
    createdAt: string;
  } | null;
};

type Filter = "all" | "open" | "resolved" | "closed";

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const diff = date.getTime() - Date.now();
  const minutes = Math.round(diff / 60000);
  const hours = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);
  const rtf = new Intl.RelativeTimeFormat("it", { numeric: "auto" });

  if (Math.abs(days) >= 1) return rtf.format(days, "day");
  if (Math.abs(hours) >= 1) return rtf.format(hours, "hour");
  if (Math.abs(minutes) < 1) return "adesso";
  return rtf.format(minutes, "minute");
}

function getStatusClasses(status: TicketStatus) {
  switch (status) {
    case "OPEN":
      return "bg-blue-100 text-blue-700";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-700";
    case "RESOLVED":
      return "bg-green-100 text-green-700";
    case "CLOSED":
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function NewTicketModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (ticketId: string) => void;
}) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("TECHNICAL");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!open) return null;

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!subject.trim()) {
      nextErrors.subject = "L'oggetto e obbligatorio";
    } else if (subject.trim().length > 200) {
      nextErrors.subject = "Massimo 200 caratteri";
    }

    if (!message.trim()) {
      nextErrors.message = "Il messaggio e obbligatorio";
    } else if (message.trim().length < 10) {
      nextErrors.message = "Inserisci almeno 10 caratteri";
    }

    if (files.length > TICKET_ATTACHMENT_MAX_FILES) {
      nextErrors.attachments = `Massimo ${TICKET_ATTACHMENT_MAX_FILES} allegati`;
    }

    for (const file of files) {
      if (!TICKET_ATTACHMENT_ALLOWED_TYPES.has(file.type)) {
        nextErrors.attachments = `Tipo non supportato: ${file.name}`;
        break;
      }
      if (file.size > TICKET_ATTACHMENT_MAX_SIZE_BYTES) {
        nextErrors.attachments = `File troppo grande (max 5MB): ${file.name}`;
        break;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("subject", subject.trim());
      formData.append("category", category);
      formData.append("message", message.trim());
      files.forEach((file) => formData.append("attachments", file));

      const response = await fetch("/api/tickets", {
        method: "POST",
        body: formData,
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSubmitError(
          typeof json.error === "string"
            ? json.error
            : "Errore durante la creazione del ticket"
        );
        return;
      }

      const ticketId: string | undefined =
        json?.data?.id ?? json?.id;
      if (!ticketId) {
        setSubmitError("Ticket creato ma risposta non valida");
        return;
      }

      toast.success("Ticket aperto con successo");
      onCreated(ticketId);
    } catch {
      setSubmitError("Errore durante la creazione del ticket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        <div
          className="w-full max-w-2xl rounded-lg border bg-card shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-base font-semibold">Nuovo ticket</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 hover:bg-muted"
              disabled={saving}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Oggetto *</label>
              <input
                className="min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Es. Problema upload anagrafiche"
                value={subject}
                maxLength={200}
                onChange={(event) => setSubject(event.target.value)}
                disabled={saving}
              />
              {errors.subject ? (
                <p className="text-xs text-red-600">{errors.subject}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria *</label>
              <select
                className="min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={category}
                onChange={(event) => setCategory(event.target.value as TicketCategory)}
                disabled={saving}
              >
                {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Messaggio *</label>
              <textarea
                className="min-h-[140px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Descrivi il problema in dettaglio..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={saving}
              />
              {errors.message ? (
                <p className="text-xs text-red-600">{errors.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Allegati (opzionale)</label>
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                multiple
                className="min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []);
                  setFiles(selected.slice(0, TICKET_ATTACHMENT_MAX_FILES));
                }}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                PDF/JPG/PNG/WEBP, max 5MB per file, max 3 file
              </p>
              {files.length > 0 ? (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {files.map((file) => (
                    <li key={file.name} className="flex items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5" />
                      <span className="truncate">{file.name}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {errors.attachments ? (
                <p className="text-xs text-red-600">{errors.attachments}</p>
              ) : null}
            </div>

            {submitError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {submitError}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-md border px-3 py-2 text-sm"
              disabled={saving}
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione...
                </>
              ) : (
                "Apri ticket"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function fetchTickets(search?: string) {
  const params = new URLSearchParams();
  if (search?.trim()) {
    params.set("search", search.trim());
  }
  const response = await fetch(`/api/tickets?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Errore nel caricamento ticket");
  }
  return (await response.json()) as TicketListItem[];
}

export default function SupportoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showNewModal, setShowNewModal] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["tickets", "client", debouncedSearch],
    queryFn: () => fetchTickets(debouncedSearch),
    placeholderData: (previous) => previous,
  });

  const filteredTickets = useMemo(() => {
    const tickets = data ?? [];
    if (filter === "all") return tickets;
    if (filter === "open") {
      return tickets.filter(
        (ticket) => ticket.status === "OPEN" || ticket.status === "IN_PROGRESS"
      );
    }
    if (filter === "resolved") {
      return tickets.filter((ticket) => ticket.status === "RESOLVED");
    }
    return tickets.filter((ticket) => ticket.status === "CLOSED");
  }, [data, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <LifeBuoy className="h-5 w-5" />
            Supporto
          </h1>
          <p className="text-sm text-muted-foreground">
            Apri un ticket e conversa con il team di supporto.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
          onClick={() => setShowNewModal(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Ticket
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all" as const, label: "Tutti" },
          { id: "open" as const, label: "Aperti" },
          { id: "resolved" as const, label: "Risolti" },
          { id: "closed" as const, label: "Chiusi" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`min-h-[44px] rounded-md border px-3 py-2 text-sm ${
              filter === item.id
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {item.label}
          </button>
        ))}

        <div className="ml-auto w-full sm:w-auto">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca per oggetto..."
            className="min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm sm:w-72"
          />
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Si e verificato un errore nel caricamento dei ticket.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
          Caricamento ticket...
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          <HelpCircle className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>Nessun ticket.</p>
          <p className="mt-1">
            Hai bisogno di aiuto? Apri un nuovo ticket.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/supporto/${ticket.id}`}
              className="block rounded-lg border bg-card p-4 transition hover:bg-muted/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(
                        ticket.status
                      )}`}
                    >
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {TICKET_CATEGORY_LABELS[ticket.category]}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium">{ticket.subject}</p>
                  {ticket.lastMessage?.message ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {ticket.lastMessage.message}
                    </p>
                  ) : null}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p title={new Date(ticket.updatedAt).toLocaleString("it-IT")}>
                    {formatRelativeDate(ticket.updatedAt)}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {ticket.messagesCount} messaggi
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {isFetching && !isLoading ? (
        <p className="text-xs text-muted-foreground">Aggiornamento in corso...</p>
      ) : null}

      <NewTicketModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={(ticketId) => {
          setShowNewModal(false);
          queryClient.invalidateQueries({ queryKey: ["tickets"] });
          router.push(`/supporto/${ticketId}`);
        }}
      />
    </div>
  );
}

