"use client";

import { type ReactNode } from "react";
import { ChevronDown, ChevronRight, Plus, type LucideIcon } from "lucide-react";

type CvSectionProps = {
  title: string;
  icon: LucideIcon;
  count: number;
  required?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onAdd: () => void;
  canEdit?: boolean;
  children: ReactNode;
};

export default function CvSection({
  title,
  icon: Icon,
  count,
  required,
  isOpen,
  onToggle,
  onAdd,
  canEdit = true,
  children,
}: CvSectionProps) {
  const isValid = !required || count > 0;

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{title}</span>
          <span className="text-xs text-muted-foreground">({count})</span>
          {required && count === 0 ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 shrink-0">
              Obbligatorio
            </span>
          ) : required && count > 0 ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-600 shrink-0">
              Completato
            </span>
          ) : null}
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="shrink-0 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted transition-colors"
          >
            <Plus className="h-3 w-3" /> Aggiungi
          </button>
        ) : null}
      </button>
      {isOpen ? (
        <div className="border-t px-4 py-3 space-y-2">
          {count === 0 ? (
            <div
              className={`rounded-md border border-dashed p-4 text-center text-sm ${
                required ? "border-red-200 bg-red-50/50 text-red-600" : "text-muted-foreground"
              }`}
            >
              {required
                ? `Aggiungi almeno un elemento per procedere.`
                : "Nessun elemento aggiunto."}
              {canEdit ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="mt-1 block mx-auto text-xs text-primary underline"
                >
                  + Aggiungi
                </button>
              ) : null}
            </div>
          ) : (
            children
          )}
        </div>
      ) : null}
    </div>
  );
}
