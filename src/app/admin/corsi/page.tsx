"use client";

import Link from "next/link";
import { formatItalianDate } from "@/lib/date-utils";
import { useCallback, useEffect, useMemo, useState } from "react";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bozza",
  PUBLISHED: "Pubblicato",
  CLOSED: "Chiuso",
  ARCHIVED: "Archiviato",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-orange-100 text-orange-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

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
  dateStart?: string | null;
  deadlineRegistry?: string | null;
  status: string;
  visibilityType?: string;
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
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<
    { id: string; name: string }[]
  >([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [statusFilter, search, categoryFilter]);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/corsi${queryString}`);
    const json = await res.json();
    setCourses(json.data ?? []);
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    const loadCategories = async () => {
      const res = await fetch("/api/admin/categorie");
      const json = await res.json();
      const data = Array.isArray(json) ? json : json.data ?? [];
      setCategories(data.map((cat: { id: string; name: string }) => ({
        id: cat.id,
        name: cat.name,
      })));
    };
    loadCategories();
  }, []);

  const handleArchive = async (id: string) => {
    await fetch(`/api/corsi/${id}`, { method: "DELETE" });
    loadCourses();
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (status === "PUBLISHED") {
      await fetch(`/api/corsi/${id}/pubblica`, { method: "POST" });
    } else {
      await fetch(`/api/corsi/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    }
    loadCourses();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Corsi</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci i corsi pubblicati dall&apos;ente di formazione.
          </p>
        </div>
        <Link
          href="/admin/corsi/nuovo"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Nuovo corso
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm md:w-64"
          placeholder="Cerca titolo..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="">Tutte le categorie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">Tutti gli stati</option>
          <option value="DRAFT">Bozza</option>
          <option value="PUBLISHED">Pubblicato</option>
          <option value="CLOSED">Chiuso</option>
          <option value="ARCHIVED">Archiviato</option>
        </select>
        <button
          type="button"
          onClick={loadCourses}
          className="rounded-md border bg-background px-4 py-2 text-sm"
        >
          Aggiorna
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Titolo</th>
              <th className="px-4 py-3">Categorie</th>
              <th className="px-4 py-3">Ore</th>
              <th className="px-4 py-3">Data Inizio</th>
              <th className="px-4 py-3">Deadline Anagrafiche</th>
              <th className="px-4 py-3">Visibilita</th>
              <th className="px-4 py-3">Stato</th>
              <th className="px-4 py-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                  Caricamento...
                </td>
              </tr>
            ) : courses.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
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
                    {course.dateStart
                      ? formatItalianDate(course.dateStart)
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {course.deadlineRegistry
                      ? formatItalianDate(course.deadlineRegistry)
                      : "-"}
                  </td>
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
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        STATUS_BADGE[course.status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABELS[course.status] ?? course.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/corsi/${course.id}/edit`}
                        className="text-xs text-primary"
                      >
                        Modifica
                      </Link>
                      <select
                        className="rounded-md border bg-background px-2 py-1 text-xs"
                        value=""
                        onChange={(event) => {
                          if (!event.target.value) return;
                          handleStatusChange(course.id, event.target.value);
                        }}
                      >
                        <option value="">Cambia stato</option>
                        <option value="DRAFT">Bozza</option>
                        <option value="PUBLISHED">Pubblica</option>
                        <option value="CLOSED">Chiudi</option>
                      </select>
                      <button
                        type="button"
                        className="text-xs text-destructive"
                        onClick={() => handleArchive(course.id)}
                      >
                        Archivia
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
  );
}
