"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

type EmployeeCardProps = {
  title: string;
  subtitle?: string;
  onDelete: () => void;
  onEdit: () => void;
  disabled?: boolean;
};

export default function EmployeeCard({
  title,
  subtitle,
  onDelete,
  onEdit,
  disabled = false,
}: EmployeeCardProps) {
  const [showDelete, setShowDelete] = useState(false);
  const startX = useRef(0);

  const handleTouchStart = (event: React.TouchEvent) => {
    startX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const endX = event.changedTouches[0].clientX;
    const diff = startX.current - endX;
    if (diff > 50) {
      setShowDelete(true);
    } else if (diff < -50) {
      setShowDelete(false);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div
        className={`rounded-md border bg-card p-3 text-sm transition-transform duration-200 ${
          showDelete ? "-translate-x-20" : ""
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => !disabled && onEdit()}
      >
        <p className="font-medium">{title}</p>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
        {!disabled ? (
          <div className="mt-2 hidden gap-3 text-xs md:flex">
            <button type="button" className="link-brand" onClick={onEdit}>
              Modifica
            </button>
            <button
              type="button"
              className="text-destructive"
              onClick={onDelete}
            >
              Rimuovi
            </button>
          </div>
        ) : null}
      </div>

      {!disabled ? (
        <button
          type="button"
          onClick={onDelete}
          className={`absolute right-0 top-0 bottom-0 flex w-20 items-center justify-center bg-red-500 text-white transition-opacity ${
            showDelete ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Elimina dipendente"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}
