"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import TeacherModal, { TeacherFormValue } from "@/components/admin/TeacherModal";

type TeacherRow = TeacherFormValue & {
  _count?: { assignments?: number };
};

type ActiveFilter = "all" | "true" | "false";

function parseTeacherRows(payload: unknown): TeacherRow[] {
  if (payload && typeof payload === "object" && Array.isArray((payload as any).data)) {
    return (payload as any).data;
  }
  if (Array.isArray(payload)) {
    return payload as TeacherRow[];
  }
  return [];
}

async function fetchTeachers(search: string, active: ActiveFilter) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (active !== "all") params.set("active", active);

  const response = await fetch(`/api/admin/teachers?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Errore caricamento docenti");
  }
  const json = await response.json();
  return parseTeacherRows(json);
}

export default function AdminDocentiPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRow | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const teachersQuery = useQuery({
    queryKey: ["admin-teachers", search, activeFilter],
    queryFn: () => fetchTeachers(search, activeFilter),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const teachers = useMemo(() => teachersQuery.data ?? [], [teachersQuery.data]);
  const filteredTeachers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return teachers;
    return teachers.filter((teacher) => {
      const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
      const email = (teacher.email ?? "").toLowerCase();
      return fullName.includes(term) || email.includes(term);
    });
  }, [teachers, search]);

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

        <span className="text-sm text-muted-foreground">
          {filteredTeachers.length} docenti
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3">Nome completo</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Telefono</th>
                <th className="px-4 py-3">Specializzazione</th>
                <th className="px-4 py-3">Aree</th>
                <th className="px-4 py-3">Lezioni assegnate</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {teachersQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Caricamento docenti...
                  </td>
                </tr>
              ) : teachersQuery.isError ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-red-600">
                    Errore durante il caricamento dei docenti.
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Nessun docente trovato.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="border-t">
                    <td className="px-4 py-3 font-medium">
                      {teacher.firstName} {teacher.lastName}
                    </td>
                    <td className="px-4 py-3">{teacher.email || "-"}</td>
                    <td className="px-4 py-3">{teacher.phone || "-"}</td>
                    <td className="px-4 py-3">{teacher.specialization || "-"}</td>
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
