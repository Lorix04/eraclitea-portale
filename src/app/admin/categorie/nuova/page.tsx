"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SearchableCheckboxList from "@/components/SearchableCheckboxList";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";
import { Skeleton } from "@/components/ui/Skeleton";

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

export default function NuovaCategoriaPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      setLoadingCourses(true);
      setLoadingClients(true);
      const [coursesRes, clientsRes] = await Promise.all([
        fetch("/api/corsi"),
        fetch("/api/admin/clienti"),
      ]);

      const coursesText = await coursesRes.text();
      const coursesJson = coursesText ? JSON.parse(coursesText) : {};
      setCourses(
        (coursesJson.data ?? []).map((course: any) => {
          const totalEditions = course._count?.editions ?? 0;
          const activeEditions = course.activeEditions ?? 0;
          return {
            id: course.id,
            label: course.title,
            subtitle: totalEditions
              ? `Edizioni attive: ${activeEditions}/${totalEditions}`
              : "Nessuna edizione",
          };
        })
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
    };
    loadData();
  }, []);

  const handleSubmit = async () => {
    const fieldErrors: Record<string, string> = {};
    if (!name.trim()) fieldErrors.name = "Questo campo e obbligatorio";
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    const res = await fetch("/api/admin/categorie", {
      method: "POST",
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/categorie" className="text-sm text-muted-foreground">
          &larr; Indietro
        </Link>
        <h1 className="text-xl font-semibold">Nuova categoria</h1>
      </div>

      <div className="space-y-4 rounded-lg border bg-card p-6">
        <FormRequiredLegend />
        <div className="flex flex-col gap-2">
          <FormLabel required>Nome</FormLabel>
          <input
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.name ? "border-red-500 focus-visible:outline-red-500" : ""
            }`}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: "" }));
              }
            }}
          />
          <FormFieldError message={errors.name} />
        </div>
        <label className="flex flex-col gap-2 text-sm">
          <FormLabel>Descrizione</FormLabel>
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
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={`course-skeleton-${index}`} className="h-4 w-full" />
                ))}
              </div>
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
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={`client-skeleton-${index}`} className="h-4 w-full" />
                ))}
              </div>
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
          {saving ? "Salvataggio..." : "Crea categoria"}
        </button>
      </div>
    </div>
  );
}


