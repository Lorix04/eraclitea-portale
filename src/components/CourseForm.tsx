"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import CategorySelect from "@/components/CategorySelect";
import SearchableCheckboxList from "@/components/SearchableCheckboxList";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";

const optionalInt = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return value;
  },
  z.coerce.number().int().min(1, "Ore obbligatorie").max(200)
);

const CourseSchema = z.object({
  title: z.string().min(1, "Titolo obbligatorio"),
  description: z.string().optional(),
  durationHours: optionalInt,
  visibilityType: z.enum(["ALL", "SELECTED_CLIENTS", "BY_CATEGORY"]),
  visibilityClientIds: z.array(z.string()).optional(),
  visibilityCategoryIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
});

type CourseFormData = z.infer<typeof CourseSchema>;

type CourseFormState = Omit<CourseFormData, "durationHours"> & {
  durationHours?: string;
};

type ClientOption = {
  id: string;
  ragioneSociale: string;
};

type CategoryOption = {
  id: string;
  name: string;
  clientsCount?: number;
};

type CourseFormProps = {
  courseId?: string;
  initialData?: Partial<CourseFormData> & {
    visibilityType?: "ALL" | "SELECTED_CLIENTS" | "BY_CATEGORY";
  };
  deleteStats?: {
    editionsCount: number;
  };
};

export default function CourseForm({
  courseId,
  initialData,
  deleteStats,
}: CourseFormProps) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [visibilityCategories, setVisibilityCategories] = useState<CategoryOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState<CourseFormState>({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    durationHours:
      initialData?.durationHours !== undefined && initialData?.durationHours !== null
        ? String(initialData.durationHours)
        : "",
    visibilityType:
      initialData?.visibilityType ??
      (initialData?.visibilityCategoryIds &&
      initialData.visibilityCategoryIds.length > 0
        ? "BY_CATEGORY"
        : initialData?.visibilityClientIds &&
            initialData.visibilityClientIds.length > 0
          ? "SELECTED_CLIENTS"
          : "ALL"),
    visibilityClientIds: initialData?.visibilityClientIds ?? [],
    visibilityCategoryIds: initialData?.visibilityCategoryIds ?? [],
    categoryIds: initialData?.categoryIds ?? [],
  });

  useEffect(() => {
    const loadClients = async () => {
      const res = await fetch("/api/clienti");
      const json = await res.json();
      setClients(json.data ?? []);
    };
    loadClients();
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      const res = await fetch("/api/admin/categorie?stats=true");
      const json = await res.json();
      const data = Array.isArray(json) ? json : json.data ?? [];
      setVisibilityCategories(
        data.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          clientsCount: cat._count?.clients ?? 0,
        }))
      );
    };
    loadCategories();
  }, []);

  const selectedCount = useMemo(
    () => form.visibilityClientIds?.length ?? 0,
    [form.visibilityClientIds]
  );

  const selectedCategoryCount = useMemo(
    () => form.visibilityCategoryIds?.length ?? 0,
    [form.visibilityCategoryIds]
  );

  const updateField = (key: keyof CourseFormState, value: string | string[]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const saveCourse = async () => {
    setErrors({});
    const parsed = CourseSchema.safeParse({
      ...form,
      durationHours: form.durationHours === "" ? undefined : form.durationHours,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[String(issue.path[0])] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return null;
    }

    setSaving(true);
    const payload = {
      ...parsed.data,
      visibilityClientIds:
        parsed.data.visibilityType === "SELECTED_CLIENTS"
          ? parsed.data.visibilityClientIds
          : [],
      visibilityCategoryIds:
        parsed.data.visibilityType === "BY_CATEGORY"
          ? parsed.data.visibilityCategoryIds
          : [],
    };

    const res = await fetch(courseId ? `/api/corsi/${courseId}` : "/api/corsi", {
      method: courseId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      setErrors({ form: "Errore durante il salvataggio." });
      return null;
    }

    const json = await res.json();
    return json.data as { id: string };
  };

  const handleSave = async () => {
    const saved = await saveCourse();
    if (!saved?.id) return;
    router.push(`/admin/corsi/${saved.id}/edit`);
  };

  const handleDeleteCourse = async () => {
    if (!courseId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/corsi/${courseId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Corso eliminato con successo");
        router.push("/admin/corsi");
        return;
      }
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error ?? "Errore durante l'eliminazione");
    } catch (error) {
      console.error("Errore eliminazione corso:", error);
      toast.error("Errore durante l'eliminazione del corso");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <FormRequiredLegend />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FormLabel required>Titolo</FormLabel>
          <input
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.title ? "border-red-500 focus-visible:outline-red-500" : ""
            }`}
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
          />
          <FormFieldError message={errors.title} />
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Categorie</span>
          <CategorySelect
            value={form.categoryIds ?? []}
            onChange={(ids) => updateField("categoryIds", ids)}
            placeholder="Nessuna categoria"
            searchPlaceholder="Cerca categoria"
          />
        </div>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <FormLabel>Descrizione</FormLabel>
        <textarea
          className="min-h-[120px] rounded-md border bg-background px-3 py-2"
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FormLabel required>Ore</FormLabel>
          <input
            type="number"
            step="1"
            min="1"
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.durationHours
                ? "border-red-500 focus-visible:outline-red-500"
                : ""
            }`}
            value={form.durationHours ?? ""}
            onChange={(event) => updateField("durationHours", event.target.value)}
          />
          <FormFieldError message={errors.durationHours} />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Visibilita</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="visibility"
              checked={form.visibilityType === "ALL"}
              onChange={() => updateField("visibilityType", "ALL")}
            />
            Tutti i clienti
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="visibility"
              checked={form.visibilityType === "SELECTED_CLIENTS"}
              onChange={() => updateField("visibilityType", "SELECTED_CLIENTS")}
            />
            Clienti selezionati
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="visibility"
              checked={form.visibilityType === "BY_CATEGORY"}
              onChange={() => updateField("visibilityType", "BY_CATEGORY")}
            />
            Categoria per clienti
          </label>
        </div>

        {form.visibilityType === "SELECTED_CLIENTS" ? (
          <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
            <SearchableCheckboxList
              items={clients.map((client) => ({
                id: client.id,
                label: client.ragioneSociale,
              }))}
              selectedIds={form.visibilityClientIds ?? []}
              onSelectionChange={(ids) => updateField("visibilityClientIds", ids)}
              placeholder="Cerca cliente per ragione sociale"
              emptyMessage="Nessun cliente disponibile"
              maxHeight="250px"
            />
          </div>
        ) : null}
        {form.visibilityType === "SELECTED_CLIENTS" ? (
          <p className="text-xs text-muted-foreground">
            {selectedCount} clienti selezionati
          </p>
        ) : null}
        {form.visibilityType === "BY_CATEGORY" ? (
          <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
            <SearchableCheckboxList
              items={visibilityCategories.map((cat) => ({
                id: cat.id,
                label: cat.name,
                subtitle: `${cat.clientsCount ?? 0} clienti associati`,
              }))}
              selectedIds={form.visibilityCategoryIds ?? []}
              onSelectionChange={(ids) => updateField("visibilityCategoryIds", ids)}
              placeholder="Cerca categoria clienti"
              emptyMessage="Nessuna categoria disponibile"
              maxHeight="250px"
            />
          </div>
        ) : null}
        {form.visibilityType === "BY_CATEGORY" ? (
          <p className="text-xs text-muted-foreground">
            {selectedCategoryCount} categorie selezionate
          </p>
        ) : null}
      </div>

      {errors.form ? (
        <p className="text-sm text-destructive">{errors.form}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {courseId ? (
          <button
            type="button"
            className="rounded-md border border-destructive px-4 py-2 text-destructive"
            onClick={() => setDeleteModalOpen(true)}
            disabled={saving || isDeleting}
          >
            Elimina corso
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-md border bg-background px-4 py-2"
          onClick={handleSave}
          disabled={saving}
        >
          Salva
        </button>
      </div>

      {courseId ? (
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            if (!isDeleting) setDeleteModalOpen(false);
          }}
          onConfirm={handleDeleteCourse}
          title="Elimina corso"
          description="Sei sicuro di voler eliminare questo corso?"
          itemName={initialData?.title}
          isDeleting={isDeleting}
          warningMessage={
            deleteStats && deleteStats.editionsCount > 0
              ? `Questo corso ha ${deleteStats.editionsCount} edizioni. Tutti i dati associati verranno eliminati permanentemente.`
              : "Questa azione non puo essere annullata."
          }
        />
      ) : null}
    </div>
  );
}
