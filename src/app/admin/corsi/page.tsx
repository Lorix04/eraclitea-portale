"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Search, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { getArrayData } from "@/lib/api-response";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import ResponsiveTable, { type Column } from "@/components/ui/ResponsiveTable";
import ErrorMessage from "@/components/ui/ErrorMessage";
import MobileFilterPanel from "@/components/ui/MobileFilterPanel";
import ActionMenu from "@/components/ui/ActionMenu";

type Course = {
  id: string;
  title: string;
  categories?: Array<{
    category?: { id: string; name: string; color?: string | null };
    id?: string;
    name?: string;
    color?: string | null;
  }>;
  durationHours?: number | null;
  visibilityType?: string;
  activeEditions?: number;
  _count?: {
    editions?: number;
  };
};

const VISIBILITY_BADGE: Record<string, string> = {
  ALL: "bg-green-100 text-green-700",
  SELECTED_CLIENTS: "bg-blue-100 text-blue-700",
  BY_CATEGORY: "bg-purple-100 text-purple-700",
};

const VISIBILITY_LABELS: Record<string, string> = {
  ALL: "Tutti",
  SELECTED_CLIENTS: "Selezionati",
  BY_CATEGORY: "Area",
};

export default function AdminCorsiPage() {
  const [searchTitle, setSearchTitle] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibilityType, setVisibilityType] = useState("all");
  const [sortBy, setSortBy] = useState("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTitle, 300);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
    if (visibilityType !== "all") params.set("visibilityType", visibilityType);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [debouncedSearch, categoryFilter, visibilityType, sortBy, sortOrder]);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(`/api/corsi${queryString}`);
      if (!res.ok) {
        setCourses([]);
        setError("Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.");
        return;
      }
      const json = await res.json();
      setCourses(getArrayData<Course>(json));
    } catch {
      setCourses([]);
      setError("Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetchWithRetry("/api/admin/categorie");
        const json = await res.json();
        const data = getArrayData<{ id: string; name: string }>(json);
        setCategories(
          data.map((cat: { id: string; name: string }) => ({
            id: cat.id,
            name: cat.name,
          }))
        );
      } catch {
        setCategories([]);
      }
    };
    void loadCategories();
  }, []);

  const handleDeleteConfirm = async (id: string) => {
    try {
      const res = await fetch(`/api/corsi/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Corso eliminato con successo");
        loadCourses();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? "Errore durante l'eliminazione");
      }
    } catch (error) {
      console.error("Errore eliminazione corso:", error);
      toast.error("Errore durante l'eliminazione del corso");
    }
  };

  const resetFilters = () => {
    setSearchTitle("");
    setCategoryFilter("all");
    setVisibilityType("all");
    setSortBy("createdAt");
    setSortOrder("desc");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Corsi</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci i corsi template e le edizioni associate.
          </p>
        </div>
        <Link
          href="/admin/corsi/nuovo"
          className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Nuovo corso
        </Link>
      </div>

      <MobileFilterPanel
        searchBar={
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border bg-background px-3 py-2 pl-9 text-sm"
              placeholder="Cerca per titolo corso..."
              value={searchTitle}
              onChange={(event) => setSearchTitle(event.target.value)}
              aria-label="Cerca per titolo corso"
            />
          </div>
        }
        activeFiltersCount={
          (categoryFilter !== "all" ? 1 : 0) +
          (visibilityType !== "all" ? 1 : 0) +
          (sortBy !== "createdAt" || sortOrder !== "desc" ? 1 : 0)
        }
        onReset={resetFilters}
        resultCount={`${courses.length} corsi`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-auto"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filtro area corsi"
          >
            <option value="all">Tutte le aree</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-auto"
            value={visibilityType}
            onChange={(event) => setVisibilityType(event.target.value)}
            aria-label="Filtro visibilita corsi"
          >
            <option value="all">Tutte le visibilita</option>
            <option value="ALL">Tutti</option>
            <option value="SELECTED_CLIENTS">Clienti selezionati</option>
            <option value="BY_CATEGORY">Per area</option>
          </select>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-auto"
            value={`${sortBy}-${sortOrder}`}
            onChange={(event) => {
              const [field, order] = event.target.value.split("-");
              setSortBy(field);
              setSortOrder(order as "asc" | "desc");
            }}
            aria-label="Ordinamento corsi"
          >
            <option value="createdAt-desc">Piu recenti</option>
            <option value="createdAt-asc">Piu antichi</option>
            <option value="title-asc">Titolo A-Z</option>
            <option value="title-desc">Titolo Z-A</option>
          </select>
        </div>
      </MobileFilterPanel>

      {error ? <ErrorMessage message={error} onRetry={() => void loadCourses()} /> : null}

      <ResponsiveTable<Course>
        columns={[
          {
            key: "title",
            header: "Titolo",
            isPrimary: true,
            render: (c) => c.title,
          },
          {
            key: "area",
            header: "Area",
            isBadge: true,
            render: (c) =>
              c.categories && c.categories.length > 0 ? (
                <span className="inline-flex flex-wrap gap-1">
                  {c.categories.map((entry) => {
                    const cat = entry.category ?? entry;
                    return (
                      <span
                        key={cat.id ?? `${c.id}-${cat.name}`}
                        className="rounded-full px-2 py-1 text-xs text-white"
                        style={{ backgroundColor: cat.color ?? "#6B7280" }}
                      >
                        {cat.name ?? "-"}
                      </span>
                    );
                  })}
                </span>
              ) : (
                "-"
              ),
          },
          {
            key: "hours",
            header: "Ore",
            render: (c) => c.durationHours ?? "-",
          },
          {
            key: "visibility",
            header: "Visibilita",
            isBadge: true,
            render: (c) => (
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  VISIBILITY_BADGE[c.visibilityType ?? ""] ??
                  "bg-muted text-muted-foreground"
                }`}
              >
                {VISIBILITY_LABELS[c.visibilityType ?? ""] ?? "-"}
              </span>
            ),
          },
          {
            key: "activeEditions",
            header: "Edizioni attive",
            render: (c) => c.activeEditions ?? 0,
          },
          {
            key: "totalEditions",
            header: "Totale edizioni",
            render: (c) => c._count?.editions ?? 0,
          },
        ] satisfies Column<Course>[]}
        data={courses}
        keyExtractor={(c) => c.id}
        loading={loading}
        skeletonCount={6}
        emptyMessage="Nessun corso trovato."
        actions={(course) => (
          <ActionMenu
            primaryAction={{
              key: "detail",
              label: "Dettaglio",
              icon: Eye,
              variant: "info",
              href: `/admin/corsi/${course.id}`,
              shortcutKey: "o",
            }}
            secondaryActions={[
              {
                key: "edit",
                label: "Modifica",
                icon: Pencil,
                variant: "default",
                href: `/admin/corsi/${course.id}/edit`,
                shortcutKey: "e",
              },
              {
                key: "delete",
                label: "Elimina",
                icon: Trash2,
                variant: "danger",
                requireConfirm: true,
                confirmMessage: `Eliminare "${course.title}"?`,
                onClick: () => handleDeleteConfirm(course.id),
                shortcutKey: "Delete",
                shortcutLabel: "Del",
              },
            ]}
          />
        )}
      />
    </div>
  );
}
