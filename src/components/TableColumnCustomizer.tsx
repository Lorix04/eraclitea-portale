"use client";

import { useEffect, useRef, useState } from "react";
import { Columns3, GripVertical, RotateCcw } from "lucide-react";

type CustomizerColumn = { key: string; label: string };

interface TableColumnCustomizerProps {
  /** Customizable columns in current (effective) order. Fixed columns excluded. */
  columns: CustomizerColumn[];
  isHidden: (key: string) => boolean;
  setVisibility: (key: string, visible: boolean) => void;
  reorder: (newOrderKeys: string[]) => void;
  reset: () => void;
}

export default function TableColumnCustomizer({
  columns,
  isHidden,
  setVisibility,
  reorder,
  reset,
}: TableColumnCustomizerProps) {
  const [open, setOpen] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const keys = columns.map((c) => c.key);
    const [moved] = keys.splice(draggedIdx, 1);
    keys.splice(targetIdx, 0, moved);
    reorder(keys);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const visibleCount = columns.filter((c) => !isHidden(c.key)).length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Personalizza colonne"
        title="Personalizza colonne"
      >
        <Columns3 className="h-4 w-4" />
        <span className="hidden sm:inline">Colonne</span>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-72 rounded-md border bg-card shadow-lg"
          role="dialog"
          aria-label="Personalizza colonne tabella"
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">Colonne visibili</span>
            <span className="text-xs text-muted-foreground">
              {visibleCount}/{columns.length}
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {columns.map((col, idx) => {
              const checkboxId = `colcust-${col.key}`;
              return (
                <div
                  key={col.key}
                  draggable
                  onDragStart={(e) => {
                    setDraggedIdx(idx);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverIdx !== idx) setDragOverIdx(idx);
                  }}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(idx);
                  }}
                  onDragEnd={() => {
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 transition-colors select-none ${
                    draggedIdx === idx
                      ? "opacity-40"
                      : dragOverIdx === idx && draggedIdx !== null && draggedIdx !== idx
                        ? "border-t-2 border-primary"
                        : ""
                  }`}
                >
                  <GripVertical
                    className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    id={checkboxId}
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!isHidden(col.key)}
                    onChange={(e) => setVisibility(col.key, e.target.checked)}
                  />
                  <label htmlFor={checkboxId} className="flex-1 cursor-pointer text-sm">
                    {col.label}
                  </label>
                </div>
              );
            })}
          </div>

          <div className="border-t px-3 py-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Ripristina predefiniti
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
