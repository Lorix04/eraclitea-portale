"use client";

import { cn } from "@/lib/utils";
import { useBranding } from "@/components/BrandingProvider";
import { MATERIAL_CATEGORIES } from "@/lib/material-storage-shared";

type MaterialCategoryFilterProps = {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  counts: Record<string, number>;
};

export default function MaterialCategoryFilter({
  activeCategory,
  onCategoryChange,
  counts,
}: MaterialCategoryFilterProps) {
  const { primaryColor } = useBranding();

  const totalCount = Object.values(counts).reduce((sum, c) => sum + c, 0);

  const pills: { key: string; label: string; count: number }[] = [
    { key: "", label: "Tutti", count: totalCount },
    ...Object.entries(MATERIAL_CATEGORIES).map(([key, label]) => ({
      key,
      label,
      count: counts[key] ?? 0,
    })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
      {pills.map((pill) => {
        const isActive = activeCategory === pill.key;
        return (
          <button
            key={pill.key}
            type="button"
            onClick={() => onCategoryChange(pill.key)}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
              "focus-visible:outline-none"
            )}
            style={{
              backgroundColor: isActive ? primaryColor : "transparent",
              color: isActive ? "#FFFFFF" : "inherit",
              border: isActive ? "none" : "1px solid #E5E7EB",
            }}
          >
            {pill.label}
            <span
              className="ml-1.5 text-xs"
              style={{
                opacity: 0.7,
              }}
            >
              ({pill.count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
