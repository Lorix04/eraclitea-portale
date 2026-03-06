"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Plus, Save, Search, X } from "lucide-react";
import { toast } from "sonner";
import TeacherModal, { TeacherFormValue } from "@/components/admin/TeacherModal";
import { formatItalianDate } from "@/lib/date-utils";
import { useProvinceRegioni } from "@/hooks/useProvinceRegioni";
import { getArrayData } from "@/lib/api-response";
import { fetchWithRetry } from "@/lib/fetch-with-retry";

type LessonItem = {
  id: string;
  date: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  title?: string | null;
  luogo?: string | null;
};

type TeacherAssignment = {
  id: string;
  lessonId: string;
  lesson: {
    id: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    title?: string | null;
    luogo?: string | null;
    courseEdition: {
      id: string;
      editionNumber: number;
      course: { id: string; title: string };
      client: { id: string; ragioneSociale: string };
    };
  };
};

type TeacherListItem = TeacherFormValue & {
  assignments?: TeacherAssignment[];
  _count?: { assignments?: number };
};

type EditionTeachersTabProps = {
  editionId: string;
  lessons: LessonItem[];
  readOnly?: boolean;
};

function toDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function EditionTeachersTab({
  editionId,
  lessons,
  readOnly = false,
}: EditionTeachersTabProps) {
  const [query, setQuery] = useState("");
  const [categoryIdFilter, setCategoryIdFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [provinceFilterQuery, setProvinceFilterQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [lessonSelections, setLessonSelections] = useState<Record<string, Set<string>>>(
    {}
  );
  const [teacherUnavailability, setTeacherUnavailability] = useState<
    Record<string, Set<string>>
  >({});
  const [saving, setSaving] = useState(false);
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const { province: provinceOptions, regioni } = useProvinceRegioni();

  const teachersQuery = useQuery({
    queryKey: ["teachers", "active"],
    queryFn: async () => {
      const res = await fetchWithRetry("/api/admin/teachers?active=true");
      if (!res.ok) {
        throw new Error("Errore caricamento docenti");
      }
      const json = await res.json();
      return getArrayData<TeacherListItem>(json);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const assignmentsQuery = useQuery({
    queryKey: ["edition", editionId, "teachers-assignments"],
    queryFn: async () => {
      const res = await fetchWithRetry(
        `/api/admin/teachers?includeAssignments=true&editionId=${editionId}`
      );
      if (!res.ok) {
        throw new Error("Errore caricamento assegnazioni docenti");
      }
      const json = await res.json();
      return getArrayData<TeacherListItem>(json);
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const lessonsById = useMemo(() => {
    const map = new Map<string, LessonItem>();
    lessons.forEach((lesson) => map.set(lesson.id, lesson));
    return map;
  }, [lessons]);

  const allTeachers = useMemo(() => teachersQuery.data ?? [], [teachersQuery.data]);

  const provinceLabelBySigla = useMemo(() => {
    const map = new Map<string, string>();
    provinceOptions.forEach((item) => {
      map.set(item.sigla.toUpperCase(), item.nome);
    });
    return map;
  }, [provinceOptions]);

  const availableCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    allTeachers.forEach((teacher) => {
      (teacher.categories ?? []).forEach((category) => {
        if (!map.has(category.id)) {
          map.set(category.id, { id: category.id, name: category.name });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "it")
    );
  }, [allTeachers]);

  const provincePool = useMemo(() => {
    if (!regionFilter) return provinceOptions;
    return provinceOptions.filter(
      (item) => normalizeText(item.regione) === normalizeText(regionFilter)
    );
  }, [provinceOptions, regionFilter]);

  const filteredProvinceOptions = useMemo(() => {
    const queryValue = normalizeText(provinceFilterQuery);
    if (!queryValue) return provincePool.slice(0, 40);
    return provincePool
      .filter((province) => {
        const siglaMatch = province.sigla.toLowerCase().startsWith(queryValue);
        const nameMatch = normalizeText(province.nome).includes(queryValue);
        return siglaMatch || nameMatch;
      })
      .slice(0, 40);
  }, [provincePool, provinceFilterQuery]);

  const teachersById = useMemo(() => {
    const map = new Map<string, TeacherListItem>();
    allTeachers.forEach((teacher) => map.set(teacher.id, teacher));
    (assignmentsQuery.data ?? []).forEach((teacher) => map.set(teacher.id, teacher));
    return map;
  }, [allTeachers, assignmentsQuery.data]);

  const selectedTeachers = useMemo(
    () =>
      selectedTeacherIds
        .map((id) => teachersById.get(id))
        .filter((teacher): teacher is TeacherListItem => Boolean(teacher)),
    [selectedTeacherIds, teachersById]
  );

  const assignedTeachers = useMemo(() => {
    const teachers = assignmentsQuery.data ?? [];
    return teachers.filter((teacher) => (teacher.assignments ?? []).length > 0);
  }, [assignmentsQuery.data]);

  const availableTeachers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return allTeachers
      .filter((teacher) => !selectedTeacherIds.includes(teacher.id))
      .filter((teacher) => {
        if (categoryIdFilter) {
          const hasCategory = (teacher.categories ?? []).some(
            (category) => category.id === categoryIdFilter
          );
          if (!hasCategory) return false;
        }

        if (regionFilter) {
          if (!teacher.region) return false;
          if (normalizeText(teacher.region) !== normalizeText(regionFilter)) {
            return false;
          }
        }

        if (provinceFilter) {
          if (!teacher.province) return false;
          if (
            teacher.province.toUpperCase() !== provinceFilter.toUpperCase()
          ) {
            return false;
          }
        }

        if (!term) return true;
        const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
        const email = (teacher.email ?? "").toLowerCase();
        const specialization = (teacher.specialization ?? "").toLowerCase();
        const province = (teacher.province ?? "").toLowerCase();
        const region = (teacher.region ?? "").toLowerCase();
        const categoryNames = (teacher.categories ?? [])
          .map((category) => category.name.toLowerCase())
          .join(" ");

        return (
          fullName.includes(term) ||
          email.includes(term) ||
          specialization.includes(term) ||
          province.includes(term) ||
          region.includes(term) ||
          categoryNames.includes(term)
        );
      });
  }, [
    allTeachers,
    categoryIdFilter,
    provinceFilter,
    query,
    regionFilter,
    selectedTeacherIds,
  ]);

  useEffect(() => {
    const fromData = assignmentsQuery.data ?? [];
    const nextSelected = fromData
      .filter((teacher) => (teacher.assignments ?? []).length > 0)
      .map((teacher) => teacher.id);

    const nextSelections: Record<string, Set<string>> = {};
    fromData.forEach((teacher) => {
      const assignmentLessonIds = (teacher.assignments ?? []).map(
        (assignment) => assignment.lessonId
      );
      if (assignmentLessonIds.length > 0) {
        nextSelections[teacher.id] = new Set(assignmentLessonIds);
      }
    });

    setSelectedTeacherIds(nextSelected);
    setLessonSelections(nextSelections);
  }, [assignmentsQuery.data]);

  useEffect(() => {
    const lessonDateKeys = lessons
      .map((lesson) => toDateKey(lesson.date))
      .filter((value) => value);

    if (selectedTeacherIds.length === 0 || lessonDateKeys.length === 0) {
      setTeacherUnavailability({});
      return;
    }

    const sorted = [...new Set(lessonDateKeys)].sort();
    const from = sorted[0];
    const to = sorted[sorted.length - 1];

    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        selectedTeacherIds.map(async (teacherId) => {
          const res = await fetchWithRetry(
            `/api/admin/teachers/${teacherId}/unavailability?from=${from}&to=${to}`
          );
          if (!res.ok) return [teacherId, new Set<string>()] as const;
          const json = await res.json().catch(() => ({}));
          const rows = Array.isArray(json?.data) ? json.data : [];
          const dateSet = new Set<string>(
            rows
              .map((row: { date?: string }) => (row.date ? toDateKey(row.date) : ""))
              .filter((value: string) => value.length > 0)
          );
          return [teacherId, dateSet] as const;
        })
      );

      if (cancelled) return;
      const next: Record<string, Set<string>> = {};
      entries.forEach(([teacherId, set]) => {
        next[teacherId] = set;
      });
      setTeacherUnavailability(next);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [lessons, selectedTeacherIds]);

  const handleAddTeacher = (teacherId: string) => {
    if (!teacherId) return;
    if (selectedTeacherIds.includes(teacherId)) {
      return;
    }
    setSelectedTeacherIds((prev) => [...prev, teacherId]);
    setLessonSelections((prev) => ({
      ...prev,
      [teacherId]: prev[teacherId] ?? new Set<string>(),
    }));
    setQuery("");
  };

  const handleRemoveTeacher = (teacherId: string) => {
    setSelectedTeacherIds((prev) => prev.filter((id) => id !== teacherId));
    setLessonSelections((prev) => {
      const next = { ...prev };
      delete next[teacherId];
      return next;
    });
  };

  const toggleLessonForTeacher = (teacherId: string, lessonId: string) => {
    setLessonSelections((prev) => {
      const currentSet = prev[teacherId] ?? new Set<string>();
      const nextSet = new Set(currentSet);
      if (nextSet.has(lessonId)) {
        nextSet.delete(lessonId);
      } else {
        nextSet.add(lessonId);
      }
      return {
        ...prev,
        [teacherId]: nextSet,
      };
    });
  };

  const handleProvinceFilterChange = (value: string) => {
    setProvinceFilterQuery(value);
    const normalized = normalizeText(value);
    if (!normalized) {
      setProvinceFilter("");
      return;
    }

    const match = provincePool.find((item) => {
      const label = normalizeText(`${item.sigla} - ${item.nome}`);
      return (
        label === normalized ||
        item.sigla.toLowerCase() === normalized ||
        normalizeText(item.nome) === normalized
      );
    });

    if (!match) {
      setProvinceFilter("");
      return;
    }

    setProvinceFilter(match.sigla.toUpperCase());
    setProvinceFilterQuery(`${match.sigla.toUpperCase()} - ${match.nome}`);
    if (!regionFilter) {
      setRegionFilter(match.regione);
    }
  };

  const handleRegionFilterChange = (value: string) => {
    setRegionFilter(value);
    if (!value || !provinceFilter) return;

    const selectedProvince = provinceOptions.find(
      (item) => item.sigla.toUpperCase() === provinceFilter.toUpperCase()
    );
    if (!selectedProvince) return;

    if (normalizeText(selectedProvince.regione) !== normalizeText(value)) {
      setProvinceFilter("");
      setProvinceFilterQuery("");
    }
  };

  const resetFilters = () => {
    setQuery("");
    setCategoryIdFilter("");
    setProvinceFilter("");
    setProvinceFilterQuery("");
    setRegionFilter("");
  };

  const formatProvince = (value?: string | null) => {
    if (!value) return "-";
    const sigla = value.toUpperCase();
    const nome = provinceLabelBySigla.get(sigla);
    return nome ? `${sigla} - ${nome}` : sigla;
  };

  const handleSaveAssignments = async () => {
    setSaving(true);
    try {
      const currentTeachers = assignmentsQuery.data ?? [];
      const existingByTeacher = new Map<
        string,
        { id: string; lessonId: string }[]
      >();

      currentTeachers.forEach((teacher) => {
        existingByTeacher.set(
          teacher.id,
          (teacher.assignments ?? []).map((assignment) => ({
            id: assignment.id,
            lessonId: assignment.lessonId,
          }))
        );
      });

      for (const teacherId of selectedTeacherIds) {
        const existing = existingByTeacher.get(teacherId) ?? [];
        const existingLessonIds = new Set(existing.map((item) => item.lessonId));
        const desiredSet = lessonSelections[teacherId] ?? new Set<string>();

        const toAdd = Array.from(desiredSet).filter(
          (lessonId) => !existingLessonIds.has(lessonId)
        );
        const toDelete = existing.filter((item) => !desiredSet.has(item.lessonId));

        if (toAdd.length > 0) {
          const res = await fetch(`/api/admin/teachers/${teacherId}/assignments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionIds: toAdd }),
          });
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(
              json.error ?? "Errore salvataggio assegnazioni docente"
            );
          }
        }

        for (const item of toDelete) {
          const res = await fetch(
            `/api/admin/teachers/${teacherId}/assignments?id=${item.id}`,
            {
              method: "DELETE",
            }
          );
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(
              json.error ?? "Errore rimozione assegnazione docente"
            );
          }
        }
      }

      for (const teacher of currentTeachers) {
        if (selectedTeacherIds.includes(teacher.id)) continue;
        for (const assignment of teacher.assignments ?? []) {
          const res = await fetch(
            `/api/admin/teachers/${teacher.id}/assignments?id=${assignment.id}`,
            {
              method: "DELETE",
            }
          );
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(
              json.error ?? "Errore rimozione assegnazione docente"
            );
          }
        }
      }

      await Promise.all([assignmentsQuery.refetch(), teachersQuery.refetch()]);
      toast.success("Assegnazioni docenti aggiornate");
    } catch (error) {
      console.error("[EDITION_TEACHERS_SAVE] Error:", error);
      const message =
        error instanceof Error ? error.message : "Errore salvataggio assegnazioni";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const renderCategoryChips = (
    categories: TeacherListItem["categories"] | undefined,
    compact = false
  ) => {
    if (!categories || categories.length === 0) {
      return <span className="text-xs text-muted-foreground">Nessuna area</span>;
    }

    return (
      <div className="flex flex-wrap items-center gap-1">
        {categories.map((category) => (
          <span
            key={category.id}
            className={
              compact
                ? "rounded-full border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                : "rounded-full px-2 py-0.5 text-[11px] text-white"
            }
            style={
              compact
                ? undefined
                : { backgroundColor: category.color ?? "#6B7280" }
            }
          >
            {category.name}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Docenti assegnati</h3>
        {assignedTeachers.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nessun docente assegnato a questa edizione.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {assignedTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="rounded-md border bg-background p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {teacher.firstName} {teacher.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {teacher.specialization || "Nessuna specializzazione"}
                      {" · "}
                      {formatProvince(teacher.province)}
                    </p>
                    <div className="mt-1">{renderCategoryChips(teacher.categories)}</div>
                  </div>
                  <Link
                    href={`/admin/docenti/${teacher.id}`}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    Apri profilo
                  </Link>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {(teacher.assignments ?? []).map((assignment) => {
                    const lesson = assignment.lesson;
                    return (
                      <li key={assignment.id}>
                        {formatItalianDate(lesson.date)}{" "}
                        {lesson.startTime ? `(${lesson.startTime}` : ""}
                        {lesson.endTime ? ` - ${lesson.endTime})` : lesson.startTime ? ")" : ""}
                        {" · "}
                        {lesson.title || "Lezione"}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Modifica assegnazioni docenti
          </h3>
          <button
            type="button"
            className="inline-flex min-h-[40px] items-center rounded-md border px-3 py-2 text-sm"
            onClick={() => setTeacherModalOpen(true)}
            disabled={readOnly}
          >
            <Plus className="mr-2 h-4 w-4" />
            Crea nuovo docente
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cerca docente per nome, cognome, email o area..."
              className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[170px] flex-col gap-1 text-xs text-muted-foreground">
              Area
              <select
                className="min-h-[40px] rounded-md border bg-background px-3 py-2 text-sm text-foreground"
                value={categoryIdFilter}
                onChange={(event) => setCategoryIdFilter(event.target.value)}
              >
                <option value="">Tutte</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-[220px] flex-col gap-1 text-xs text-muted-foreground">
              Provincia
              <input
                list="edition-teachers-province-options"
                value={provinceFilterQuery}
                onChange={(event) => handleProvinceFilterChange(event.target.value)}
                placeholder="Tutte"
                className="min-h-[40px] rounded-md border bg-background px-3 py-2 text-sm text-foreground"
              />
              <datalist id="edition-teachers-province-options">
                {filteredProvinceOptions.map((item) => (
                  <option
                    key={`${item.sigla}-${item.nome}`}
                    value={`${item.sigla.toUpperCase()} - ${item.nome}`}
                  />
                ))}
              </datalist>
            </label>

            <label className="flex min-w-[200px] flex-col gap-1 text-xs text-muted-foreground">
              Regione
              <select
                className="min-h-[40px] rounded-md border bg-background px-3 py-2 text-sm text-foreground"
                value={regionFilter}
                onChange={(event) => handleRegionFilterChange(event.target.value)}
              >
                <option value="">Tutte</option>
                {regioni.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="inline-flex min-h-[40px] items-center rounded-md border px-3 py-2 text-sm"
              onClick={resetFilters}
            >
              <X className="mr-2 h-4 w-4" />
              Resetta filtri
            </button>
          </div>

          <div className="max-h-56 space-y-2 overflow-auto rounded-md border bg-background p-2">
            {availableTeachers.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                Nessun docente disponibile con questi filtri.
              </p>
            ) : (
              availableTeachers.slice(0, 20).map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {teacher.firstName} {teacher.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {teacher.specialization || "Nessuna specializzazione"}
                      {" · "}
                      {formatProvince(teacher.province)}
                      {teacher.email ? ` · ${teacher.email}` : ""}
                    </p>
                    <div className="mt-1">{renderCategoryChips(teacher.categories, true)}</div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex min-h-[36px] items-center rounded-md border px-2 py-1 text-xs"
                    onClick={() => handleAddTeacher(teacher.id)}
                    disabled={readOnly}
                  >
                    Aggiungi
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedTeachers.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Seleziona almeno un docente per assegnarlo alle lezioni.
          </p>
        ) : null}

        {selectedTeachers.map((teacher) => {
          const selection = lessonSelections[teacher.id] ?? new Set<string>();
          const unavailableDates = teacherUnavailability[teacher.id] ?? new Set<string>();

          return (
            <div key={teacher.id} className="mt-4 rounded-lg border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {teacher.firstName} {teacher.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {teacher.specialization || "Nessuna specializzazione"}
                    {" · "}
                    {formatProvince(teacher.province)}
                  </p>
                  <div className="mt-1">{renderCategoryChips(teacher.categories)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/docenti/${teacher.id}`}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    Profilo docente
                  </Link>
                  {!readOnly ? (
                    <button
                      type="button"
                      className="inline-flex min-h-[36px] items-center rounded-md border px-2 py-1 text-xs text-destructive"
                      onClick={() => handleRemoveTeacher(teacher.id)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Rimuovi
                    </button>
                  ) : null}
                </div>
              </div>

              {lessons.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Nessuna lezione disponibile nell&apos;edizione.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {lessons.map((lesson) => {
                    const selected = selection.has(lesson.id);
                    const lessonDateKey = toDateKey(lesson.date);
                    const hasWarning = unavailableDates.has(lessonDateKey);
                    const lessonInfo = lessonsById.get(lesson.id) ?? lesson;

                    return (
                      <label
                        key={lesson.id}
                        className="flex flex-wrap items-start gap-3 rounded-md border p-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={readOnly}
                          onChange={() => toggleLessonForTeacher(teacher.id, lesson.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">
                            {formatItalianDate(lessonInfo.date)} · {lessonInfo.startTime || "--:--"}
                            {lessonInfo.endTime ? ` - ${lessonInfo.endTime}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lessonInfo.title || "Lezione"} · {lessonInfo.luogo || "Luogo non definito"}
                          </p>
                        </div>
                        {hasWarning ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            Docente non disponibile
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {!readOnly ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSaveAssignments}
              disabled={saving}
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvataggio..." : "Salva assegnazioni"}
            </button>
          </div>
        ) : null}
      </div>

      <TeacherModal
        open={teacherModalOpen}
        onClose={() => setTeacherModalOpen(false)}
        onSaved={(teacher) => {
          setTeacherModalOpen(false);
          setSelectedTeacherIds((prev) =>
            prev.includes(teacher.id) ? prev : [...prev, teacher.id]
          );
          setLessonSelections((prev) => ({
            ...prev,
            [teacher.id]: prev[teacher.id] ?? new Set<string>(),
          }));
          void teachersQuery.refetch();
        }}
      />
    </div>
  );
}
