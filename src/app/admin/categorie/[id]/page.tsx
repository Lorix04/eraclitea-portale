"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SearchableCheckboxList from "@/components/SearchableCheckboxList";

type CourseItem = { id: string; label: string; subtitle?: string };
type ClientItem = { id: string; label: string; subtitle?: string };

const PRESET_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#6B7280",
];

export default function ModificaCategoriaPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [categoryRes, coursesRes, clientsRes] = await Promise.all([
        fetch(`/api/admin/categorie/${params.id}`),
        fetch("/api/corsi"),
        fetch("/api/admin/clienti"),
      ]);

      const categoryText = await categoryRes.text();
      const categoryJson = categoryText ? JSON.parse(categoryText) : {};
      const category = categoryJson.data;
      setName(category?.name ?? "");
      setDescription(category?.description ?? "");
      setColor(category?.color ?? PRESET_COLORS[0]);
      setCourseIds(
        category?.courses?.map((entry: any) => entry.course?.id ?? entry.courseId) ??
          []
      );
      setClientIds(
        category?.clients?.map((entry: any) => entry.client?.id ?? entry.clientId) ??
          []
      );

      const coursesText = await coursesRes.text();
      const coursesJson = coursesText ? JSON.parse(coursesText) : {};
      setCourses(
        (coursesJson.data ?? []).map((course: any) => ({
          id: course.id,
          label: course.title,
          subtitle:
            course.status === "PUBLISHED" ? "Pubblicato" : `Stato: ${course.status}`,
        }))
      );
      setLoadingCourses(false);

      const clientsText = await clientsRes.text();
      const clientsJson = clientsText ? JSON.parse(clientsText) : {};
      setClients(
        (clientsJson.data ?? []).map((client: any) => ({
          id: client.id,
          label: client.ragioneSociale,
          subtitle: client.isActive ? "Attivo" : "Disattivo",
        }))
      );
      setLoadingClients(false);
      setLoading(false);
    };
    loadData();
  }, [params.id]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/admin/categorie/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        color,
        courseIds,
        clientIds,
      }),
    });
    setSaving(false);
    if (!res.ok) return;
    router.push("/admin/categorie");
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Caricamento...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/categorie" className="text-sm text-muted-foreground">
          ← Indietro
        </Link>
        <h1 className="text-xl font-semibold">Modifica categoria</h1>
      </div>

      <div className="space-y-4 rounded-lg border bg-card p-6">
        <label className="flex flex-col gap-2 text-sm">
          Nome
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Descrizione
          <textarea
            className="min-h-[80px] rounded-md border bg-background px-3 py-2"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="space-y-2 text-sm">
          <span className="font-medium">Colore</span>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`h-7 w-7 rounded-full border-2 ${
                  color === preset ? "border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: preset }}
                onClick={() => setColor(preset)}
              />
            ))}
            <input
              type="color"
              className="h-7 w-10 rounded-md border p-0"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Anteprima:</span>
          <span
            className="rounded-full px-3 py-1 text-xs text-white"
            style={{ backgroundColor: color }}
          >
            {name || "Categoria"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium">Associa corsi</p>
          <div className="mt-3">
            {loadingCourses ? (
              <p className="text-sm text-muted-foreground">Caricamento...</p>
            ) : (
              <SearchableCheckboxList
                items={courses}
                selectedIds={courseIds}
                onSelectionChange={setCourseIds}
                placeholder="Cerca corso per titolo..."
                emptyMessage="Nessun corso disponibile"
                maxHeight="300px"
              />
            )}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium">Associa clienti</p>
          <div className="mt-3">
            {loadingClients ? (
              <p className="text-sm text-muted-foreground">Caricamento...</p>
            ) : (
              <SearchableCheckboxList
                items={clients}
                selectedIds={clientIds}
                onSelectionChange={setClientIds}
                placeholder="Cerca cliente per nome..."
                emptyMessage="Nessun cliente disponibile"
                maxHeight="300px"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/admin/categorie" className="rounded-md border px-4 py-2 text-sm">
          Annulla
        </Link>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Salvataggio..." : "Salva modifiche"}
        </button>
      </div>
    </div>
  );
}
