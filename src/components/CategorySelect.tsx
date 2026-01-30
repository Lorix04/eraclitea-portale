"use client";

import { useEffect, useMemo, useState } from "react";

type Category = {
  id: string;
  name: string;
  color?: string | null;
};

type CategorySelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
};

export default function CategorySelect({
  value,
  onChange,
  placeholder = "Seleziona categorie",
  disabled = false,
  searchPlaceholder = "Cerca categoria",
}: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/admin/categorie");
      const json = await res.json();
      setCategories(Array.isArray(json) ? json : json.data ?? []);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [categories, search]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="space-y-2">
      <input
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        disabled={disabled}
      />
      <div className="rounded-md border bg-card p-3 text-sm">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">
            {placeholder}
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {filtered.map((category) => (
              <label key={category.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={value.includes(category.id)}
                  onChange={() => toggle(category.id)}
                  disabled={disabled}
                />
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: category.color ?? "#6B7280" }}
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {value.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {value.length} categorie selezionate
        </p>
      ) : null}
    </div>
  );
}
