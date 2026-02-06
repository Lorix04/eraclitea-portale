"use client";

import { cn } from "@/lib/utils";
import { useBranding } from "@/components/BrandingProvider";

type BrandedTab = {
  id: string;
  label: string;
  count?: number;
};

type BrandedTabsProps = {
  tabs: BrandedTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabHover?: (tabId: string) => void;
  className?: string;
};

export function BrandedTabs({
  tabs,
  activeTab,
  onTabChange,
  onTabHover,
  className,
}: BrandedTabsProps) {
  const { primaryColor } = useBranding();

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const hoverBg = isActive ? primaryColor : `${primaryColor}15`;
        const hoverBorder = isActive ? "transparent" : primaryColor;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            onMouseEnter={() => onTabHover?.(tab.id)}
            className={cn(
              "branded-tab rounded-full px-4 py-2 text-sm font-medium transition-all",
              "focus-visible:outline-none"
            )}
            style={{
              backgroundColor: isActive ? primaryColor : "transparent",
              color: isActive ? "#FFFFFF" : "inherit",
              border: isActive ? "none" : "1px solid #E5E7EB",
              ["--tab-hover-bg" as any]: hoverBg,
              ["--tab-hover-border" as any]: hoverBorder,
              ["--ring-color" as any]: primaryColor,
            }}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: isActive
                    ? "rgba(255,255,255,0.2)"
                    : `${primaryColor}15`,
                  color: isActive ? "#FFFFFF" : primaryColor,
                }}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
