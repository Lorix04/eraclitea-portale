"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MATERIAL_CATEGORIES } from "@/lib/material-storage-shared";

type CourseMaterialItem = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
};

type ImportCourseMaterialsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
  courseId: string;
  editionId: string;
  courseName: string;
  existingSourceIds: Set<string>;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportCourseMaterialsModal({
  isOpen,
  onClose,
  onImported,
  courseId,
  editionId,
  courseName,
  existingSourceIds,
}: ImportCourseMaterialsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [materials, setMaterials] = useState<CourseMaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(new Set());
    setLoading(true);
    fetch(`/api/corsi/${courseId}/materials`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((json) => setMaterials(json.materials ?? []))
      .catch(() => setMaterials([]))
      .finally(() => setLoading(false));
  }, [isOpen, courseId]);

  if (!isOpen || !mounted) return null;

  const importable = materials.filter((m) => !existingSourceIds.has(m.id));
  const alreadyImported = materials.filter((m) => existingSourceIds.has(m.id));

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === importable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(importable.map((m) => m.id)));
    }
  };

  const grouped: Record<string, CourseMaterialItem[]> = {};
  for (const m of materials) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  }

  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    setImporting(true);
    try {
      const res = await fetch(
        `/api/corsi/${courseId}/edizioni/${editionId}/materials/import-from-course`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materialIds: Array.from(selectedIds) }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Errore durante l'importazione");
      }
      const result = await res.json();
      if (result.skipped > 0) {
        toast.success(`Importati ${result.imported} materiali, ${result.skipped} già presenti`);
      } else {
        toast.success(`Importati ${result.imported} materiali`);
      }
      onImported();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setImporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={() => { if (!importing) onClose(); }} aria-hidden="true" />
      <div className="fixed inset-0 z-50 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="modal-panel bg-card shadow-lg sm:max-w-lg"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Download className="h-5 w-5" />
              Importa materiali dal corso
            </h2>
          </div>

          <div className="modal-body modal-scroll space-y-4">
            <p className="text-sm text-muted-foreground">
              Seleziona i materiali dalla libreria del corso{" "}
              <strong>{courseName}</strong> da importare.
              I materiali verranno copiati come file indipendenti.
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : materials.length === 0 ? (
              <div className="rounded-lg border bg-muted/30 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nessun materiale disponibile nella libreria del corso.
                </p>
                <a
                  href={`/admin/corsi/${courseId}`}
                  className="mt-2 inline-block text-sm text-primary hover:underline"
                >
                  Vai ai materiali del corso →
                </a>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={importable.length > 0 && selectedIds.size === importable.length}
                      onChange={toggleAll}
                      disabled={importable.length === 0}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Seleziona tutti
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size}/{importable.length} selezionati
                  </span>
                </div>

                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat} className="space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {MATERIAL_CATEGORIES[cat] ?? cat} ({items.length})
                    </h4>
                    {items.map((m) => {
                      const isAlready = existingSourceIds.has(m.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center gap-3 rounded-md border p-2.5 text-sm transition ${
                            isAlready ? "opacity-50 cursor-not-allowed bg-muted/20" : "cursor-pointer hover:bg-muted/30"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(m.id)}
                            onChange={() => toggleId(m.id)}
                            disabled={isAlready}
                            className="h-4 w-4 shrink-0 rounded border-gray-300"
                          />
                          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{m.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {m.fileName} · {formatFileSize(m.fileSize)}
                            </p>
                          </div>
                          {isAlready ? (
                            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                              Già presente
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                ))}

                {alreadyImported.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {alreadyImported.length} materiale{alreadyImported.length > 1 ? "i" : ""} già presente{alreadyImported.length > 1 ? "i" : ""} nell&apos;edizione (verr{alreadyImported.length > 1 ? "anno saltati" : "à saltato"})
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className="modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || selectedIds.size === 0}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {importing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Importazione...</>
              ) : (
                <><Download className="h-4 w-4" />Importa {selectedIds.size} materiali</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
