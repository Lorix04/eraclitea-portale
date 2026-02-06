"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

type CategoryRow = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  _count?: { courses: number; clients: number };
};

export default function AdminCategoriePage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
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

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/categorie?${queryString}`);
    const json = await res.json();
    setCategories(json.data ?? []);
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
    loadCategories();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Categorie</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci le categorie per corsi e clienti.
          </p>
        </div>
        <Link
          href="/admin/categorie/nuova"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Nuova categoria
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-md border bg-background px-3 py-2 pl-9 text-sm"
            placeholder="Cerca categoria..."
            value={searchName}
            onChange={(event) => setSearchName(event.target.value)}
            aria-label="Cerca categoria"
          />
        </div>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={`${sortBy}-${sortOrder}`}
          onChange={(event) => {
            const [field, order] = event.target.value.split("-");
            setSortBy(field);
            setSortOrder(order as "asc" | "desc");
          }}
          aria-label="Ordinamento categorie"
        >
          <option value="name-asc">Nome A-Z</option>
          <option value="name-desc">Nome Z-A</option>
          <option value="createdAt-desc">Piu recenti</option>
          <option value="createdAt-asc">Piu antiche</option>
          <option value="coursesCount-desc">Piu corsi</option>
          <option value="coursesCount-asc">Meno corsi</option>
        </select>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {categories.length} categorie
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm text-muted-foreground"
          >
            <X className="mr-1 h-4 w-4" />
            Resetta
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Descrizione</th>
              <th className="px-4 py-3">Corsi</th>
              <th className="px-4 py-3">Clienti</th>
              <th className="px-4 py-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Caricamento...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Nessuna categoria.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: category.color ?? "#6B7280" }}
                      />
                      {category.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {category.description || "-"}
                  </td>
                  <td className="px-4 py-3">{category._count?.courses ?? 0}</td>
                  <td className="px-4 py-3">{category._count?.clients ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-xs">
                      <Link
                        href={`/admin/categorie/${category.id}`}
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {confirmId && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
                <h2 className="text-lg font-semibold">Conferma eliminazione</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Vuoi eliminare questa categoria? Le associazioni con corsi e clienti
                  verranno rimosse.
                </p>
                <div className="mt-6 flex justify-end gap-3">
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
