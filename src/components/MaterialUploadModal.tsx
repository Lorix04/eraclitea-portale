"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_ALLOWED_TYPES,
  MATERIAL_MAX_SIZE_BYTES,
} from "@/lib/material-storage-shared";
import type { MaterialItem } from "@/components/MaterialCard";

type MaterialUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
  courseId: string;
  editionId: string;
  editingMaterial?: MaterialItem | null;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MaterialUploadModal({
  isOpen,
  onClose,
  onUploaded,
  courseId,
  editionId,
  editingMaterial,
}: MaterialUploadModalProps) {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!editingMaterial;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && editingMaterial) {
      setTitle(editingMaterial.title);
      setDescription(editingMaterial.description ?? "");
      setCategory(editingMaterial.category);
      setFile(null);
    } else if (isOpen) {
      setTitle("");
      setDescription("");
      setCategory("");
      setFile(null);
    }
    setErrors({});
  }, [isOpen, editingMaterial]);

  if (!isOpen || !mounted) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!isEditMode && !file) errs.file = "Seleziona un file";
    if (!title.trim()) errs.title = "Il titolo e obbligatorio";
    if (!category) errs.category = "Seleziona una categoria";
    if (file) {
      if (!MATERIAL_ALLOWED_TYPES.has(file.type)) {
        errs.file = "Tipo di file non supportato";
      }
      if (file.size > MATERIAL_MAX_SIZE_BYTES) {
        errs.file = `File troppo grande (max ${formatFileSize(MATERIAL_MAX_SIZE_BYTES)})`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isEditMode && editingMaterial) {
        const res = await fetch(
          `/api/corsi/${courseId}/edizioni/${editionId}/materials/${editingMaterial.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              description: description.trim() || null,
              category,
            }),
          }
        );
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || "Errore durante il salvataggio");
        }
        toast.success("Materiale aggiornato");
      } else {
        const formData = new FormData();
        formData.append("file", file!);
        formData.append("title", title.trim());
        formData.append("description", description.trim());
        formData.append("category", category);

        const res = await fetch(
          `/api/corsi/${courseId}/edizioni/${editionId}/materials`,
          { method: "POST", body: formData }
        );
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || "Errore durante il caricamento");
        }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected && !title.trim()) {
      setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    }
    setErrors((prev) => ({ ...prev, file: "" }));
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => {
          if (!submitting) onClose();
        }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="modal-panel bg-card shadow-lg sm:max-w-lg"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 className="text-lg font-semibold">
              {isEditMode ? "Modifica materiale" : "Carica materiale"}
            </h2>
          </div>

          <div className="modal-body modal-scroll space-y-4">
            {!isEditMode ? (
              <div>
                <label
                  htmlFor="material-file-input"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-gray-400 hover:bg-muted/30"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Clicca o trascina un file
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Max {formatFileSize(MATERIAL_MAX_SIZE_BYTES)}
                  </span>
                </label>
                <input
                  id="material-file-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {file ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {file.name} ({formatFileSize(file.size)})
                  </p>
                ) : null}
                {errors.file ? (
                  <p className="mt-1 text-xs text-red-600">{errors.file}</p>
                ) : null}
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-medium">
                Titolo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors((prev) => ({ ...prev, title: "" }));
                }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Titolo del materiale"
              />
              {errors.title ? (
                <p className="mt-1 text-xs text-red-600">{errors.title}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Descrizione
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="Descrizione opzionale"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Categoria <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setErrors((prev) => ({ ...prev, category: "" }));
                }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Seleziona categoria...</option>
                {Object.entries(MATERIAL_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.category ? (
                <p className="mt-1 text-xs text-red-600">{errors.category}</p>
              ) : null}
            </div>
          </div>

          <div className="modal-footer flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditMode ? "Salvataggio..." : "Caricamento..."}
                </span>
              ) : isEditMode ? (
                "Salva"
              ) : (
                "Carica"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
