"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, LifeBuoy, Search } from "lucide-react";
import ActionMenu from "@/components/ui/ActionMenu";
import { usePermissions } from "@/hooks/usePermissions";
import { useDebounce } from "@/hooks/useDebounce";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/tickets";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import ResponsiveTable, { type Column } from "@/components/ui/ResponsiveTable";
import ErrorMessage from "@/components/ui/ErrorMessage";
import MobileFilterPanel from "@/components/ui/MobileFilterPanel";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type TicketCategory =
  | "TECHNICAL"
  | "INFO_REQUEST"
  | "REGISTRY"
  | "CERTIFICATES"
  | "BILLING"
  | "OTHER";
type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type TicketListItem = {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  updatedAt: string;
  messagesCount: number;
  senderType?: "client" | "teacher";
  client: {
    id: string;
    name: string;
  } | null;
  teacher: {
    id: string;
    name: string;
  } | null;
  assignedTo: {
    id: string;
    name: string;
  } | null;
};

type ClientOption = {
  id: string;
  ragioneSociale: string;
  user?: {
    id: string;
  } | null;
};

function parseItems(payload: unknown): TicketListItem[] {
  if (Array.isArray(payload)) {
    return payload as TicketListItem[];
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)) {
    return (payload as { data: TicketListItem[] }).data;
  }
  return [];
}

async function fetchTickets(filters: {
  status: string;
  category: string;
  priority: string;
  clientId: string;
  senderType: string;
  search: string;
}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.category && filters.category !== "all") params.set("category", filters.category);
  if (filters.priority && filters.priority !== "all") params.set("priority", filters.priority);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.senderType && filters.senderType !== "all") params.set("senderType", filters.senderType);
  if (filters.search.trim()) params.set("search", filters.search.trim());

  const response = await fetchWithRetry(`/api/tickets?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Errore caricamento ticket");
  }

  const json = await response.json();
  return parseItems(json);
}

async function fetchTicketStats() {
  const response = await fetchWithRetry("/api/tickets");
  if (!response.ok) {
    throw new Error("Errore caricamento statistiche ticket");
  }
  const json = await response.json();
  return parseItems(json);
}

async function fetchClients() {
  const response = await fetchWithRetry("/api/admin/clienti?isActive=true");
  if (!response.ok) {
    return [] as ClientOption[];
  }
  const json = await response.json();
  return Array.isArray(json?.data) ? (json.data as ClientOption[]) : [];
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

export default function AdminTicketPage() {
  const { can } = usePermissions();
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [clientId, setClientId] = useState("");
  const [senderType, setSenderType] = useState("all");
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  const {
    data: tickets = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "tickets",
      "admin",
      status,
      category,
      priority,
      clientId,
      senderType,
      debouncedSearch,
    ],
    queryFn: () =>
      fetchTickets({
        status,
        category,
        priority,
        clientId,
        senderType,
        search: debouncedSearch,
      }),
    retry: false,
  });

  const { data: statsTickets = [] } = useQuery({
    queryKey: ["tickets", "admin", "stats"],
    queryFn: fetchTicketStats,
    refetchInterval: 60_000,
    retry: false,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["tickets", "admin", "clients"],
    queryFn: fetchClients,
    retry: false,
  });

  const counts = useMemo(() => {
    return statsTickets.reduce(
      (acc, ticket) => {
        acc[ticket.status] += 1;
        return acc;
      },
      {
        OPEN: 0,
        IN_PROGRESS: 0,
        RESOLVED: 0,
        CLOSED: 0,
      }
    );
  }, [statsTickets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <LifeBuoy className="h-5 w-5" />
            Gestione Ticket
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
              {counts.OPEN} Aperti
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
              {counts.IN_PROGRESS} In corso
            </span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
              {counts.RESOLVED} Risolti
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
              {counts.CLOSED} Chiusi
            </span>
          </div>
        </div>
      </div>

      <MobileFilterPanel
        searchBar={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca per oggetto..."
              className="min-h-[44px] w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>
        }
        activeFiltersCount={
          [status !== "all", category !== "all", priority !== "all", clientId !== "", senderType !== "all"].filter(Boolean).length
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <select
            className="w-full min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Tutti gli stati</option>
            <option value="OPEN">Aperti</option>
            <option value="IN_PROGRESS">In corso</option>
            <option value="RESOLVED">Risolti</option>
            <option value="CLOSED">Chiusi</option>
          </select>

          <select
            className="w-full min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">Tutte le categorie</option>
            {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            className="w-full min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="all">Tutte le priorita</option>
            {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            className="w-full min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          >
            <option value="">Tutti i clienti</option>
            {clients
              .filter((client) => Boolean(client.user?.id))
              .map((client) => (
                <option key={client.id} value={client.user?.id ?? ""}>
                  {client.ragioneSociale}
                </option>
              ))}
          </select>

          <select
            className="w-full min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm"
            value={senderType}
            onChange={(event) => setSenderType(event.target.value)}
          >
            <option value="all">Tutti i tipi</option>
            <option value="client">Solo clienti</option>
            <option value="teacher">Solo docenti</option>
          </select>
        </div>
      </MobileFilterPanel>

      {isError ? (
        <ErrorMessage
          message="Errore nel caricamento dei ticket."
          onRetry={() => void refetch()}
        />
      ) : null}

      <ResponsiveTable<TicketListItem>
        columns={[
          {
            key: "status",
            header: "Stato",
            isBadge: true,
            render: (t) => (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(t.status)}`}
              >
                {TICKET_STATUS_LABELS[t.status]}
              </span>
            ),
          },
          {
            key: "priority",
            header: "Priorita",
            isBadge: true,
            render: (t) => (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityBadgeClass(t.priority)}`}
              >
                {TICKET_PRIORITY_LABELS[t.priority]}
              </span>
            ),
          },
          {
            key: "subject",
            header: "Oggetto",
            isPrimary: true,
            render: (t) => (
              <p className="max-w-[300px] truncate" title={t.subject}>
                {t.subject}
              </p>
            ),
          },
          {
            key: "category",
            header: "Categoria",
            hideOnCard: true,
            render: (t) => TICKET_CATEGORY_LABELS[t.category],
          },
          {
            key: "client",
            header: "Mittente",
            isSecondary: true,
            render: (t) => (
              <span className="flex items-center gap-1.5">
                {t.senderType === "teacher" ? (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Doc</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Cli</span>
                )}
                {t.teacher?.name ?? t.client?.name ?? "—"}
              </span>
            ),
          },
          {
            key: "messages",
            header: "Messaggi",
            render: (t) => t.messagesCount,
          },
          {
            key: "updatedAt",
            header: "Ultimo aggiornamento",
            render: (t) => (
              <span title={new Date(t.updatedAt).toLocaleString("it-IT")}>
                {formatRelativeDate(t.updatedAt)}
              </span>
            ),
          },
          {
            key: "assignedTo",
            header: "Assegnato a",
            render: (t) => t.assignedTo?.name ?? "-",
          },
        ] satisfies Column<TicketListItem>[]}
        data={tickets}
        keyExtractor={(t) => t.id}
        loading={isLoading}
        skeletonCount={8}
        emptyMessage="Nessun ticket trovato con i filtri selezionati."
        actions={(ticket) => (
          <ActionMenu
            primaryAction={{
              key: "open",
              label: "Apri",
              icon: Eye,
              variant: "info",
              href: `/admin/ticket/${ticket.id}`,
            }}
          />
        )}
      />

      {isFetching && !isLoading ? (
        <p className="text-xs text-muted-foreground">Aggiornamento in corso...</p>
      ) : null}
    </div>
  );
}
