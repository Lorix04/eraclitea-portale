"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { formatItalianDate } from "@/lib/date-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingTable } from "@/components/ui/loading-table";
import { Skeleton } from "@/components/ui/Skeleton";
import { BrandedTabs } from "@/components/BrandedTabs";
import { useDebounce } from "@/hooks/useDebounce";

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

type EditionItem = {
  id: string;
  editionNumber?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  deadlineRegistry?: string | null;
  status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
  registrationsCount: number;
  completedCount: number;
  isNew: boolean;
};

type CourseGroup = {
  id: string;
  title: string;
  categories?: { id: string; name: string; color?: string | null }[];
  durationHours?: number | null;
  editions: EditionItem[];
};

async function fetchCourses(tab: string) {
  const res = await fetch(`/api/corsi/cliente?tab=${tab}`);
  if (!res.ok) {
    throw new Error("Failed to fetch courses");
  }
  return res.json();
}

function ClientCorsiContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get("tab");
  const initialTab: Tab = TABS.some((tab) => tab.value === tabParam)
    ? (tabParam as Tab)
    : "disponibili";

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get("categoryId") ?? ""
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [yearFilter, setYearFilter] = useState(searchParams.get("year") ?? "");
  const [categories, setCategories] = useState<
    { id: string; name: string }[]
  >([]);
  const queryClient = useQueryClient();
  const debouncedSearch = useDebounce(search, 250);

  const { data, isLoading, isFetching } = useQuery<{ data: CourseGroup[] }>({
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
      const courses: CourseGroup[] = json.data ?? [];
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

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (yearFilter) params.set("year", yearFilter);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [activeTab, categoryFilter, debouncedSearch, yearFilter, router, pathname]);

  const courses = useMemo(() => data?.data ?? [], [data]);
  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    courses.forEach((course) => {
      course.editions.forEach((edition) => {
        const dateValue = edition.startDate || edition.endDate;
        if (!dateValue) return;
        const year = new Date(dateValue).getFullYear();
        if (!Number.isNaN(year)) years.add(String(year));
      });
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return courses
      .map((course) => {
        let editions = course.editions;

        if (yearFilter) {
          editions = editions.filter((edition) => {
            const dateValue = edition.startDate || edition.endDate;
            if (!dateValue) return false;
            const year = new Date(dateValue).getFullYear();
            return String(year) === yearFilter;
          });
        }

        if (term) {
          const courseMatch = course.title.toLowerCase().includes(term);
          if (!courseMatch) {
            editions = editions.filter((edition) =>
              String(edition.editionNumber ?? "").includes(term)
            );
          }
        }

        return { ...course, editions };
      })
      .filter((course) => course.editions.length > 0);
  }, [courses, debouncedSearch, yearFilter]);
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Cerca corso o edizione..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-[240px] rounded-full border bg-background py-2 pl-9 pr-3 text-sm"
            aria-label="Cerca corso o edizione"
          />
        </div>
        <select
          className="rounded-full border bg-background px-4 py-2 text-sm"
          value={yearFilter}
          onChange={(event) => setYearFilter(event.target.value)}
        >
          <option value="">Tutti gli anni</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
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
        ) : filteredCourses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun corso trovato.</p>
        ) : (
          <div className="space-y-4">
            {filteredCourses.map((course) => (
              <div key={course.id} className="rounded-lg border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                  {course.durationHours ? (
                    <span className="text-xs text-muted-foreground">
                      {course.durationHours} ore
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 space-y-3">
                  {course.editions.map((edition) => {
                    const deadline = edition.deadlineRegistry
                      ? new Date(edition.deadlineRegistry)
                      : null;
                    const isNearDeadline = deadline
                      ? (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 7
                      : false;
                    const progress = edition.registrationsCount
                      ? Math.round(
                          (edition.completedCount / edition.registrationsCount) * 100
                        )
                      : 0;

                    return (
                      <div
                        key={edition.id}
                        className="rounded-md border bg-background/40 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">
                              Edizione #{edition.editionNumber ?? "-"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {edition.startDate
                                ? `${formatItalianDate(edition.startDate)}`
                                : "-"}
                              {edition.endDate
                                ? ` · ${formatItalianDate(edition.endDate)}`
                                : ""}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              STATUS_BADGE[edition.status]
                            }`}
                          >
                            {edition.status === "AVAILABLE"
                              ? "Disponibile"
                              : edition.status === "IN_PROGRESS"
                              ? "In compilazione"
                              : "Completato"}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {deadline ? (
                            <span className={isNearDeadline ? "text-destructive" : ""}>
                              Deadline: {formatItalianDate(deadline)}
                            </span>
                          ) : (
                            <span>Deadline: -</span>
                          )}
                          <span>
                            {edition.registrationsCount} dipendenti
                          </span>
                          {edition.isNew ? (
                            <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">
                              NUOVO
                            </span>
                          ) : null}
                        </div>

                        {edition.status === "IN_PROGRESS" ? (
                          <div className="mt-3">
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
                              {edition.completedCount}/{edition.registrationsCount} completate
                            </p>
                          </div>
                        ) : null}

                        <div className="mt-4">
                          <Link
                            href={`/corsi/${edition.id}`}
                            className="btn-brand-primary inline-flex rounded-md px-3 py-2 text-xs"
                          >
                            {edition.status === "COMPLETED"
                              ? "Visualizza"
                              : "Compila anagrafiche"}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientCorsiPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      }
    >
      <ClientCorsiContent />
    </Suspense>
  );
}

