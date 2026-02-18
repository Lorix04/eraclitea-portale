"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  TICKET_PRIORITY_LABELS,
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
type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type AdminOption = {
  id: string;
  name: string;
  email: string;
};

type TicketMessage = {
  id: string;
  senderId: string;
  message: string;
  attachments: string[];
  createdAt: string;
  sender: {
    id: string;
    role: "ADMIN" | "CLIENT";
    name: string;
    email: string;
  };
};

type TicketDetails = {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  client: {
    id: string;
    email: string;
    name: string;
  };
  assignedTo: {
    id: string;
    name: string;
  } | null;
  messages: TicketMessage[];
  adminOptions: AdminOption[];
};

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

function getStatusBadgeClass(status: TicketStatus) {
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

function getPriorityBadgeClass(priority: TicketPriority) {
  switch (priority) {
    case "LOW":
      return "bg-gray-100 text-gray-700";
    case "MEDIUM":
      return "bg-blue-100 text-blue-700";
    case "HIGH":
      return "bg-orange-100 text-orange-700";
    case "URGENT":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
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

async function fetchTicket(id: string) {
  const response = await fetch(`/api/tickets/${id}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error("NOT_FOUND");
    if (response.status === 403) throw new Error("FORBIDDEN");
    throw new Error("LOAD_ERROR");
  }
  return (await response.json()) as TicketDetails;
}

export default function AdminTicketDetailPage({ params }: { params: { id: string } }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TicketStatus>("OPEN");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [assignedToId, setAssignedToId] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tickets", "admin", "detail", params.id],
    queryFn: () => fetchTicket(params.id),
  });

  useEffect(() => {
    if (!data) return;
    setStatus(data.status);
    setPriority(data.priority);
    setAssignedToId(data.assignedTo?.id ?? "");
  }, [data]);

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

  const hasChanges =
    !!data &&
    (status !== data.status ||
      priority !== data.priority ||
      assignedToId !== (data.assignedTo?.id ?? ""));

  const handleSave = async (forcedStatus?: TicketStatus) => {
    if (!data) return;
    setSaveError(null);
    setSaving(true);

    try {
      const nextStatus = forcedStatus ?? status;
      const response = await fetch(`/api/tickets/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          priority,
          assignedToId: assignedToId || null,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSaveError(
          typeof json.error === "string"
            ? json.error
            : "Errore durante il salvataggio"
        );
        return;
      }

      toast.success("Ticket aggiornato");
      await queryClient.invalidateQueries({
        queryKey: ["tickets", "admin", "detail", data.id],
      });
      await queryClient.invalidateQueries({ queryKey: ["tickets", "admin"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      setSaveError("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!data) return;
    const confirmed = window.confirm(
      "Sei sicuro di voler chiudere questo ticket?"
    );
    if (!confirmed) return;
    setStatus("CLOSED");
    await handleSave("CLOSED");
  };

  const handleSendMessage = async () => {
    if (!data) return;
    setSendError(null);
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
            : "Errore durante l'invio"
        );
        return;
      }

      setMessage("");
      setFiles([]);
      toast.success("Risposta inviata");
      await queryClient.invalidateQueries({
        queryKey: ["tickets", "admin", "detail", data.id],
      });
      await queryClient.invalidateQueries({ queryKey: ["tickets", "admin"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      setSendError("Errore durante l'invio");
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
    const errorCode = (error as Error)?.message;
    const message =
      errorCode === "NOT_FOUND"
        ? "Ticket non trovato."
        : errorCode === "FORBIDDEN"
          ? "Non autorizzato ad accedere a questo ticket."
          : "Si e verificato un errore nel caricamento del ticket.";

    return (
      <div className="space-y-3">
        <Link
          href="/admin/ticket"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna ai ticket
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {message}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/ticket"
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna ai ticket
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
                className={`rounded-full px-2 py-0.5 font-medium ${getStatusBadgeClass(
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <div className="space-y-3">
            {data.messages.map((item) => {
              const isAdminMessage = item.sender.role === "ADMIN";
              return (
                <div
                  key={item.id}
                  className={`flex ${isAdminMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`w-full max-w-3xl rounded-lg border p-3 text-sm ${
                      isAdminMessage
                        ? "border-primary/30 bg-primary/10"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium">
                        {isAdminMessage ? "Supporto" : data.client.name}
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
            {data.status === "CLOSED" ? (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                Ticket chiuso: inviando una risposta verra riaperto automaticamente.
              </div>
            ) : null}

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-[110px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Scrivi una risposta..."
              disabled={sending}
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
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
                onClick={handleSendMessage}
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
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {files.map((file) => (
                  <p key={file.name} className="inline-flex items-center gap-2 pr-3">
                    <Paperclip className="h-3.5 w-3.5" />
                    {file.name}
                  </p>
                ))}
              </div>
            ) : null}

            {sendError ? (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {sendError}
              </div>
            ) : validationError ? (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                {validationError}
              </div>
            ) : (
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                PDF/JPG/PNG/WEBP, max 5MB per file (max 3)
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-4 text-sm font-semibold">Dettagli ticket</h2>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Stato
                </label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as TicketStatus)}
                  className="min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((value) => (
                    <option key={value} value={value}>
                      {TICKET_STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Priorita
                </label>
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as TicketPriority)
                  }
                  className="min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map(
                    (value) => (
                      <option key={value} value={value}>
                        {TICKET_PRIORITY_LABELS[value]}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Assegnato a
                </label>
                <select
                  value={assignedToId}
                  onChange={(event) => setAssignedToId(event.target.value)}
                  className="min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Non assegnato</option>
                  {data.adminOptions.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="my-4 border-t" />

            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Categoria:</span>{" "}
                {TICKET_CATEGORY_LABELS[data.category]}
              </p>
              <p>
                <span className="font-medium text-foreground">Aperto da:</span>{" "}
                {data.client.name}
              </p>
              <p>
                <span className="font-medium text-foreground">Email:</span> {data.client.email}
              </p>
              <p>
                <span className="font-medium text-foreground">Data apertura:</span>{" "}
                {new Date(data.createdAt).toLocaleDateString("it-IT")}
              </p>
              <p>
                <span className="font-medium text-foreground">Ultimo agg.:</span>{" "}
                <span title={new Date(data.updatedAt).toLocaleString("it-IT")}>
                  {formatRelativeDate(data.updatedAt)}
                </span>
              </p>
              <p>
                <span className="font-medium text-foreground">Badge stato:</span>{" "}
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                    status
                  )}`}
                >
                  {TICKET_STATUS_LABELS[status]}
                </span>
              </p>
              <p>
                <span className="font-medium text-foreground">Badge priorita:</span>{" "}
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityBadgeClass(
                    priority
                  )}`}
                >
                  {TICKET_PRIORITY_LABELS[priority]}
                </span>
              </p>
            </div>

            {saveError ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {saveError}
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving || !hasChanges}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  "Salva Modifiche"
                )}
              </button>

              <button
                type="button"
                onClick={handleCloseTicket}
                disabled={saving || status === "CLOSED"}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
              >
                Chiudi Ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
