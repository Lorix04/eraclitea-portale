"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Archive, Plus } from "lucide-react";
import { toast } from "sonner";
import MaterialCategoryFilter from "@/components/MaterialCategoryFilter";
import MaterialCard, { type MaterialItem } from "@/components/MaterialCard";
import MaterialUploadModal from "@/components/MaterialUploadModal";
import MaterialPreviewModal, {
  canPreview,
} from "@/components/MaterialPreviewModal";
import { MATERIAL_CATEGORIES } from "@/lib/material-storage-shared";

type TeacherMaterialsTabProps = {
  courseId: string;
  editionId: string;
};

export default function TeacherMaterialsTab({
  courseId,
  editionId,
}: TeacherMaterialsTabProps) {
  const { data: session } = useSession();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<{
    id: string;
    fileName: string;
    mimeType: string;
    downloadUrl: string;
  } | null>(null);

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

  const userId = session?.user?.id;

  // Separate teacher's own proposed (non-approved) materials
  const myProposed = materials.filter(
    (m) =>
      m.uploadedById === userId &&
      m.status &&
      m.status !== "APPROVED"
  );

  // Approved materials (shown to everyone)
  const approved = materials.filter(
    (m) => !m.status || m.status === "APPROVED"
  );

  const categoryCounts: Record<string, number> = {};
  for (const m of approved) {
    categoryCounts[m.category] = (categoryCounts[m.category] ?? 0) + 1;
  }

  const filtered = categoryFilter
    ? approved.filter((m) => m.category === categoryFilter)
    : approved;

  // Group approved materials by category
  const grouped: Record<string, MaterialItem[]> = {};
  for (const m of filtered) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  }

  const handleDeleteProposed = async (materialId: string) => {
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

  const makeDownloadUrl = (materialId: string) =>
    `/api/corsi/${courseId}/edizioni/${editionId}/materials/${materialId}/download`;

  return (
    <div className="space-y-4">
      {/* Teacher's proposed materials */}
      {myProposed.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            I miei file proposti
          </h3>
          {myProposed.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              canDelete={material.status === "PENDING"}
              canEdit={false}
              canReorder={false}
              onDelete={() => handleDeleteProposed(material.id)}
              onPreview={() =>
                setPreviewMaterial({
                  id: material.id,
                  fileName: material.fileName,
                  mimeType: material.mimeType,
                  downloadUrl: makeDownloadUrl(material.id),
                })
              }
              isFirst
              isLast
              downloadUrl={makeDownloadUrl(material.id)}
            />
          ))}
          <hr className="my-4" />
        </div>
      ) : null}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {approved.length} materiali disponibili
        </p>
        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Proponi file
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
            {approved.length === 0
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
                canDelete={false}
                canEdit={false}
                canReorder={false}
                onPreview={() =>
                  setPreviewMaterial({
                    id: material.id,
                    fileName: material.fileName,
                    mimeType: material.mimeType,
                    downloadUrl: makeDownloadUrl(material.id),
                  })
                }
                isFirst={idx === 0}
                isLast={idx === items.length - 1}
                downloadUrl={makeDownloadUrl(material.id)}
              />
            ))}
          </div>
        ))
      )}

      {/* ZIP Download */}
      {approved.length > 0 ? (
        <div className="pt-2">
          <a
            href={`/api/corsi/${courseId}/edizioni/${editionId}/materials/download-zip${categoryFilter ? `?category=${categoryFilter}` : ""}`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted"
            download
          >
            <Archive className="h-4 w-4" />
            Scarica tutto (ZIP)
          </a>
        </div>
      ) : null}

      {/* Upload Modal */}
      <MaterialUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploaded={fetchMaterials}
        courseId={courseId}
        editionId={editionId}
      />

      {/* Preview Modal */}
      <MaterialPreviewModal
        open={!!previewMaterial}
        onClose={() => setPreviewMaterial(null)}
        material={previewMaterial}
      />
    </div>
  );
}
