"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Copy, ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import MobileFilterPanel from "@/components/ui/MobileFilterPanel";
import { formatItalianDate } from "@/lib/date-utils";
import { getArrayData } from "@/lib/api-response";
import { timeSlotLabel } from "@/lib/time-slot";
import { useDebounce } from "@/hooks/useDebounce";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import ResponsiveTable, { type Column } from "@/components/ui/ResponsiveTable";
import ErrorMessage from "@/components/ui/ErrorMessage";
import TableColumnCustomizer from "@/components/TableColumnCustomizer";
import { useTablePreferences } from "@/hooks/useTablePreferences";
import DeleteEditionModal from "@/components/admin/DeleteEditionModal";
import CreateEditionModal from "@/components/admin/CreateEditionModal";
import DuplicateEditionModal from "@/components/admin/DuplicateEditionModal";
import ActionMenu from "@/components/ui/ActionMenu";
import { usePermissions } from "@/hooks/usePermissions";

type EditionRow = {
  id: string;
  editionNumber: number;
  startDate?: string | null;
  endDate?: string | null;
  deadlineRegistry?: string | null;
  presenzaMinimaType?: "percentage" | "days" | "hours" | null;
  presenzaMinimaValue?: number | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  timeSlot?: "AM" | "PM" | null;
  course?: { id: string; title: string } | null;
  client?: { id: string; ragioneSociale: string } | null;
  lessons?: Array<{
    luogo?: string | null;
    _count?: { teacherAssignments: number };
  }>;
  _count?: { registrations: number; clientAssignments?: number };
  referents?: Array<{
    user: { id: string; email: string };
  }>;
};

type ReferentOption = {
  id: string;
  email: string;
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

// Sentinel value for the "Senza sede" option in the Sede filter (an edition
// has no sede when none of its lessons has a non-empty luogo).
const NO_SEDE = "__no_sede__";

const getEditionSedi = (edition: EditionRow): string[] =>
  Array.from(
    new Set(
      (edition.lessons ?? [])
        .map((lesson) => lesson.luogo?.trim())
        .filter((luogo): luogo is string => Boolean(luogo))
    )
  );

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

// Customizable column registry for /admin/edizioni. "Azioni" excluded — fixed/last
// via the ResponsiveTable `actions` prop. `label` drives the customizer display.
type EditionColumn = Column<EditionRow> & { label: string };

function AdminEdizioniContent() {
  const { can } = usePermissions();
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
  const [timeSlot, setTimeSlot] = useState(searchParams.get("timeSlot") ?? "all");
  const [sede, setSede] = useState(searchParams.get("sede") ?? "all");
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);

  const [referentId, setReferentId] = useState(
    searchParams.get("referentId") ?? ""
  );
  const [editions, setEditions] = useState<EditionRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [referents, setReferents] = useState<ReferentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EditionRow | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<EditionRow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const hasViewAll = can("edizioni", "view-all");
  const hasViewOwn = can("edizioni", "view-own");
  // Default to "Le mie edizioni": shows editions where the user is a referent
  // PLUS editions with no referents (visible to all). Users can switch to
  // "Tutte le edizioni" to see everything they have permission to view.
  const [myEditions, setMyEditions] = useState(true);

  const debouncedSearch = useDebounce(search, 300);

  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (clientId) params.set("clientId", clientId);
    if (status && status !== "all") params.set("status", status);
    if (categoryId) params.set("categoryId", categoryId);
    if (referentId) params.set("referentId", referentId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (timeSlot && timeSlot !== "all") params.set("timeSlot", timeSlot);
    if (sede && sede !== "all") params.set("sede", sede);
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
    referentId,
    dateFrom,
    dateTo,
    timeSlot,
    sede,
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
    if (referentId) params.set("referentId", referentId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (timeSlot && timeSlot !== "all") params.set("timeSlot", timeSlot);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    if (myEditions) params.set("myEditions", "true");

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
    referentId,
    dateFrom,
    dateTo,
    timeSlot,
    sortBy,
    sortOrder,
    myEditions,
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

  useEffect(() => {
    fetchWithRetry("/api/admin/users/admins?referentsOnly=true")
      .then((res) => res.json())
      .then((data) => setReferents(data?.admins ?? []))
      .catch(() => setReferents([]));
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
    setReferentId("");
    setDateFrom("");
    setDateTo("");
    setTimeSlot("all");
    setSede("all");
    setSortBy("startDate");
    setSortOrder("desc");
  };

  const getTeacherAssignmentsCount = (edition: EditionRow) =>
    (edition.lessons ?? []).reduce(
      (count, lesson) => count + (lesson._count?.teacherAssignments ?? 0),
      0
    );

  // Customizable column registry (default order). "Azioni" excluded — fixed/last.
  const editionColumns = useMemo<EditionColumn[]>(
    () => [
      {
        key: "course",
        label: "Corso",
        header: "Corso",
        isPrimary: true,
        sortable: true,
        render: (e) => e.course?.title ?? "-",
      },
      {
        key: "client",
        label: "Cliente",
        header: "Cliente",
        isSecondary: true,
        sortable: true,
        render: (e) => e.client?.ragioneSociale ?? "-",
      },
      {
        key: "editionNumber",
        label: "Edizione",
        header: "Edizione",
        sortable: true,
        hideOnCard: true,
        render: (e) => `#${e.editionNumber}`,
      },
      {
        key: "startDate",
        label: "Inizio",
        header: "Inizio",
        sortable: true,
        render: (e) => (e.startDate ? formatItalianDate(e.startDate) : "-"),
      },
      {
        key: "endDate",
        label: "Fine",
        header: "Fine",
        sortable: true,
        render: (e) => (e.endDate ? formatItalianDate(e.endDate) : "-"),
      },
      {
        key: "deadlineRegistry",
        label: "Deadline",
        header: "Deadline",
        sortable: true,
        hideOnCard: true,
        render: (e) =>
          e.deadlineRegistry ? formatItalianDate(e.deadlineRegistry) : "-",
      },
      {
        key: "luogo",
        label: "Luogo",
        header: "Luogo",
        render: (e) => getLuoghiDisplay(e),
      },
      {
        key: "status",
        label: "Stato",
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
        key: "timeSlot",
        label: "Fascia oraria",
        header: "Fascia oraria",
        isBadge: true,
        render: (e) =>
          e.timeSlot ? (
            <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700">
              {timeSlotLabel(e.timeSlot)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: "referents",
        label: "Referenti",
        header: "Referenti",
        hideOnCard: true,
        render: (e) => {
          const refs = e.referents ?? [];
          if (refs.length === 0) return <span className="text-muted-foreground">—</span>;
          const display = refs.slice(0, 2).map((r) => r.user.email.split("@")[0]);
          const extra = refs.length > 2 ? ` +${refs.length - 2}` : "";
          return (
            <span className="flex flex-wrap gap-1">
              {display.map((name, i) => (
                <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  {name}
                </span>
              ))}
              {extra ? <span className="text-xs text-muted-foreground">{extra}</span> : null}
            </span>
          );
        },
      },
      {
        key: "clientAssignments",
        label: "Assegnati cliente",
        header: "Assegnati cliente",
        hideOnCard: true,
        render: (e) => {
          const count = e._count?.clientAssignments ?? 0;
          return count > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
              👥 {count} assegnati
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              👥 Tutti
            </span>
          );
        },
      },
      {
        key: "participants",
        label: "Partecipanti",
        header: "Partecipanti",
        sortable: true,
        render: (e) => e._count?.registrations ?? 0,
      },
      {
        key: "presenzaMinima",
        label: "Presenza min.",
        header: "Presenza min.",
        hideOnCard: true,
        render: (e) => getPresenzaMinimaDisplay(e),
      },
    ],
    []
  );

  const {
    orderedVisibleColumns,
    allColumns,
    isHidden,
    setVisibility,
    reorder,
    reset: resetColumns,
  } = useTablePreferences<EditionColumn>({
    tableKey: "admin.edizioni",
    columns: editionColumns,
  });

  // Sede (client-side): options are the distinct non-empty lesson venues across
  // the currently-loaded (server-filtered, visibility-aware) editions. Computed
  // before applying the Sede selection so the dropdown doesn't shrink when used.
  const sedeOptions = useMemo(() => {
    const set = new Set<string>();
    editions.forEach((e) => getEditionSedi(e).forEach((s) => set.add(s)));
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "it", { sensitivity: "base" })
    );
  }, [editions]);

  const hasEditionsWithoutSede = useMemo(
    () => editions.some((e) => getEditionSedi(e).length === 0),
    [editions]
  );

  const displayedEditions = useMemo(() => {
    if (sede === "all") return editions;
    if (sede === NO_SEDE) {
      return editions.filter((e) => getEditionSedi(e).length === 0);
    }
    return editions.filter((e) => getEditionSedi(e).includes(sede));
  }, [editions, sede]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Edizioni</h1>
          <p className="text-muted-foreground">
            Tutte le edizioni attive e archiviate per ogni corso.
          </p>
        </div>
        {can("edizioni", "create") ? (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuova Edizione
          </button>
        ) : null}
      </div>

      <MobileFilterPanel
        searchBar={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Cerca per corso, cliente o sede..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm md:w-[240px]"
              aria-label="Cerca per corso, cliente o sede"
            />
          </div>
        }
        activeFiltersCount={
          (clientId ? 1 : 0) +
          (status !== "all" ? 1 : 0) +
          (categoryId ? 1 : 0) +
          (referentId ? 1 : 0) +
          (dateFrom ? 1 : 0) +
          (dateTo ? 1 : 0) +
          (timeSlot !== "all" ? 1 : 0) +
          (sede !== "all" ? 1 : 0)
        }
        onReset={resetFilters}
        resultCount={`${displayedEditions.length} edizioni trovate`}
        trailingControl={
          <TableColumnCustomizer
            columns={allColumns.map((c) => ({ key: c.key, label: c.label }))}
            isHidden={isHidden}
            setVisibility={setVisibility}
            reorder={reorder}
            reset={resetColumns}
          />
        }
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

          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-[200px]"
            value={referentId || "all"}
            onChange={(event) =>
              setReferentId(event.target.value === "all" ? "" : event.target.value)
            }
          >
            <option value="all">Tutti i referenti</option>
            {referents.length === 0 ? (
              <option disabled>Nessun referente assegnato</option>
            ) : (
              referents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.email.split("@")[0]}
                </option>
              ))
            )}
          </select>

          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-[180px]"
            value={timeSlot}
            onChange={(event) => setTimeSlot(event.target.value)}
            aria-label="Filtro fascia oraria"
          >
            <option value="all">Tutte le fasce orarie</option>
            <option value="AM">Mattina</option>
            <option value="PM">Pomeriggio</option>
            <option value="none">Non impostata</option>
          </select>

          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-[200px]"
            value={sede}
            onChange={(event) => setSede(event.target.value)}
            aria-label="Filtro sede"
          >
            <option value="all">Tutte le sedi</option>
            {sedeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {hasEditionsWithoutSede ? (
              <option value={NO_SEDE}>Senza sede</option>
            ) : null}
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

      {hasViewAll || hasViewOwn ? (
        <div className="inline-flex gap-1 rounded-lg bg-muted/50 p-1">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              myEditions
                ? "bg-white shadow font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMyEditions(true)}
          >
            Le mie edizioni
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              !myEditions
                ? "bg-white shadow font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMyEditions(false)}
          >
            Tutte le edizioni
          </button>
        </div>
      ) : null}

      {error ? <ErrorMessage message={error} onRetry={() => void fetchEditions()} /> : null}

      <ResponsiveTable<EditionRow>
        columns={orderedVisibleColumns}
        data={displayedEditions}
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
            <ActionMenu
              primaryAction={{
                key: "open",
                label: "Apri",
                icon: ExternalLink,
                variant: "info",
                href: `/admin/corsi/${edition.course.id}/edizioni/${edition.id}`,
                shortcutKey: "o",
              }}
              secondaryActions={[
                ...(can("edizioni", "duplicate") ? [{
                  key: "duplicate",
                  label: "Duplica",
                  icon: Copy,
                  variant: "default" as const,
                  onClick: () => setDuplicateTarget(edition),
                  shortcutKey: "d",
                }] : []),
                ...(can("edizioni", "delete") ? [{
                  key: "delete",
                  label: "Elimina",
                  icon: Trash2,
                  variant: "danger" as const,
                  onClick: () => setDeleteTarget(edition),
                  shortcutKey: "Delete",
                  shortcutLabel: "Del",
                }] : []),
              ]}
            />
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
