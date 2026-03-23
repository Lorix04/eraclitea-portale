"use client";

import { useState, type ReactNode } from "react";
import CourseMaterialsTab from "@/components/admin/CourseMaterialsTab";

type CourseDetailTabsProps = {
  courseId: string;
  editionsContent: ReactNode;
};

const TABS = [
  { key: "editions", label: "Edizioni" },
  { key: "materials", label: "Materiali" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function CourseDetailTabs({ courseId, editionsContent }: CourseDetailTabsProps) {
  const [tab, setTab] = useState<TabKey>("editions");

  return (
    <div className="space-y-4">
      <div className="border-b">
        <div className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                tab === t.key
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "editions" ? editionsContent : null}
      {tab === "materials" ? <CourseMaterialsTab courseId={courseId} /> : null}
    </div>
  );
}
