"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Copy, Plus, Search, Trash2 } from "lucide-react";
import MobileFilterPanel from "@/components/ui/MobileFilterPanel";
import { formatItalianDate } from "@/lib/date-utils";
import { getArrayData } from "@/lib/api-response";
import { useDebounce } from "@/hooks/useDebounce";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import ResponsiveTable, { type Column } from "@/components/ui/ResponsiveTable";
import ErrorMessage from "@/components/ui/ErrorMessage";
import DeleteEditionModal from "@/components/admin/DeleteEditionModal";
import CreateEditionModal from "@/components/admin/CreateEditionModal";
import DuplicateEditionModal from "@/components/admin/DuplicateEditionModal";

type EditionRow = {
  id: string;
  editionNumber: number;
  startDate?: string | null;
  endDate?: string | null;
  deadlineRegistry?: string | null;
  presenzaMinimaType?: "percentage" | "days" | "hours" | null;
  presenzaMinimaValue?: number | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  course?: { id: string; title: string } | null;
  client?: { id: string; ragioneSociale: string } | null;
  lessons?: Array<{
    luogo?: string | null;
    _count?: { teacherAssignments: number };
  }>;
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
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EditionRow | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<EditionRow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
    setError(null);
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

    const res = await fetchWithRetry(`/api/edizioni?${params.toString()}`);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setEditions([]);
      setError(
        typeof payload?.error === "string"
          ? payload.error
          : "Errore durante il caricamento delle edizioni."
      );
      setLoading(false);
      return;
    }
    try {
      const data: ApiResponse = await res.json();
      setEditions(getArrayData<EditionRow>(data));
    } catch {
      setEditions([]);
      setError("Errore durante il caricamento delle edizioni.");
    } finally {
      setLoading(false);
    }
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
    fetchWithRetry("/api/clienti")
      .then((res) => res.json())
      .then((data) => setClients(getArrayData<ClientOption>(data)))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    fetchWithRetry("/api/admin/categorie")
      .then((res) => res.json())
      .then((data) => setCategories(getArrayData<CategoryOption>(data)))
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

  const getLuoghiDisplay = (edition: EditionRow) => {
    const luoghiUnici = Array.from(
      new Set(
        (edition.lessons ?? [])
          .map((lesson) => lesson.luogo?.trim())
          .filter((luogo): luogo is string => Boolean(luogo))
      )
    );
    return luoghiUnici.length > 0 ? luoghiUnici.join(", ") : "-";
  };

  const getPresenzaMinimaDisplay = (edition: EditionRow) => {
    if (
      edition.presenzaMinimaType === "percentage" &&
      typeof edition.presenzaMinimaValue === "number"
    ) {
      return `${edition.presenzaMinimaValue}%`;
    }
    if (
      edition.presenzaMinimaType === "days" &&
      typeof edition.presenzaMinimaValue === "number"
    ) {
      return `${edition.presenzaMinimaValue} lezioni`;
    }
    if (
      edition.presenzaMinimaType === "hours" &&
      typeof edition.presenzaMinimaValue === "number"
    ) {
      return `${edition.presenzaMinimaValue}h`;
    }
    return "-";
  };

  const getTeacherAssignmentsCount = (edition: EditionRow) =>
    (edition.lessons ?? []).reduce(
      (count, lesson) => count + (lesson._count?.teacherAssignments ?? 0),
      0
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
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuova Edizione
        </button>
      </div>

      <MobileFilterPanel
        searchBar={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Cerca per corso o cliente..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm md:w-[240px]"
              aria-label="Cerca per corso o cliente"
            />
          </div>
        }
        activeFiltersCount={
          (clientId ? 1 : 0) +
          (status !== "all" ? 1 : 0) +
          (categoryId ? 1 : 0) +
          (dateFrom ? 1 : 0) +
          (dateTo ? 1 : 0)
        }
        onReset={resetFilters}
        resultCount={`${editions.length} edizioni trovate`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-[200px]"
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
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-[180px]"
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
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-[200px]"
            value={categoryId || "all"}
            onChange={(event) =>
              setCategoryId(
                event.target.value === "all" ? "" : event.target.value
              )
            }
          >
            <option value="all">Tutte le aree</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <div className="flex w-full items-center gap-2 md:w-auto">
            <span className="text-sm text-muted-foreground">Da:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-md border bg-background px-2 py-2 text-sm md:w-[150px] md:px-3"
              aria-label="Data da"
            />
          </div>
          <div className="flex w-full items-center gap-2 md:w-auto">
            <span className="text-sm text-muted-foreground">A:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-md border bg-background px-2 py-2 text-sm md:w-[150px] md:px-3"
              aria-label="Data a"
            />
          </div>
        </div>
      </MobileFilterPanel>

      {error ? <ErrorMessage message={error} onRetry={() => void fetchEditions()} /> : null}

      <ResponsiveTable<EditionRow>
        columns={[
          {
            key: "course",
            header: "Corso",
            isPrimary: true,
            sortable: true,
            render: (e) => e.course?.title ?? "-",
          },
          {
            key: "client",
            header: "Cliente",
            isSecondary: true,
            sortable: true,
            render: (e) => e.client?.ragioneSociale ?? "-",
          },
          {
            key: "editionNumber",
            header: "Edizione",
            sortable: true,
            hideOnCard: true,
            render: (e) => `#${e.editionNumber}`,
          },
          {
            key: "startDate",
            header: "Inizio",
            sortable: true,
            render: (e) =>
              e.startDate ? formatItalianDate(e.startDate) : "-",
          },
          {
            key: "endDate",
            header: "Fine",
            sortable: true,
            render: (e) =>
              e.endDate ? formatItalianDate(e.endDate) : "-",
          },
          {
            key: "deadlineRegistry",
            header: "Deadline",
            sortable: true,
            hideOnCard: true,
            render: (e) =>
              e.deadlineRegistry
                ? formatItalianDate(e.deadlineRegistry)
                : "-",
          },
          {
            key: "status",
            header: "Stato",
            isBadge: true,
            sortable: true,
            render: (e) => (
              <span
                className={`rounded-full px-2 py-1 text-xs ${STATUS_BADGE[e.status]}`}
              >
                {STATUS_LABELS[e.status]}
              </span>
            ),
          },
          {
            key: "participants",
            header: "Partecipanti",
            sortable: true,
            render: (e) => e._count?.registrations ?? 0,
          },
          {
            key: "presenzaMinima",
            header: "Presenza min.",
            hideOnCard: true,
            render: (e) => getPresenzaMinimaDisplay(e),
          },
          {
            key: "luogo",
            header: "Luogo",
            render: (e) => getLuoghiDisplay(e),
          },
        ] satisfies Column<EditionRow>[]}
        data={editions}
        keyExtractor={(e) => e.id}
        loading={loading}
        skeletonCount={6}
        emptyMessage="Nessuna edizione trovata."
        sortKey={sortBy}
        sortOrder={sortOrder}
        onSort={(key) =>
          handleSort(key as (typeof SORT_COLUMNS)[number]["key"])
        }
        actions={(edition) =>
          edition.course?.id ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/corsi/${edition.course.id}/edizioni/${edition.id}`}
                className="inline-flex items-center rounded-md border px-2 py-1 text-xs text-primary"
              >
                Apri
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                onClick={() => setDuplicateTarget(edition)}
              >
                <Copy className="h-3 w-3" />
                Duplica
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive"
                onClick={() => setDeleteTarget(edition)}
              >
                <Trash2 className="h-3 w-3" />
                Elimina
              </button>
            </div>
          ) : (
            "-"
          )
        }
      />

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

      {duplicateTarget ? (
        <DuplicateEditionModal
          open={Boolean(duplicateTarget)}
          onClose={() => setDuplicateTarget(null)}
          edition={{
            id: duplicateTarget.id,
            editionNumber: duplicateTarget.editionNumber,
            course: { name: duplicateTarget.course?.title ?? "Corso" },
            client: { name: duplicateTarget.client?.ragioneSociale ?? "Cliente" },
            lessonsCount: duplicateTarget.lessons?.length ?? 0,
            teacherAssignmentsCount: getTeacherAssignmentsCount(duplicateTarget),
            presenzaMinimaType: duplicateTarget.presenzaMinimaType ?? null,
            presenzaMinimaValue: duplicateTarget.presenzaMinimaValue ?? null,
          }}
          onSuccess={async () => {
            await fetchEditions();
          }}
        />
      ) : null}

      <CreateEditionModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={async () => {
          await fetchEditions();
        }}
      />
    </div>
  );
}

export default function AdminEdizioniPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      <AdminEdizioniContent />
    </Suspense>
  );
}
