"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  LifeBuoy,
  Loader2,
  Paperclip,
  Send,
} from "lucide-react";
import { toast } from "sonner";
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

type TicketMessage = {
  id: string;
  senderId: string;
  message: string;
  attachments: string[];
  createdAt: string;
  sender: {
    id: string;
    email: string;
    role: "ADMIN" | "CLIENT";
    name: string;
  };
};

type TicketDetails = {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  messages: TicketMessage[];
};

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

function getAttachmentUrl(relativePath: string) {
  const encoded = relativePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/api/tickets/attachments/${encoded}`;
}

function isImageAttachment(relativePath: string) {
  return /\.(png|jpg|jpeg|webp)$/i.test(relativePath);
}

function getAttachmentName(relativePath: string) {
  const segments = relativePath.split("/");
  return segments[segments.length - 1] ?? relativePath;
}

async function fetchTicket(ticketId: string) {
  const response = await fetch(`/api/tickets/${ticketId}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("NOT_FOUND");
    }
    if (response.status === 403) {
      throw new Error("FORBIDDEN");
    }
    throw new Error("LOAD_ERROR");
  }
  return (await response.json()) as TicketDetails;
}

export default function SupportoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tickets", "detail", params.id],
    queryFn: () => fetchTicket(params.id),
  });

  const isClosed = data?.status === "CLOSED";
  const isResolved = data?.status === "RESOLVED";

  const validationError = useMemo(() => {
    if (!message.trim()) return "Scrivi un messaggio";
    if (files.length > TICKET_ATTACHMENT_MAX_FILES) {
      return `Puoi allegare massimo ${TICKET_ATTACHMENT_MAX_FILES} file`;
    }
    for (const file of files) {
      if (!TICKET_ATTACHMENT_ALLOWED_TYPES.has(file.type)) {
        return `Tipo non supportato: ${file.name}`;
      }
      if (file.size > TICKET_ATTACHMENT_MAX_SIZE_BYTES) {
        return `File troppo grande (max 5MB): ${file.name}`;
      }
    }
    return null;
  }, [files, message]);

  const handleSend = async () => {
    setSendError(null);
    if (!data || isClosed) return;
    if (validationError) {
      setSendError(validationError);
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("message", message.trim());
      files.forEach((file) => formData.append("attachments", file));

      const response = await fetch(`/api/tickets/${data.id}/messages`, {
        method: "POST",
        body: formData,
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSendError(
          typeof json.error === "string"
            ? json.error
            : "Errore durante l'invio del messaggio"
        );
        return;
      }

      setMessage("");
      setFiles([]);
      toast.success("Messaggio inviato");
      await queryClient.invalidateQueries({ queryKey: ["tickets", "detail", data.id] });
      await queryClient.invalidateQueries({ queryKey: ["tickets", "client"] });
    } catch {
      setSendError("Errore durante l'invio del messaggio");
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
        Caricamento ticket...
      </div>
    );
  }

  if (isError) {
    const messageKey = (error as Error)?.message;
    const friendlyMessage =
      messageKey === "NOT_FOUND"
        ? "Ticket non trovato."
        : messageKey === "FORBIDDEN"
          ? "Non autorizzato ad accedere a questo ticket."
          : "Si e verificato un errore nel caricamento del ticket.";
    return (
      <div className="space-y-3">
        <Link
          href="/supporto"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna a Supporto
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {friendlyMessage}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <Link
        href="/supporto"
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna a Supporto
      </Link>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-lg font-semibold">
              Ticket #{data.id.slice(-6).toUpperCase()} - {data.subject}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-muted px-2 py-0.5">
                {TICKET_CATEGORY_LABELS[data.category]}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${getStatusClasses(
                  data.status
                )}`}
              >
                {TICKET_STATUS_LABELS[data.status]}
              </span>
              <span className="text-muted-foreground">
                Aperto il {new Date(data.createdAt).toLocaleDateString("it-IT")}
              </span>
            </div>
          </div>
          <LifeBuoy className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      {isResolved ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <p className="font-medium">Il ticket e stato risolto.</p>
          <p>Se rispondi alla conversazione, il ticket verra riaperto automaticamente.</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {data.messages.map((item) => {
          const isOwnMessage = item.senderId === session?.user?.id;
          return (
            <div
              key={item.id}
              className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`w-full max-w-3xl rounded-lg border p-3 text-sm ${
                  isOwnMessage
                    ? "border-primary/30 bg-primary/10"
                    : "border-border bg-card"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">
                    {isOwnMessage
                      ? "Tu"
                      : item.sender.role === "ADMIN"
                        ? "Supporto"
                        : item.sender.name}
                  </span>
                  <span
                    className="text-muted-foreground"
                    title={new Date(item.createdAt).toLocaleString("it-IT")}
                  >
                    {formatRelativeDate(item.createdAt)}
                  </span>
                </div>

                <p className="whitespace-pre-wrap">{item.message}</p>

                {item.attachments.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {item.attachments.map((attachment) => {
                      const url = getAttachmentUrl(attachment);
                      const name = getAttachmentName(attachment);
                      if (isImageAttachment(attachment)) {
                        return (
                          <a
                            key={attachment}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden rounded-md border"
                            title={name}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={name}
                              className="max-h-64 w-auto object-contain"
                            />
                          </a>
                        );
                      }

                      return (
                        <a
                          key={attachment}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                          title={name}
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          {name}
                        </a>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 rounded-lg border bg-card p-3">
        {isClosed ? (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            Questo ticket e chiuso. Non e possibile inviare nuovi messaggi.
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Scrivi un messaggio..."
              disabled={sending}
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                <Paperclip className="h-4 w-4" />
                Allega file
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  disabled={sending}
                  onChange={(event) => {
                    const selected = Array.from(event.target.files ?? []);
                    setFiles(selected.slice(0, TICKET_ATTACHMENT_MAX_FILES));
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Invio...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Invia
                  </>
                )}
              </button>
            </div>

            {files.length > 0 ? (
              <div className="space-y-1 text-xs text-muted-foreground">
                {files.map((file) => (
                  <p key={file.name} className="inline-flex items-center gap-2 pr-3">
                    <Paperclip className="h-3.5 w-3.5" />
                    {file.name}
                  </p>
                ))}
              </div>
            ) : null}

            {sendError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {sendError}
              </div>
            ) : validationError ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                {validationError}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                PDF/JPG/PNG/WEBP, max 5MB per file (max 3)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

