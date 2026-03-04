"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import TeacherModal, { TeacherFormValue } from "@/components/admin/TeacherModal";
import { useProvinceRegioni } from "@/hooks/useProvinceRegioni";

type TeacherRow = TeacherFormValue & {
  _count?: { assignments?: number };
};

type CategoryOption = {
  id: string;
  name: string;
};

type ActiveFilter = "all" | "true" | "false";

type TeacherFilters = {
  search: string;
  active: ActiveFilter;
  categoryId: string;
  province: string;
  region: string;
};

function parseTeacherRows(payload: unknown): TeacherRow[] {
  if (payload && typeof payload === "object" && Array.isArray((payload as any).data)) {
    return (payload as any).data;
  }
  if (Array.isArray(payload)) {
    return payload as TeacherRow[];
  }
  return [];
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function fetchTeachers(filters: TeacherFilters) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.active !== "all") params.set("active", filters.active);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.province) params.set("province", filters.province);
  if (filters.region) params.set("region", filters.region);

  const response = await fetch(`/api/admin/teachers?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Errore caricamento docenti");
  }
  const json = await response.json();
  return parseTeacherRows(json);
}

async function fetchCategories() {
  const response = await fetch("/api/admin/categorie");
  if (!response.ok) {
    throw new Error("Errore caricamento aree");
  }
  const json = await response.json().catch(() => ({}));
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows
    .map((row: { id: string; name: string }) => ({
      id: row.id,
      name: row.name,
    }))
    .sort((a: CategoryOption, b: CategoryOption) =>
      a.name.localeCompare(b.name, "it")
    ) as CategoryOption[];
}

export default function AdminDocentiPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [categoryIdFilter, setCategoryIdFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [provinceFilterQuery, setProvinceFilterQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRow | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { province: provinceOptions, regioni } = useProvinceRegioni();

  const teachersQuery = useQuery({
    queryKey: [
      "admin-teachers",
      search,
      activeFilter,
      categoryIdFilter,
      provinceFilter,
      regionFilter,
    ],
    queryFn: () =>
      fetchTeachers({
        search,
        active: activeFilter,
        categoryId: categoryIdFilter,
        province: provinceFilter,
        region: regionFilter,
      }),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const categoriesQuery = useQuery({
    queryKey: ["admin-categorie-options"],
    queryFn: fetchCategories,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const teachers = useMemo(() => teachersQuery.data ?? [], [teachersQuery.data]);
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data]
  );

  const provinceLabelBySigla = useMemo(() => {
    const map = new Map<string, string>();
    provinceOptions.forEach((item) => {
      map.set(item.sigla.toUpperCase(), item.nome);
    });
    return map;
  }, [provinceOptions]);

  const provincePool = useMemo(() => {
    if (!regionFilter) return provinceOptions;
    return provinceOptions.filter(
      (item) => normalizeText(item.regione) === normalizeText(regionFilter)
    );
  }, [provinceOptions, regionFilter]);

  const filteredProvinceOptions = useMemo(() => {
    const query = normalizeText(provinceFilterQuery);
    if (!query) return provincePool.slice(0, 50);
    return provincePool
      .filter((province) => {
        const siglaMatch = province.sigla.toLowerCase().startsWith(query);
        const nameMatch = normalizeText(province.nome).includes(query);
        return siglaMatch || nameMatch;
      })
      .slice(0, 50);
  }, [provincePool, provinceFilterQuery]);

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

  const handleRegionFilterChange = (nextRegion: string) => {
    setRegionFilter(nextRegion);
    if (!nextRegion || !provinceFilter) return;

    const selectedProvince = provinceOptions.find(
      (item) => item.sigla.toUpperCase() === provinceFilter.toUpperCase()
    );
    if (!selectedProvince) return;

    if (normalizeText(selectedProvince.regione) !== normalizeText(nextRegion)) {
      setProvinceFilter("");
      setProvinceFilterQuery("");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setActiveFilter("all");
    setCategoryIdFilter("");
    setProvinceFilter("");
    setProvinceFilterQuery("");
    setRegionFilter("");
  };

  const handleDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/teachers/${teacherToDelete.id}`, {
        method: "DELETE",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(json.error ?? "Errore eliminazione docente");
        return;
      }
      toast.success("Docente eliminato");
      setTeacherToDelete(null);
      await teachersQuery.refetch();
    } catch (error) {
      console.error("[ADMIN_TEACHERS_DELETE] Error:", error);
      toast.error("Errore eliminazione docente");
    } finally {
      setDeleting(false);
    }
  };

  const formatProvince = (value?: string | null) => {
    if (!value) return "-";
    const sigla = value.toUpperCase();
    const name = provinceLabelBySigla.get(sigla);
    return name ? `${sigla} - ${name}` : sigla;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <GraduationCap className="h-5 w-5" />
            Docenti
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestisci l&apos;anagrafica e la disponibilita dei docenti.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={() => {
            setEditingTeacher(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Docente
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca per nome, cognome o email..."
              className="min-h-[44px] w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>

          <select
            className="min-h-[44px] rounded-md border bg-background px-3 py-2 text-sm"
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}
          >
            <option value="all">Tutti</option>
            <option value="true">Attivi</option>
            <option value="false">Inattivi</option>
          </select>

          <span className="text-sm text-muted-foreground">{teachers.length} docenti</span>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[180px] flex-col gap-1 text-xs text-muted-foreground">
            Area
            <select
              className="min-h-[40px] rounded-md border bg-background px-3 py-2 text-sm text-foreground"
              value={categoryIdFilter}
              onChange={(event) => setCategoryIdFilter(event.target.value)}
            >
              <option value="">Tutte</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[220px] flex-col gap-1 text-xs text-muted-foreground">
            Provincia
            <input
              list="teacher-page-province-options"
              value={provinceFilterQuery}
              onChange={(event) => handleProvinceFilterChange(event.target.value)}
              placeholder="Tutte"
              className="min-h-[40px] rounded-md border bg-background px-3 py-2 text-sm text-foreground"
            />
            <datalist id="teacher-page-province-options">
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
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3">Nome completo</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Telefono</th>
                <th className="px-4 py-3">Specializzazione</th>
                <th className="px-4 py-3">Provincia</th>
                <th className="px-4 py-3">Aree</th>
                <th className="px-4 py-3">Lezioni assegnate</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {teachersQuery.isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    Caricamento docenti...
                  </td>
                </tr>
              ) : teachersQuery.isError ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-red-600">
                    Errore durante il caricamento dei docenti.
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    Nessun docente trovato.
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr key={teacher.id} className="border-t">
                    <td className="px-4 py-3 font-medium">
                      {teacher.firstName} {teacher.lastName}
                    </td>
                    <td className="px-4 py-3">{teacher.email || "-"}</td>
                    <td className="px-4 py-3">{teacher.phone || "-"}</td>
                    <td className="px-4 py-3">{teacher.specialization || "-"}</td>
                    <td className="px-4 py-3">{formatProvince(teacher.province)}</td>
                    <td className="px-4 py-3">
                      {teacher.categories && teacher.categories.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {teacher.categories.slice(0, 2).map((category) => (
                            <span
                              key={category.id}
                              className="rounded-full px-2 py-0.5 text-[11px] text-white"
                              style={{ backgroundColor: category.color ?? "#6B7280" }}
                            >
                              {category.name}
                            </span>
                          ))}
                          {teacher.categories.length > 2 ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              +{teacher.categories.length - 2}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">{teacher._count?.assignments ?? 0}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          teacher.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {teacher.active ? "Attivo" : "Inattivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/docenti/${teacher.id}`}
                          className="rounded-md border px-2 py-1 text-xs"
                        >
                          Visualizza
                        </Link>
                        <button
                          type="button"
                          className="inline-flex min-h-[32px] items-center rounded-md border px-2 py-1 text-xs"
                          onClick={() => {
                            setEditingTeacher(teacher);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Modifica
                        </button>
                        <button
                          type="button"
                          className="inline-flex min-h-[32px] items-center rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                          onClick={() => setTeacherToDelete(teacher)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TeacherModal
        open={modalOpen}
        onClose={() => {
          if (deleting) return;
          setModalOpen(false);
          setEditingTeacher(null);
        }}
        teacher={editingTeacher}
        onSaved={async () => {
          await teachersQuery.refetch();
        }}
      />

      <DeleteConfirmModal
        isOpen={Boolean(teacherToDelete)}
        onClose={() => {
          if (deleting) return;
          setTeacherToDelete(null);
        }}
        onConfirm={handleDeleteTeacher}
        title="Elimina docente"
        description="Sei sicuro di voler eliminare questo docente?"
        itemName={
          teacherToDelete
            ? `${teacherToDelete.firstName} ${teacherToDelete.lastName}`
            : undefined
        }
        isDeleting={deleting}
        warningMessage="Questa azione eliminera anche assegnazioni e indisponibilita collegate."
      />
    </div>
  );
}
