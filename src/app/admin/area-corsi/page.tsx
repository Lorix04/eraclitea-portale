"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, Pencil, Search, Trash2 } from "lucide-react";
import ActionMenu from "@/components/ui/ActionMenu";
import { usePermissions } from "@/hooks/usePermissions";
import { useDebounce } from "@/hooks/useDebounce";
import { useFetchWithRetry } from "@/hooks/useFetchWithRetry";
import MobileFilterPanel from "@/components/ui/MobileFilterPanel";
import { getArrayData } from "@/lib/api-response";
import ResponsiveTable, { type Column } from "@/components/ui/ResponsiveTable";
import ErrorMessage from "@/components/ui/ErrorMessage";

type CategoryRow = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  _count?: { courses: number; clients: number };
};

export default function AdminAreaCorsiPage() {
  const { can } = usePermissions();
  const [searchName, setSearchName] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const debouncedSearch = useDebounce(searchName, 300);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("stats", "true");
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    return params.toString();
  }, [debouncedSearch, sortBy, sortOrder]);

  const {
    data: categoriesData,
    loading,
    retrying,
    error,
    refetch,
  } = useFetchWithRetry<CategoryRow[]>({
    url: `/api/admin/categorie?${queryString}`,
    dependencies: [queryString],
    transform: (payload) => getArrayData<CategoryRow>(payload),
  });
  const categories = categoriesData ?? [];

  const resetFilters = () => {
    setSearchName("");
    setSortBy("name");
    setSortOrder("asc");
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/categorie/${id}`, { method: "DELETE" });
    await refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Area Corsi</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci le aree dei corsi e le associazioni con i clienti.
          </p>
        </div>
        {can("area-corsi", "create") ? (
          <Link
            href="/admin/area-corsi/nuova"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Nuova area
          </Link>
        ) : null}
      </div>

      <MobileFilterPanel
        searchBar={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border bg-background px-3 py-2 pl-9 text-sm"
              placeholder="Cerca area..."
              value={searchName}
              onChange={(event) => setSearchName(event.target.value)}
              aria-label="Cerca area"
            />
          </div>
        }
        activeFiltersCount={
          (sortBy !== "name" || sortOrder !== "asc" ? 1 : 0)
        }
        onReset={resetFilters}
        resultCount={`${categories.length} aree`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-auto"
            value={`${sortBy}-${sortOrder}`}
            onChange={(event) => {
              const [field, order] = event.target.value.split("-");
              setSortBy(field);
              setSortOrder(order as "asc" | "desc");
            }}
            aria-label="Ordinamento aree"
          >
            <option value="name-asc">Nome A-Z</option>
            <option value="name-desc">Nome Z-A</option>
            <option value="createdAt-desc">Piu recenti</option>
            <option value="createdAt-asc">Piu antiche</option>
            <option value="coursesCount-desc">Piu corsi</option>
            <option value="coursesCount-asc">Meno corsi</option>
          </select>
        </div>
      </MobileFilterPanel>

      {error ? <ErrorMessage message={error} onRetry={() => void refetch()} /> : null}

      <ResponsiveTable<CategoryRow>
        columns={[
          {
            key: "name",
            header: "Nome",
            isPrimary: true,
            render: (c) => (
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: c.color ?? "#6B7280" }}
                />
                {c.name}
              </span>
            ),
          },
          {
            key: "description",
            header: "Descrizione",
            isSecondary: true,
            render: (c) => c.description || "-",
          },
          {
            key: "courses",
            header: "Corsi",
            render: (c) => c._count?.courses ?? 0,
          },
          {
            key: "clients",
            header: "Clienti",
            render: (c) => c._count?.clients ?? 0,
          },
        ] satisfies Column<CategoryRow>[]}
        data={categories}
        keyExtractor={(c) => c.id}
        loading={loading || retrying}
        emptyMessage="Nessuna area."
        actions={(category) => (
          <ActionMenu
            primaryAction={{
              key: "view",
              label: can("area-corsi", "edit") ? "Modifica" : "Dettaglio",
              icon: can("area-corsi", "edit") ? Pencil : Eye,
              variant: "info",
              href: `/admin/area-corsi/${category.id}`,
              shortcutKey: "e",
            }}
            secondaryActions={[
              ...(can("area-corsi", "delete") ? [{
                key: "delete",
                label: "Elimina",
                icon: Trash2,
                variant: "danger" as const,
                requireConfirm: true,
                confirmMessage: "Eliminare questa area? Le associazioni verranno rimosse.",
                onClick: () => handleDelete(category.id),
                shortcutKey: "Delete",
                shortcutLabel: "Del",
              }] : []),
            ]}
          />
        )}
      />
    </div>
  );
}
