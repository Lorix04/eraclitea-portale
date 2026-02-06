"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Lesson } from "@/types";
import { LessonList } from "@/components/LessonList";
import { LessonForm } from "@/components/LessonForm";
import { useLessons } from "@/hooks/useLessons";
import { toast } from "sonner";

export default function AdminCourseLessonsPage({
  params,
}: {
  params: { id: string };
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>();
  const [mounted, setMounted] = useState(false);

  const { data, isLoading, createLesson, updateLesson, deleteLesson } =
    useLessons(params.id, 1, 50);

  const lessons = useMemo(() => data?.data ?? [], [data?.data]);
  const totalEmployees = data?.totalEmployees ?? 0;
  const totalHours = useMemo(
    () =>
      lessons.reduce(
        (acc, lesson) => acc + (lesson.durationHours ?? 0),
        0
      ),
    [lessons]
  );

  const handleSubmit = async (formData: {
    date: string;
    startTime?: string;
    endTime?: string;
    durationHours: number;
    title?: string;
    notes?: string;
  }) => {
    try {
      if (editingLesson) {
        await updateLesson.mutateAsync({
          lessonId: editingLesson.id,
          data: formData,
        });
        toast.success("Lezione aggiornata");
      } else {
        await createLesson.mutateAsync(formData);
        toast.success("Lezione creata");
      }
      setModalOpen(false);
      setEditingLesson(undefined);
    } catch (error) {
      toast.error("Errore durante il salvataggio");
    }
  };

  const handleDelete = async (lessonId: string) => {
    if (!confirm("Eliminare questa lezione?")) return;
    try {
      await deleteLesson.mutateAsync(lessonId);
      toast.success("Lezione eliminata");
    } catch {
      toast.error("Errore eliminazione lezione");
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen, mounted]);

  const closeModal = () => {
    setModalOpen(false);
    setEditingLesson(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Lezioni</h1>
          <p className="text-sm text-muted-foreground">
            Gestione giornate di lezione del corso.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/corsi/${params.id}/edit`}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Torna al corso
          </Link>
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            onClick={() => {
              setEditingLesson(undefined);
              setModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi lezione
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento lezioni...</p>
      ) : (
        <LessonList
          lessons={lessons}
          totalEmployees={totalEmployees}
          onEdit={(lesson) => {
            setEditingLesson(lesson);
            setModalOpen(true);
          }}
          onDelete={handleDelete}
        />
      )}

      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Totale lezioni: {lessons.length} · Ore totali: {totalHours}
      </div>

      {modalOpen && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50">
              <div
                className="fixed inset-0 bg-black/50"
                onClick={closeModal}
                aria-hidden="true"
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg"
                  role="dialog"
                  aria-modal="true"
                  onClick={(event) => event.stopPropagation()}
                >
                  <h2 className="text-lg font-semibold">
                    {editingLesson ? "Modifica lezione" : "Aggiungi lezione"}
                  </h2>
                  <div className="mt-4">
                    <LessonForm
                      lesson={editingLesson}
                      onSubmit={handleSubmit}
                      onCancel={closeModal}
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
