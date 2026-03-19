"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import MaterialCategoryFilter from "@/components/MaterialCategoryFilter";
import MaterialCard, { type MaterialItem } from "@/components/MaterialCard";
import MaterialUploadModal from "@/components/MaterialUploadModal";
import MaterialPreviewModal from "@/components/MaterialPreviewModal";
import { MATERIAL_CATEGORIES } from "@/lib/material-storage-shared";

type EditionMaterialsTabProps = {
  courseId: string;
  editionId: string;
  readOnly?: boolean;
};

export default function EditionMaterialsTab({
  courseId,
  editionId,
  readOnly = false,
}: EditionMaterialsTabProps) {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(
    null
  );
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

  // Separate pending from approved/other materials
  const pendingMaterials = materials.filter((m) => m.status === "PENDING");
  const nonPendingMaterials = materials.filter((m) => m.status !== "PENDING");

  const categoryCounts: Record<string, number> = {};
  for (const m of nonPendingMaterials) {
    categoryCounts[m.category] = (categoryCounts[m.category] ?? 0) + 1;
  }

  const filtered = categoryFilter
    ? nonPendingMaterials.filter((m) => m.category === categoryFilter)
    : nonPendingMaterials;

  // Group materials by category for display
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

  const handleReorder = async (materialId: string, direction: "up" | "down") => {
    const idx = nonPendingMaterials.findIndex((m) => m.id === materialId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= nonPendingMaterials.length) return;

    const reordered = [...nonPendingMaterials];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const orderedIds = reordered.map((m) => m.id);

    // Optimistic update
    setMaterials([...pendingMaterials, ...reordered]);

    try {
      const res = await fetch(
        `/api/corsi/${courseId}/edizioni/${editionId}/materials/reorder`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        }
      );
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Errore durante il riordinamento");
      fetchMaterials();
    }
  };

  const handleEdit = (material: MaterialItem) => {
    setEditingMaterial(material);
    setUploadModalOpen(true);
  };

  const handleApprove = async (materialId: string) => {
    try {
      const res = await fetch(
        `/api/corsi/${courseId}/edizioni/${editionId}/materials/${materialId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success("Materiale approvato");
      fetchMaterials();
    } catch {
      toast.error("Errore durante l'approvazione");
    }
  };

  const handleReject = async (materialId: string) => {
    const reason = window.prompt("Motivo del rifiuto (opzionale):");
    if (reason === null) return; // User cancelled
    try {
      const res = await fetch(
        `/api/corsi/${courseId}/edizioni/${editionId}/materials/${materialId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject", reason: reason || undefined }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success("Materiale rifiutato");
      fetchMaterials();
    } catch {
      toast.error("Errore durante il rifiuto");
    }
  };

  const makeDownloadUrl = (materialId: string) =>
    `/api/corsi/${courseId}/edizioni/${editionId}/materials/${materialId}/download`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {nonPendingMaterials.length} materiali
          </p>
          {pendingMaterials.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              {pendingMaterials.length} da approvare
            </span>
          ) : null}
        </div>
        {!readOnly ? (
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
        ) : null}
      </div>

      {/* Pending materials section */}
      {pendingMaterials.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-amber-300" />
            <span className="text-xs font-semibold text-amber-700">
              In attesa di approvazione ({pendingMaterials.length})
            </span>
            <div className="h-px flex-1 bg-amber-300" />
          </div>
          {pendingMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              canDelete={!readOnly}
              canEdit={false}
              canReorder={false}
              onDelete={() => handleDelete(material.id)}
              onApprove={!readOnly ? () => handleApprove(material.id) : undefined}
              onReject={!readOnly ? () => handleReject(material.id) : undefined}
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
          <div className="h-px bg-border" />
        </div>
      ) : null}

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
            {nonPendingMaterials.length === 0
              ? "Nessun materiale. Carica il primo file."
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
                canDelete={!readOnly}
                canEdit={!readOnly}
                canReorder={!readOnly && !categoryFilter}
                onDelete={() => handleDelete(material.id)}
                onEdit={() => handleEdit(material)}
                onMoveUp={() => handleReorder(material.id, "up")}
                onMoveDown={() => handleReorder(material.id, "down")}
                onPreview={() =>
                  setPreviewMaterial({
                    id: material.id,
                    fileName: material.fileName,
                    mimeType: material.mimeType,
                    downloadUrl: makeDownloadUrl(material.id),
                  })
                }
                isFirst={!categoryFilter ? nonPendingMaterials.indexOf(material) === 0 : idx === 0}
                isLast={
                  !categoryFilter
                    ? nonPendingMaterials.indexOf(material) === nonPendingMaterials.length - 1
                    : idx === items.length - 1
                }
                downloadUrl={makeDownloadUrl(material.id)}
              />
            ))}
          </div>
        ))
      )}

      {/* ZIP Download */}
      {nonPendingMaterials.length > 0 ? (
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
        material={previewMaterial}
      />
    </div>
  );
}
