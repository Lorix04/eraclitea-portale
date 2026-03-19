"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import MaterialCategoryFilter from "@/components/MaterialCategoryFilter";
import MaterialCard, { type MaterialItem } from "@/components/MaterialCard";
import MaterialUploadModal from "@/components/MaterialUploadModal";
import MaterialPreviewModal, { canPreview } from "@/components/MaterialPreviewModal";
import { MATERIAL_CATEGORIES } from "@/lib/material-storage-shared";

type EditionMaterialsTabProps = {
  courseId: string;
  editionId: string;
};

export default function ClientEditionMaterialsTab({
  courseId,
  editionId,
}: EditionMaterialsTabProps) {
  const { data: session } = useSession();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(
    null
  );
  const [previewMaterial, setPreviewMaterial] = useState<MaterialItem | null>(null);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/corsi/${courseId}/edizioni/${editionId}/materials`
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setMaterials(json.data ?? []);
    } catch {
      toast.error("Errore nel caricamento dei materiali");
    } finally {
      setLoading(false);
    }
  }, [courseId, editionId]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const currentUserId = (session?.user as any)?.id;

  const isOwn = (material: MaterialItem) =>
    currentUserId && material.uploadedById === currentUserId;

  const categoryCounts: Record<string, number> = {};
  for (const m of materials) {
    categoryCounts[m.category] = (categoryCounts[m.category] ?? 0) + 1;
  }

  const filtered = categoryFilter
    ? materials.filter((m) => m.category === categoryFilter)
    : materials;

  const grouped: Record<string, MaterialItem[]> = {};
  for (const m of filtered) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  }

  const handleDelete = async (materialId: string) => {
    try {
      const res = await fetch(
        `/api/corsi/${courseId}/edizioni/${editionId}/materials/${materialId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      toast.success("Materiale eliminato");
      fetchMaterials();
    } catch {
      toast.error("Errore durante l'eliminazione");
    }
  };

  const handleEdit = (material: MaterialItem) => {
    setEditingMaterial(material);
    setUploadModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {materials.length} materiali
        </p>
        <button
          type="button"
          onClick={() => {
            setEditingMaterial(null);
            setUploadModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Carica materiale
        </button>
      </div>

      <MaterialCategoryFilter
        activeCategory={categoryFilter}
        onCategoryChange={setCategoryFilter}
        counts={categoryCounts}
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="h-20 animate-pulse rounded-lg border bg-muted/30"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {materials.length === 0
              ? "Nessun materiale disponibile."
              : "Nessun materiale in questa categoria."}
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {MATERIAL_CATEGORIES[cat] ?? cat}
            </h3>
            {items.map((material, idx) => (
              <MaterialCard
                key={material.id}
                material={material}
                canDelete={isOwn(material)}
                canEdit={isOwn(material)}
                canReorder={false}
                onDelete={() => handleDelete(material.id)}
                onEdit={() => handleEdit(material)}
                onPreview={canPreview(material.mimeType) ? () => setPreviewMaterial(material) : undefined}
                isFirst={idx === 0}
                isLast={idx === items.length - 1}
                downloadUrl={`/api/corsi/${courseId}/edizioni/${editionId}/materials/${material.id}/download`}
              />
            ))}
          </div>
        ))
      )}

      {materials.length > 0 && (
        <a
          href={`/api/corsi/${courseId}/edizioni/${editionId}/materials/download-zip${categoryFilter ? `?category=${categoryFilter}` : ""}`}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted"
          download
        >
          <Archive className="h-4 w-4" />
          Scarica tutto (ZIP)
        </a>
      )}

      <MaterialUploadModal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setEditingMaterial(null);
        }}
        onUploaded={fetchMaterials}
        courseId={courseId}
        editionId={editionId}
        editingMaterial={editingMaterial}
      />

      <MaterialPreviewModal
        open={!!previewMaterial}
        onClose={() => setPreviewMaterial(null)}
        material={previewMaterial ? {
          id: previewMaterial.id,
          fileName: previewMaterial.fileName,
          mimeType: previewMaterial.mimeType,
          downloadUrl: `/api/corsi/${courseId}/edizioni/${editionId}/materials/${previewMaterial.id}/download`,
        } : null}
      />
    </div>
  );
}
