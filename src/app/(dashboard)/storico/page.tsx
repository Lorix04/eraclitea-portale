"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatItalianDate } from "@/lib/date-utils";
import { useDebounce } from "@/hooks/useDebounce";
import { BrandedButton } from "@/components/BrandedButton";
import EditionStatusBadge from "@/components/EditionStatusBadge";

type StoricoCourse = {
  id: string;
  courseTitle: string;
  editionNumber: number;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  completedAt: string;
  startDate?: string | null;
  endDate?: string | null;
  totalParticipants: number;
  certificatesIssued: number;
  certificateIds: string[];
};

type StoricoYear = {
  year: number;
  courses: StoricoCourse[];
};

type StoricoResponse = {
  data: StoricoYear[];
  summary: {
    totalCourses: number;
    totalParticipants: number;
    totalCertificates: number;
  };
  filters: {
    years: number[];
    categories: Array<{ id: string; name: string; color?: string | null }>;
  };
};

type StoricoDetailResponse = {
  edition: {
    id: string;
    title: string;
    status: string;
  };
  registrations: Array<{
    employeeId: string;
    firstName: string;
    lastName: string;
    fiscalCode: string;
    attendanceRate: number;
    attendanceSummary: string;
    certificateId: string | null;
    certificateUrl: string | null;
  }>;
  summary: {
    totalParticipants: number;
    averageAttendance: number;
    certificatesIssued: number;
    certificatesTotal: number;
  };
};

export default function StoricoPage() {
  const [data, setData] = useState<StoricoYear[]>([]);
  const [summary, setSummary] = useState<StoricoResponse["summary"]>({
    totalCourses: 0,
    totalParticipants: 0,
    totalCertificates: 0,
  });
  const [filterOptions, setFilterOptions] = useState<StoricoResponse["filters"]>({
    years: [],
    categories: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [year, setYear] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const debouncedSearch = useDebounce(search, 250);

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [detailError, setDetailError] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<Record<string, StoricoDetailResponse>>({});

  const loadStorico = useCallback(async () => {
    setLoading(true);
    setError(false);

    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (year) params.set("year", year);
    if (categoryId) params.set("categoryId", categoryId);

    try {
      const res = await fetch(`/api/storico?${params.toString()}`);
      if (!res.ok) throw new Error("Errore caricamento storico");
      const json = (await res.json()) as StoricoResponse;
      setData(json.data ?? []);
      setSummary(
        json.summary ?? {
          totalCourses: 0,
          totalParticipants: 0,
          totalCertificates: 0,
        }
      );
      setFilterOptions(json.filters ?? { years: [], categories: [] });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, year, categoryId]);

  useEffect(() => {
    loadStorico();
  }, [loadStorico]);

  const flatCourses = useMemo(
    () => data.flatMap((yearGroup) => yearGroup.courses),
    [data]
  );

  const handleDownloadZip = async (certificateIds: string[]) => {
    if (!certificateIds.length) {
      toast.error("Nessun attestato disponibile.");
      return;
    }

    const res = await fetch("/api/attestati/download-zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificateIds }),
    });

    if (!res.ok) {
      toast.error("Errore durante il download.");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `storico_${Date.now()}.zip`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleExpanded = async (editionId: string) => {
    const isOpen = Boolean(expandedIds[editionId]);
    setExpandedIds((prev) => ({ ...prev, [editionId]: !isOpen }));

    if (isOpen || details[editionId] || detailLoading[editionId]) {
      return;
    }

    setDetailLoading((prev) => ({ ...prev, [editionId]: true }));
    setDetailError((prev) => ({ ...prev, [editionId]: false }));

    try {
      const res = await fetch(`/api/storico?editionId=${editionId}`);
      if (!res.ok) throw new Error("Errore caricamento dettaglio");
      const json = (await res.json()) as StoricoDetailResponse;
      setDetails((prev) => ({ ...prev, [editionId]: json }));
    } catch {
      setDetailError((prev) => ({ ...prev, [editionId]: true }));
    } finally {
      setDetailLoading((prev) => ({ ...prev, [editionId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Storico formazione</h1>
        <p className="text-sm text-muted-foreground">
          Corsi completati, partecipanti e attestati rilasciati.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-3xl font-bold">{summary.totalCourses}</div>
          <p className="text-sm text-muted-foreground">Edizioni completate</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-3xl font-bold">{summary.totalParticipants}</div>
          <p className="text-sm text-muted-foreground">Partecipanti formati</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-3xl font-bold">{summary.totalCertificates}</div>
          <p className="text-sm text-muted-foreground">Attestati rilasciati</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cerca corso..."
          className="min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <select
          value={year}
          onChange={(event) => setYear(event.target.value)}
          className="min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">Tutti gli anni</option>
          {filterOptions.years.map((yearOption) => (
            <option key={yearOption} value={String(yearOption)}>
              {yearOption}
            </option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">Tutte le categorie</option>
          {filterOptions.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Caricamento storico...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.
        </div>
      ) : flatCourses.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Nessun dato storico.
        </div>
      ) : (
        data.map((yearGroup) => (
          <section key={yearGroup.year} className="space-y-3">
            <h2 className="text-lg font-semibold">{yearGroup.year}</h2>
            <div className="space-y-3">
              {yearGroup.courses.map((course) => {
                const isExpanded = Boolean(expandedIds[course.id]);
                const detail = details[course.id];
                const isDetailLoading = Boolean(detailLoading[course.id]);
                const hasDetailError = Boolean(detailError[course.id]);

                return (
                  <article key={course.id} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {course.courseTitle} - Ed. #{course.editionNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {course.startDate ? formatItalianDate(course.startDate) : "-"} -{" "}
                          {course.endDate ? formatItalianDate(course.endDate) : "-"} | Completato il{" "}
                          {formatItalianDate(course.completedAt)}
                        </p>
                        <div className="mt-1">
                          <EditionStatusBadge status={course.status} />
                        </div>
                      </div>

                      <div className="text-right text-xs text-muted-foreground">
                        <p>
                          {course.certificatesIssued} attestati su {course.totalParticipants} partecipanti
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(course.id)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-md border px-3 py-2 text-xs"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        {isExpanded ? "Nascondi dettagli" : "Mostra dettagli"}
                      </button>

                      <BrandedButton
                        variant="outline"
                        size="sm"
                        className="min-h-[44px]"
                        onClick={() => handleDownloadZip(course.certificateIds)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download attestati ZIP
                      </BrandedButton>
                    </div>

                    {isExpanded ? (
                      <div className="mt-4 rounded-md border bg-background p-3">
                        {isDetailLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Caricamento dettaglio edizione...
                          </div>
                        ) : hasDetailError ? (
                          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            Errore nel caricamento del dettaglio edizione.
                          </div>
                        ) : detail ? (
                          <div className="space-y-4">
                            <p className="text-sm font-medium">
                              Partecipanti ({detail.summary.totalParticipants})
                            </p>

                            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                              <table className="w-full min-w-[760px] text-sm">
                                <thead>
                                  <tr className="border-b text-left text-xs text-muted-foreground">
                                    <th className="py-2 pr-3">Nome</th>
                                    <th className="py-2 pr-3">Cognome</th>
                                    <th className="py-2 pr-3">Codice Fiscale</th>
                                    <th className="py-2 pr-3">Presenze</th>
                                    <th className="py-2">Attestato</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detail.registrations.map((registration) => (
                                    <tr key={registration.employeeId} className="border-b last:border-b-0">
                                      <td className="py-2 pr-3">{registration.firstName}</td>
                                      <td className="py-2 pr-3">{registration.lastName}</td>
                                      <td
                                        className="max-w-[220px] truncate py-2 pr-3"
                                        title={registration.fiscalCode}
                                      >
                                        {registration.fiscalCode}
                                      </td>
                                      <td className="py-2 pr-3">{registration.attendanceSummary}</td>
                                      <td className="py-2">
                                        {registration.certificateUrl ? (
                                          <a
                                            href={registration.certificateUrl}
                                            className="text-xs font-medium text-blue-700 hover:underline"
                                          >
                                            Scarica
                                          </a>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Riepilogo: {detail.summary.totalParticipants} partecipanti | Presenza media:{" "}
                              {detail.summary.averageAttendance}% | {detail.summary.certificatesIssued} attestati su{" "}
                              {detail.summary.certificatesTotal}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
