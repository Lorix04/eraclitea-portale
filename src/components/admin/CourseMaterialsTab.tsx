"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Plus } from "lucide-react";
import { toast } from "sonner";
import MaterialCategoryFilter from "@/components/MaterialCategoryFilter";
import MaterialCard, { type MaterialItem } from "@/components/MaterialCard";
import MaterialUploadModal from "@/components/MaterialUploadModal";
import MaterialPreviewModal from "@/components/MaterialPreviewModal";
import { MATERIAL_CATEGORIES } from "@/lib/material-storage-shared";

type CourseMaterialsTabProps = {
  courseId: string;
};

export default function CourseMaterialsTab({ courseId }: CourseMaterialsTabProps) {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<{
    id: string;
    fileName: string;
    mimeType: string;
    downloadUrl: string;
  } | null>(null);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/corsi/${courseId}/materials`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setMaterials(json.materials ?? []);
    } catch {
      toast.error("Errore nel caricamento dei materiali");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

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
      const res = await fetch(`/api/corsi/${courseId}/materials/${materialId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Materiale eliminato");
      fetchMaterials();
    } catch {
      toast.error("Errore durante l'eliminazione");
    }
  };

  const handleReorder = async (materialId: string, direction: "up" | "down") => {
    const idx = materials.findIndex((m) => m.id === materialId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= materials.length) return;

    const reordered = [...materials];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const orderedIds = reordered.map((m) => m.id);

    setMaterials(reordered);

    try {
      const res = await fetch(`/api/corsi/${courseId}/materials/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
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

  const makeDownloadUrl = (materialId: string) =>
    `/api/corsi/${courseId}/materials/${materialId}/download`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Libreria standard del corso. Questi materiali possono essere importati nelle singole edizioni come copie indipendenti.
        </p>
      </div>

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
            <div key={`skeleton-${i}`} className="h-20 animate-pulse rounded-lg border bg-muted/30" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {materials.length === 0
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
                canDelete
                canEdit
                canReorder={!categoryFilter}
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
                isFirst={!categoryFilter ? materials.indexOf(material) === 0 : idx === 0}
                isLast={
                  !categoryFilter
                    ? materials.indexOf(material) === materials.length - 1
                    : idx === items.length - 1
                }
                downloadUrl={makeDownloadUrl(material.id)}
              />
            ))}
          </div>
        ))
      )}

      {/* The MaterialUploadModal is designed for editions — reuse by passing courseId as editionId
          and pointing API to course materials endpoint. We need a course-aware version. */}
      <CourseMaterialUploadModal
        isOpen={uploadModalOpen}
        onClose={() => { setUploadModalOpen(false); setEditingMaterial(null); }}
        onUploaded={fetchMaterials}
        courseId={courseId}
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

// Inline upload modal for course materials (simpler than creating a separate file)
import { createPortal } from "react-dom";
import { Upload, Loader2 } from "lucide-react";
import {
  MATERIAL_CATEGORIES as CATS,
  MATERIAL_ALLOWED_TYPES as TYPES,
  MATERIAL_MAX_SIZE_BYTES as MAX_SIZE,
} from "@/lib/material-storage-shared";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CourseMaterialUploadModal({
  isOpen,
  onClose,
  onUploaded,
  courseId,
  editingMaterial,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
  courseId: string;
  editingMaterial: MaterialItem | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);

  const isEditMode = !!editingMaterial;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen && editingMaterial) {
      setTitle(editingMaterial.title);
      setDescription(editingMaterial.description ?? "");
      setCategory(editingMaterial.category);
      setFile(null);
    } else if (isOpen) {
      setTitle(""); setDescription(""); setCategory(""); setFile(null);
    }
    setErrors({});
  }, [isOpen, editingMaterial]);

  if (!isOpen || !mounted) return null;

  const handleFileSelect = (selected: File | null) => {
    setFile(selected);
    if (selected && !title.trim()) setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    setErrors((p) => ({ ...p, file: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!isEditMode && !file) errs.file = "Seleziona un file";
    if (!title.trim()) errs.title = "Titolo obbligatorio";
    if (!category) errs.category = "Seleziona una categoria";
    if (file) {
      if (!TYPES.has(file.type)) errs.file = "Tipo file non supportato";
      if (file.size > MAX_SIZE) errs.file = `File troppo grande (max ${formatFileSize(MAX_SIZE)})`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isEditMode && editingMaterial) {
        const res = await fetch(`/api/corsi/${courseId}/materials/${editingMaterial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), description: description.trim() || null, category }),
        });
        if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "Errore"); }
        toast.success("Materiale aggiornato");
      } else {
        const fd = new FormData();
        fd.append("file", file!);
        fd.append("title", title.trim());
        fd.append("description", description.trim());
        fd.append("category", category);
        const res = await fetch(`/api/corsi/${courseId}/materials`, { method: "POST", body: fd });
        if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "Errore"); }
        toast.success("Materiale caricato");
      }
      onUploaded();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={() => { if (!submitting) onClose(); }} aria-hidden="true" />
      <div className="fixed inset-0 z-50 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="modal-panel bg-card shadow-lg sm:max-w-lg" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="text-lg font-semibold">{isEditMode ? "Modifica materiale" : "Carica materiale corso"}</h2>
          </div>
          <div className="modal-body modal-scroll space-y-4">
            {!isEditMode ? (
              <div>
                <label
                  htmlFor="course-material-file-input"
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${dragActive ? "border-amber-500 bg-amber-50" : "border-gray-300 hover:border-gray-400 hover:bg-muted/30"}`}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); const f = e.dataTransfer.files?.[0] ?? null; if (f) handleFileSelect(f); }}
                >
                  <Upload className={`h-8 w-8 ${dragActive ? "text-amber-500" : "text-muted-foreground"}`} />
                  <span className={`text-sm ${dragActive ? "text-amber-700 font-medium" : "text-muted-foreground"}`}>
                    {dragActive ? "Rilascia il file qui" : "Clicca o trascina un file"}
                  </span>
                  <span className="text-xs text-muted-foreground">Max {formatFileSize(MAX_SIZE)}</span>
                </label>
                <input id="course-material-file-input" type="file" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)} />
                {file ? <p className="mt-2 text-sm text-muted-foreground">{file.name} ({formatFileSize(file.size)})</p> : null}
                {errors.file ? <p className="mt-1 text-xs text-red-600">{errors.file}</p> : null}
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-sm font-medium">Titolo <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: "" })); }} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Titolo del materiale" />
              {errors.title ? <p className="mt-1 text-xs text-red-600">{errors.title}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Descrizione</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={3} placeholder="Descrizione opzionale" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Categoria <span className="text-red-500">*</span></label>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setErrors((p) => ({ ...p, category: "" })); }} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Seleziona categoria...</option>
                {Object.entries(CATS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              {errors.category ? <p className="mt-1 text-xs text-red-600">{errors.category}</p> : null}
            </div>
          </div>
          <div className="modal-footer flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Annulla</button>
            <button type="button" onClick={handleSubmit} disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{isEditMode ? "Salvataggio..." : "Caricamento..."}</span> : isEditMode ? "Salva" : "Carica"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
