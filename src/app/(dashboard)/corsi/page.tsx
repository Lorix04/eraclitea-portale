"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatItalianDate } from "@/lib/date-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingTable } from "@/components/ui/loading-table";
import { BrandedTabs } from "@/components/BrandedTabs";

type Tab = "tutti" | "disponibili" | "in_progress" | "completati";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "tutti", label: "Tutti" },
  { value: "disponibili", label: "Disponibili" },
  { value: "in_progress", label: "In compilazione" },
  { value: "completati", label: "Completati" },
];

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

type CourseListItem = {
  id: string;
  title: string;
  categories?: { id: string; name: string; color?: string | null }[];
  durationHours?: number | null;
  deadlineRegistry?: string | null;
  status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
  registrationsCount: number;
  completedCount: number;
  isNew: boolean;
};

async function fetchCourses(tab: string) {
  const res = await fetch(`/api/corsi/cliente?tab=${tab}`);
  if (!res.ok) {
    throw new Error("Failed to fetch courses");
  }
  return res.json();
}

export default function ClientCorsiPage() {
  const [activeTab, setActiveTab] = useState<Tab>("disponibili");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<
    { id: string; name: string }[]
  >([]);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery<{ data: CourseListItem[] }>({
    queryKey: ["courses", "cliente", activeTab, categoryFilter],
    queryFn: () =>
      fetchCourses(
        `${activeTab}${categoryFilter ? `&categoryId=${categoryFilter}` : ""}`
      ),
    placeholderData: (previousData) => previousData,
  });

  const prefetchTab = (tab: Tab) => {
    queryClient.prefetchQuery({
      queryKey: ["courses", "cliente", tab, categoryFilter],
      queryFn: () =>
        fetchCourses(
          `${tab}${categoryFilter ? `&categoryId=${categoryFilter}` : ""}`
        ),
      staleTime: 60 * 1000,
    });
  };

  useEffect(() => {
    const loadCategories = async () => {
      const res = await fetch("/api/corsi/cliente?tab=tutti&all=true");
      if (!res.ok) return;
      const json = await res.json();
      const courses: CourseListItem[] = json.data ?? [];
      const map = new Map<string, string>();
      courses.forEach((course) => {
        course.categories?.forEach((category) => {
          map.set(category.id, category.name);
        });
      });
      setCategories(
        Array.from(map.entries()).map(([id, name]) => ({ id, name }))
      );
    };
    loadCategories();
  }, []);

  const courses = data?.data ?? [];
  const now = useMemo(() => new Date(), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Corsi</h1>
          <p className="text-sm text-muted-foreground">
            Consulta i corsi disponibili e lo stato delle anagrafiche.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <BrandedTabs
          tabs={TABS.map((item) => ({ id: item.value, label: item.label }))}
          activeTab={activeTab}
          onTabChange={(value) => setActiveTab(value as Tab)}
          onTabHover={(value) => prefetchTab(value as Tab)}
          className="flex-1"
        />
        <select
          className="rounded-full border bg-background px-4 py-2 text-sm"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="">Tutte le categorie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        {isFetching ? (
          <div
            className="absolute right-0 top-0 h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
            role="status"
            aria-live="polite"
          />
        ) : null}

        {isLoading ? (
          <LoadingTable rows={3} cols={1} />
        ) : courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun corso trovato.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => {
              const deadline = course.deadlineRegistry
                ? new Date(course.deadlineRegistry)
                : null;
              const isNearDeadline = deadline
                ? (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 7
                : false;
              const progress = course.registrationsCount
                ? Math.round(
                    (course.completedCount / course.registrationsCount) * 100
                  )
                : 0;

              return (
                <div key={course.id} className="rounded-lg border bg-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold">{course.title}</h3>
                      {course.categories && course.categories.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {course.categories.map((category) => (
                            <span
                              key={category.id}
                              className="rounded-full px-2 py-0.5 text-[11px] text-white"
                              style={{ backgroundColor: category.color ?? "#6B7280" }}
                            >
                              {category.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        STATUS_BADGE[course.status]
                      }`}
                    >
                      {course.status === "AVAILABLE"
                        ? "Disponibile"
                        : course.status === "IN_PROGRESS"
                        ? "In compilazione"
                        : "Completato"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                  {course.durationHours ? (
                    <p className="text-muted-foreground">
                      Ore: {course.durationHours}
                    </p>
                  ) : null}
                    {deadline ? (
                      <p
                        className={
                          isNearDeadline
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }
                      >
                        Deadline: {formatItalianDate(deadline)}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">Deadline: -</p>
                    )}
                    {course.isNew ? (
                      <span className="inline-flex rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">
                        NUOVO
                      </span>
                    ) : null}
                  </div>

                  {course.status === "IN_PROGRESS" ? (
                    <div className="mt-4">
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-brand-primary"
                          style={{ width: `${progress}%` }}
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Completamento: ${progress}%`}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {course.completedCount}/{course.registrationsCount} completate
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <Link
                      href={`/corsi/${course.id}`}
                      className="btn-brand-primary inline-flex rounded-md px-3 py-2 text-xs"
                    >
                      {course.status === "COMPLETED"
                        ? "Visualizza"
                        : "Compila anagrafiche"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
