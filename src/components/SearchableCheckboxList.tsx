"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

type Item = {
  id: string;
  label: string;
  subtitle?: string;
};

type SearchableCheckboxListProps = {
  items: Item[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  maxHeight?: string;
  disabled?: boolean;
};

export default function SearchableCheckboxList({
  items,
  selectedIds,
  onSelectionChange,
  placeholder = "Cerca...",
  emptyMessage = "Nessun elemento trovato",
  maxHeight = "250px",
  disabled = false,
}: SearchableCheckboxListProps) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const value = search.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(value) ||
        item.subtitle?.toLowerCase().includes(value)
    );
  }, [items, search]);

  const toggleItem = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const toggleAllFiltered = () => {
    if (disabled) return;
    const filteredIds = filteredItems.map((item) => item.id);
    const allSelected = filteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !filteredIds.includes(id)));
    } else {
      onSelectionChange(Array.from(new Set([...selectedIds, ...filteredIds])));
    }
  };

  const allFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.includes(item.id));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          className="w-full rounded-md border bg-background px-9 py-2 text-sm"
          placeholder={placeholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={disabled}
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filteredItems.length} di {items.length} elementi
          {selectedIds.length > 0 ? (
            <span className="ml-2 text-primary font-medium">
              ({selectedIds.length} selezionati)
            </span>
          ) : null}
        </span>
        {filteredItems.length > 0 ? (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={toggleAllFiltered}
            disabled={disabled}
          >
            {allFilteredSelected ? "Deseleziona tutti" : "Seleziona tutti"}
          </button>
        ) : null}
      </div>

      <div
        className={`rounded-md border ${disabled ? "opacity-60" : ""}`}
        style={{ maxHeight }}
      >
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {search ? `Nessun risultato per "${search}"` : emptyMessage}
          </div>
        ) : (
          <div className="divide-y">
            {filteredItems.map((item) => (
              <label
                key={item.id}
                className={`flex cursor-pointer items-start gap-3 p-3 transition ${
                  selectedIds.includes(item.id) ? "bg-primary/10" : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleItem(item.id)}
                  className="mt-1"
                  disabled={disabled}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  {item.subtitle ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.subtitle}
                    </p>
                  ) : null}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
