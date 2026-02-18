"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";

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
  BY_CATEGORY: "Categoria",
};

export default function AdminCorsiPage() {
  const [searchTitle, setSearchTitle] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibilityType, setVisibilityType] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<{
    id: string;
    title: string;
    editionsCount: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      const res = await fetch(`/api/corsi${queryString}`);
      if (!res.ok) {
        setCourses([]);
        setError("Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.");
        return;
      }
      const json = await res.json();
      setCourses(json.data ?? []);
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
      const res = await fetch("/api/admin/categorie");
      const json = await res.json();
      const data = Array.isArray(json) ? json : json.data ?? [];
      setCategories(
        data.map((cat: { id: string; name: string }) => ({
          id: cat.id,
          name: cat.name,
        }))
      );
    };
    loadCategories();
  }, []);

  const handleDeleteClick = (course: Course) => {
    setCourseToDelete({
      id: course.id,
      title: course.title,
      editionsCount: course._count?.editions ?? 0,
    });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/corsi/${courseToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Corso eliminato con successo");
        setDeleteModalOpen(false);
        setCourseToDelete(null);
        loadCourses();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? "Errore durante l'eliminazione");
      }
    } catch (error) {
      console.error("Errore eliminazione corso:", error);
      toast.error("Errore durante l'eliminazione del corso");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseModal = () => {
    if (isDeleting) return;
    setDeleteModalOpen(false);
    setCourseToDelete(null);
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

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
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
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filtro categoria corsi"
          >
            <option value="all">Tutte le categorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={visibilityType}
            onChange={(event) => setVisibilityType(event.target.value)}
            aria-label="Filtro visibilita corsi"
          >
            <option value="all">Tutte le visibilita</option>
            <option value="ALL">Tutti</option>
            <option value="SELECTED_CLIENTS">Clienti selezionati</option>
            <option value="BY_CATEGORY">Per categoria</option>
          </select>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
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
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {courses.length} corsi
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-[44px] items-center rounded-md border px-3 py-2 text-sm text-muted-foreground"
            >
              <X className="mr-1 h-4 w-4" />
              Resetta
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[1080px] text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Titolo</th>
              <th className="px-4 py-3">Categorie</th>
              <th className="px-4 py-3">Ore</th>
              <th className="px-4 py-3">Visibilita</th>
              <th className="px-4 py-3">Edizioni attive</th>
              <th className="px-4 py-3">Totale edizioni</th>
              <th className="px-4 py-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, row) => (
                <tr key={`course-skel-${row}`} className="border-t">
                  {Array.from({ length: 7 }).map((__, col) => (
                    <td key={col} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : courses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Nessun corso trovato.
                </td>
              </tr>
            ) : (
              courses.map((course) => (
                <tr key={course.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{course.title}</td>
                  <td className="px-4 py-3">
                    {course.categories && course.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {course.categories.map((entry) => {
                          const category = entry.category ?? entry;
                          return (
                            <span
                              key={category.id ?? `${course.id}-${category.name}`}
                              className="rounded-full px-2 py-1 text-xs text-white"
                              style={{ backgroundColor: category.color ?? "#6B7280" }}
                            >
                              {category.name ?? "-"}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">{course.durationHours ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        VISIBILITY_BADGE[course.visibilityType ?? ""] ??
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {VISIBILITY_LABELS[course.visibilityType ?? ""] ?? "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{course.activeEditions ?? 0}</td>
                  <td className="px-4 py-3">{course._count?.editions ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/corsi/${course.id}`}
                        className="text-xs text-primary"
                      >
                        Dettaglio
                      </Link>
                      <Link
                        href={`/admin/corsi/${course.id}/edit`}
                        className="text-xs text-primary"
                      >
                        Modifica
                      </Link>
                      <button
                        type="button"
                        className="text-xs text-destructive"
                        onClick={() => handleDeleteClick(course)}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleDeleteConfirm}
        title="Elimina corso"
        description="Sei sicuro di voler eliminare questo corso?"
        itemName={courseToDelete?.title}
        isDeleting={isDeleting}
        warningMessage={
          courseToDelete && courseToDelete.editionsCount > 0
            ? `Questo corso ha ${courseToDelete.editionsCount} edizioni. Tutti i dati associati verranno eliminati permanentemente.`
            : "Questa azione non puo essere annullata."
        }
      />
    </div>
  );
}
