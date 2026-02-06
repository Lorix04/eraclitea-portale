"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatItalianDate } from "@/lib/date-utils";
import { BrandedButton } from "@/components/BrandedButton";

type StoricoCourse = {
  id: string;
  title: string;
  completedAt: string;
  totalTrained: number;
  certificateIds: string[];
};

type StoricoYear = {
  year: number;
  courses: StoricoCourse[];
};

export default function StoricoPage() {
  const [data, setData] = useState<StoricoYear[]>([]);

  const loadStorico = async () => {
    const res = await fetch("/api/storico");
    const json = await res.json();
    setData(json.data ?? []);
  };

  useEffect(() => {
    loadStorico();
  }, []);

  const stats = useMemo(() => {
    const courses = new Map<string, StoricoCourse>();
    let totalTrained = 0;
    data.forEach((year) => {
      year.courses.forEach((course) => {
        courses.set(course.id, course);
        totalTrained += course.totalTrained;
      });
    });

    return {
      totalCourses: courses.size,
      totalTrained,
    };
  }, [data]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Storico formazione</h1>
        <p className="text-sm text-muted-foreground">
          Corsi completati e attestati storici.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-3xl font-bold">{stats.totalCourses}</div>
          <p className="text-sm text-muted-foreground">Corsi completati</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-3xl font-bold">{stats.totalTrained}</div>
          <p className="text-sm text-muted-foreground">Dipendenti formati</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-3xl font-bold">-</div>
          <p className="text-sm text-muted-foreground">Ore formazione</p>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun dato storico.</p>
      ) : (
        data.map((year) => (
          <div key={year.year} className="space-y-3">
            <h2 className="text-lg font-semibold">{year.year}</h2>
            <div className="space-y-3">
              {year.courses.map((course) => (
                <div key={course.id} className="rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{course.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Completato il {formatItalianDate(course.completedAt)}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {course.totalTrained} dipendenti formati
                    </span>
                  </div>
                  <div className="mt-3">
                    <BrandedButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadZip(course.certificateIds)}
                    >
                      Download attestati ZIP
                    </BrandedButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
