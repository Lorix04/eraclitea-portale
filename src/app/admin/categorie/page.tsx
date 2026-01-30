"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/categorie?stats=true");
    const json = await res.json();
    setCategories(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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

      {confirmId ? (
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
        </div>
      ) : null}
    </div>
  );
}
