"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
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
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [searchName, setSearchName] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    setMounted(true);
  }, []);

  const resetFilters = () => {
    setSearchName("");
    setSortBy("name");
    setSortOrder("asc");
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    await fetch(`/api/admin/categorie/${confirmId}`, { method: "DELETE" });
    setConfirmId(null);
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
        <Link
          href="/admin/area-corsi/nuova"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Nuova area
        </Link>
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
          <div className="flex gap-2 text-xs">
            <Link
              href={`/admin/area-corsi/${category.id}`}
              className="text-primary"
            >
              Modifica
            </Link>
            <button
              type="button"
              className="text-destructive"
              onClick={() => setConfirmId(category.id)}
            >
              Elimina
            </button>
          </div>
        )}
      />

      {confirmId && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 bg-black/40 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
              <div className="modal-panel bg-card shadow-lg sm:max-w-md">
                <div className="modal-header">
                  <h2 className="text-lg font-semibold">Conferma eliminazione</h2>
                </div>
                <div className="modal-body modal-scroll">
                  <p className="text-sm text-muted-foreground">
                    Vuoi eliminare questa area? Le associazioni con corsi e clienti
                    verranno rimosse.
                  </p>
                </div>
                <div className="modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    className="rounded-md border px-4 py-2 text-sm"
                    onClick={() => setConfirmId(null)}
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground"
                    onClick={handleDelete}
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
