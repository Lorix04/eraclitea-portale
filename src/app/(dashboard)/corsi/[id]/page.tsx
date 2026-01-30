"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { formatItalianDate } from "@/lib/date-utils";
import { useSubmitRegistrations } from "@/hooks/useSubmitRegistrations";

type CourseDetail = {
  id: string;
  title: string;
  categories?: { id: string; name: string; color?: string | null }[];
  durationHours?: number | null;
  description?: string | null;
  dateStart?: string | null;
  dateEnd?: string | null;
  deadlineRegistry?: string | null;
  registrations: Array<{
    id: string;
    status: string;
    employee: {
      id: string;
      nome: string;
      cognome: string;
      codiceFiscale: string;
      dataNascita?: string | null;
      luogoNascita?: string | null;
      email?: string | null;
      mansione?: string | null;
      note?: string | null;
    };
  }>;
  certificates: Array<{ id: string; employeeName: string; uploadedAt: string }>;
  progress: { total: number; completed: number };
};

const TABS = [
  { value: "anagrafiche", label: "Anagrafiche" },
  { value: "attestati", label: "Attestati" },
  { value: "info", label: "Info" },
];

const AnagraficheResponsive = dynamic(
  () => import("@/components/AnagraficheResponsive"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full animate-pulse rounded-lg bg-muted" />
    ),
  }
);

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState("anagrafiche");
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitMutation = useSubmitRegistrations(params.id);

  const loadCourse = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/corsi/${params.id}/cliente`);
    const json = await res.json();
    setCourse(json.data ?? null);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const rows = useMemo(() => {
    if (!course) return [];
    if (!course.registrations.length) {
      return [
        {
          nome: "",
          cognome: "",
          codiceFiscale: "",
          dataNascita: "",
          luogoNascita: "",
          email: "",
          mansione: "",
          note: "",
        },
      ];
    }
    return course.registrations.map((reg) => ({
      nome: reg.employee.nome,
      cognome: reg.employee.cognome,
      codiceFiscale: reg.employee.codiceFiscale,
      dataNascita: reg.employee.dataNascita
        ? formatItalianDate(reg.employee.dataNascita)
        : "",
      luogoNascita: reg.employee.luogoNascita ?? "",
      email: reg.employee.email ?? "",
      mansione: reg.employee.mansione ?? "",
      note: reg.employee.note ?? "",
    }));
  }, [course]);

  const registrationStats = useMemo(() => {
    if (!course) return { total: 0, valid: 0, invalid: 0, canSubmit: false };
    const total = course.registrations.length;
    const valid = course.registrations.filter((reg) => {
      const employee = reg.employee;
      return (
        employee.nome &&
        employee.cognome &&
        employee.codiceFiscale &&
        employee.dataNascita &&
        employee.luogoNascita
      );
    }).length;
    const invalid = Math.max(0, total - valid);
    return { total, valid, invalid, canSubmit: total > 0 && invalid === 0 };
  }, [course]);

  const isSubmitted = useMemo(() => {
    if (!course) return false;
    if (course.registrations.length === 0) return false;
    return course.registrations.every((reg) => reg.status !== "INSERTED");
  }, [course]);

  const handleSend = async () => {
    setConfirmOpen(false);
    submitMutation.mutate(undefined, {
      onSuccess: async () => {
        await loadCourse();
      },
    });
  };

  const handleDownloadZip = async () => {
    if (!selectedCerts.length) {
      toast.error("Seleziona almeno un attestato.");
      return;
    }

    const res = await fetch("/api/attestati/download-zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificateIds: selectedCerts }),
    });

    if (!res.ok) {
      toast.error("Errore durante il download.");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attestati_${Date.now()}.zip`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Caricamento corso...</p>;
  }

  if (!course) {
    return <p className="text-sm text-muted-foreground">Corso non trovato.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{course.title}</h1>
        {course.categories && course.categories.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {course.categories.map((category) => (
              <span
                key={category.id}
                className="rounded-full px-2 py-0.5 text-xs text-white"
                style={{ backgroundColor: category.color ?? "#6B7280" }}
              >
                {category.name}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-2 text-sm text-muted-foreground">
          <span>
            {course.dateStart
              ? formatItalianDate(course.dateStart)
              : ""}
          </span>
          {course.dateEnd ? (
            <span> - {formatItalianDate(course.dateEnd)}</span>
          ) : null}
        </div>
        {course.durationHours ? (
          <p className="text-sm text-muted-foreground">
            Ore: {course.durationHours}
          </p>
        ) : null}
        {course.deadlineRegistry ? (
          <p className="text-sm text-muted-foreground">
            Deadline: {formatItalianDate(course.deadlineRegistry)}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`rounded-full px-4 py-2 text-sm ${
              tab === item.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setTab(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "anagrafiche" ? (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stato compilazione</span>
              <span>
                {registrationStats.valid}/{registrationStats.total} validi
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{
                  width: registrationStats.total
                    ? `${Math.round(
                        (registrationStats.valid / registrationStats.total) * 100
                      )}%`
                    : "0%",
                }}
                role="progressbar"
                aria-valuenow={
                  registrationStats.total
                    ? Math.round(
                        (registrationStats.valid / registrationStats.total) * 100
                      )
                    : 0
                }
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Completamento: ${registrationStats.total ? Math.round((registrationStats.valid / registrationStats.total) * 100) : 0}%`}
              />
            </div>
            {registrationStats.invalid > 0 ? (
              <p className="text-sm text-destructive">
                {registrationStats.invalid} dipendenti con dati incompleti.
              </p>
            ) : null}
            {isSubmitted ? (
              <p className="text-sm text-emerald-700">
                Anagrafiche inviate all&apos;ente di formazione.
              </p>
            ) : null}
          </div>

          <AnagraficheResponsive
            initialData={rows}
            courseId={course.id}
            readOnly={isSubmitted}
          />

          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            onClick={() => setConfirmOpen(true)}
            disabled={!registrationStats.canSubmit || isSubmitted || submitMutation.isPending}
          >
            Invia Anagrafiche ({registrationStats.valid} dipendenti)
          </button>
        </div>
      ) : null}

      {tab === "attestati" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {course.certificates.length} attestati disponibili
            </p>
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm"
              onClick={handleDownloadZip}
              disabled={course.certificates.length === 0}
            >
              Download ZIP
            </button>
          </div>
          <div className="rounded-lg border bg-card">
            {course.certificates.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nessun attestato.</p>
            ) : (
              <ul className="divide-y text-sm">
                {course.certificates.map((cert) => (
                  <li key={cert.id} className="flex items-center gap-3 p-4">
                    <input
                      type="checkbox"
                      checked={selectedCerts.includes(cert.id)}
                      onChange={(event) => {
                        setSelectedCerts((prev) =>
                          event.target.checked
                            ? [...prev, cert.id]
                            : prev.filter((id) => id !== cert.id)
                        );
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{cert.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        Caricato il {formatItalianDate(cert.uploadedAt)}
                      </p>
                    </div>
                    <Link
                      href={`/api/attestati/${cert.id}/download`}
                      className="rounded-md border px-3 py-2 text-xs"
                    >
                      Scarica
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {tab === "info" ? (
        <div className="rounded-lg border bg-card p-6">
          {course.durationHours ? (
            <p className="text-sm text-muted-foreground">
              Durata: {course.durationHours} ore
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {course.description || "Nessuna descrizione disponibile."}
          </p>
        </div>
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Conferma invio anagrafiche</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Stai per inviare {registrationStats.valid} anagrafiche per il corso {course.title}.
              Dopo l&apos;invio non sar&agrave; possibile modificare i dati.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm"
                onClick={() => setConfirmOpen(false)}
              >
                Annulla
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
                onClick={handleSend}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Invio..." : "Conferma invio"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
