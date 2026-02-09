"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type VisibilityBadgeItem = {
  id: string;
  label: string;
  color?: string;
};

type VisibilityBadgeListProps = {
  items: VisibilityBadgeItem[];
  limit?: number;
  defaultColor?: string;
};

export default function VisibilityBadgeList({
  items,
  limit = 3,
  defaultColor = "#2563EB",
}: VisibilityBadgeListProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const visibleItems = items.slice(0, limit);
  const remaining = Math.max(items.length - limit, 0);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const needle = query.toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(needle));
  }, [items, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="flex flex-wrap gap-2">
      {visibleItems.map((item) => (
        <span
          key={item.id}
          className="rounded-full px-2 py-0.5 text-xs text-white"
          style={{ backgroundColor: item.color ?? defaultColor }}
        >
          {item.label}
        </span>
      ))}
      {remaining > 0 ? (
        <div ref={rootRef} className="relative">
          <button
            type="button"
            className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
            onClick={() => setOpen((prev) => !prev)}
          >
            +{remaining} altri
          </button>
          {open ? (
            <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border bg-popover p-3 shadow-lg">
              <input
                type="text"
                placeholder="Cerca..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="mt-2 max-h-48 space-y-2 overflow-auto">
                {filteredItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nessun risultato.
                  </p>
                ) : (
                  filteredItems.map((item) => (
                    <div key={item.id}>
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-xs text-white"
                        style={{ backgroundColor: item.color ?? defaultColor }}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
