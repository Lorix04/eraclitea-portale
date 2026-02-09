"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Search, Trash2, X } from "lucide-react";
import { formatItalianDate } from "@/lib/date-utils";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/Skeleton";
import DeleteEditionModal from "@/components/admin/DeleteEditionModal";

type EditionRow = {
  id: string;
  editionNumber: number;
  startDate?: string | null;
  endDate?: string | null;
  deadlineRegistry?: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  course?: { id: string; title: string } | null;
  client?: { id: string; ragioneSociale: string } | null;
  _count?: { registrations: number };
};

type ClientOption = {
  id: string;
  ragioneSociale: string;
};

type CategoryOption = {
  id: string;
  name: string;
};

type ApiResponse = {
  data: EditionRow[];
  total: number;
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bozza",
  PUBLISHED: "Aperto",
  CLOSED: "Chiuso",
  ARCHIVED: "Archiviato",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-orange-100 text-orange-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

const SORT_COLUMNS: Array<{
  key:
    | "course"
    | "client"
    | "editionNumber"
    | "startDate"
    | "endDate"
    | "deadlineRegistry"
    | "status"
    | "participants";
  label: string;
}> = [
  { key: "course", label: "Corso" },
  { key: "client", label: "Cliente" },
  { key: "editionNumber", label: "Edizione" },
  { key: "startDate", label: "Inizio" },
  { key: "endDate", label: "Fine" },
  { key: "deadlineRegistry", label: "Deadline" },
  { key: "status", label: "Stato" },
  { key: "participants", label: "Partecipanti" },
];

function AdminEdizioniContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const statusParam = searchParams.get("status");
  const initialTab =
    statusParam && ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"].includes(statusParam)
      ? statusParam
      : "all";
  const sortParam = searchParams.get("sortBy");
  const initialSortBy: (typeof SORT_COLUMNS)[number]["key"] =
    SORT_COLUMNS.some((column) => column.key === sortParam)
      ? (sortParam as (typeof SORT_COLUMNS)[number]["key"])
      : "startDate";
  const sortOrderParam = searchParams.get("sortOrder");
  const initialSortOrder: "asc" | "desc" =
    sortOrderParam === "asc" ? "asc" : "desc";

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [clientId, setClientId] = useState(
    searchParams.get("clientId") ?? ""
  );
  const [status, setStatus] = useState(initialTab);
  const [categoryId, setCategoryId] = useState(
    searchParams.get("categoryId") ?? ""
  );
  const [dateFrom, setDateFrom] = useState(
    searchParams.get("dateFrom") ?? ""
  );
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);

  const [editions, setEditions] = useState<EditionRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EditionRow | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (clientId) params.set("clientId", clientId);
    if (status && status !== "all") params.set("status", status);
    if (categoryId) params.set("categoryId", categoryId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [
    debouncedSearch,
    clientId,
    status,
    categoryId,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    router,
    pathname,
  ]);

  const fetchEditions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "500");
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (clientId) params.set("clientId", clientId);
    if (status && status !== "all") params.set("status", status);
    if (categoryId) params.set("categoryId", categoryId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);

    const res = await fetch(`/api/edizioni?${params.toString()}`);
    if (!res.ok) {
      setEditions([]);
      setLoading(false);
      return;
    }
    const data: ApiResponse = await res.json();
    setEditions(data.data ?? []);
    setLoading(false);
  }, [
    debouncedSearch,
    clientId,
    status,
    categoryId,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    updateUrl();
    fetchEditions();
  }, [updateUrl, fetchEditions]);

  useEffect(() => {
    fetch("/api/clienti")
      .then((res) => res.json())
      .then((data) => setClients(data.data || data || []))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    fetch("/api/admin/categorie")
      .then((res) => res.json())
      .then((data) => setCategories(data.data || data || []))
      .catch(() => setCategories([]));
  }, []);

  const handleSort = (key: (typeof SORT_COLUMNS)[number]["key"]) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortOrder("asc");
  };

  const resetFilters = () => {
    setSearch("");
    setClientId("");
    setStatus("all");
    setCategoryId("");
    setDateFrom("");
    setDateTo("");
    setSortBy("startDate");
    setSortOrder("desc");
  };

  const sortedColumns = useMemo(
    () =>
      SORT_COLUMNS.map((column) => ({
        ...column,
        isActive: sortBy === column.key,
      })),
    [sortBy]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Edizioni</h1>
          <p className="text-muted-foreground">
            Tutte le edizioni attive e archiviate per ogni corso.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Cerca per corso o cliente..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-[240px] rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
              aria-label="Cerca per corso o cliente"
            />
          </div>

          <select
            className="w-[200px] rounded-md border bg-background px-3 py-2 text-sm"
            value={clientId || "all"}
            onChange={(event) =>
              setClientId(event.target.value === "all" ? "" : event.target.value)
            }
          >
            <option value="all">Tutti i clienti</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.ragioneSociale}
              </option>
            ))}
          </select>

          <select
            className="w-[180px] rounded-md border bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Tutti gli stati</option>
            <option value="DRAFT">Bozza</option>
            <option value="PUBLISHED">Aperto</option>
            <option value="CLOSED">Chiuso</option>
            <option value="ARCHIVED">Archiviato</option>
          </select>

          <select
            className="w-[200px] rounded-md border bg-background px-3 py-2 text-sm"
            value={categoryId || "all"}
            onChange={(event) =>
              setCategoryId(
                event.target.value === "all" ? "" : event.target.value
              )
            }
          >
            <option value="all">Tutte le categorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Da:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-[150px] rounded-md border bg-background px-3 py-2 text-sm"
              aria-label="Data da"
            />
            <span className="text-sm text-muted-foreground">A:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-[150px] rounded-md border bg-background px-3 py-2 text-sm"
              aria-label="Data a"
            />
          </div>

          <button
            type="button"
            className="inline-flex items-center rounded-md border px-2 py-1 text-xs"
            onClick={resetFilters}
          >
            <X className="mr-1 h-4 w-4" />
            Resetta filtri
          </button>

          <span className="ml-auto text-sm text-muted-foreground">
            {editions.length} edizioni trovate
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              {sortedColumns.map((column) => (
                <th key={column.key} className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort(column.key)}
                    className="inline-flex items-center gap-2 text-sm font-semibold"
                  >
                    {column.label}
                    <ArrowUpDown
                      className={`h-3.5 w-3.5 ${
                        column.isActive
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, row) => (
                <tr key={`edition-skel-${row}`} className="border-t">
                  {Array.from({ length: 9 }).map((__, col) => (
                    <td key={col} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : editions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                  Nessuna edizione trovata.
                </td>
              </tr>
            ) : (
              editions.map((edition) => (
                <tr key={edition.id} className="border-t">
                  <td className="px-4 py-3">{edition.course?.title ?? "-"}</td>
                  <td className="px-4 py-3">
                    {edition.client?.ragioneSociale ?? "-"}
                  </td>
                  <td className="px-4 py-3">#{edition.editionNumber}</td>
                  <td className="px-4 py-3">
                    {edition.startDate ? formatItalianDate(edition.startDate) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {edition.endDate ? formatItalianDate(edition.endDate) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {edition.deadlineRegistry
                      ? formatItalianDate(edition.deadlineRegistry)
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        STATUS_BADGE[edition.status]
                      }`}
                    >
                      {STATUS_LABELS[edition.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {edition._count?.registrations ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {edition.course?.id ? (
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/corsi/${edition.course.id}/edizioni/${edition.id}`}
                          className="text-xs text-primary"
                        >
                          Apri
                        </Link>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-destructive"
                          onClick={() => setDeleteTarget(edition)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Elimina
                        </button>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget ? (
        <DeleteEditionModal
          editionId={deleteTarget.id}
          courseId={deleteTarget.course?.id ?? ""}
          courseName={deleteTarget.course?.title ?? "Corso"}
          editionNumber={deleteTarget.editionNumber}
          clientName={deleteTarget.client?.ragioneSociale ?? "Cliente"}
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setEditions((prev) =>
              prev.filter((edition) => edition.id !== deleteTarget.id)
            );
          }}
        />
      ) : null}
    </div>
  );
}

export default function AdminEdizioniPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Skeleton className="h-4 w-40" />
        </div>
      }
    >
      <AdminEdizioniContent />
    </Suspense>
  );
}
