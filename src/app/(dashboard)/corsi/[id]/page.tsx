"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { formatItalianDate } from "@/lib/date-utils";
import { useSubmitRegistrations } from "@/hooks/useSubmitRegistrations";
import { BrandedTabs } from "@/components/BrandedTabs";
import { BrandedButton } from "@/components/BrandedButton";

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

type AttendanceSummary = {
  totalLessons: number;
  totalHours: number;
  stats: Array<{
    employeeId: string;
    employeeName: string;
    totalLessons: number;
    present: number;
    absent: number;
    justified: number;
    percentage: number;
    totalHours: number;
    attendedHours: number;
    belowMinimum: boolean;
  }>;
};

const TABS = [
  { value: "anagrafiche", label: "Anagrafiche" },
  { value: "attestati", label: "Attestati" },
  { value: "presenze", label: "Presenze" },
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
  const [mounted, setMounted] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(
    null
  );
  const [attendanceLoading, setAttendanceLoading] = useState(false);
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadAttendance = async () => {
      if (tab !== "presenze") return;
      setAttendanceLoading(true);
      const res = await fetch(`/api/corsi/${params.id}/presenze`);
      if (!res.ok) {
        setAttendanceSummary(null);
        setAttendanceLoading(false);
        return;
      }
      const json = await res.json();
      setAttendanceSummary({
        totalLessons: json.totalLessons ?? 0,
        totalHours: json.totalHours ?? 0,
        stats: json.stats ?? [],
      });
      setAttendanceLoading(false);
    };
    loadAttendance();
  }, [tab, params.id]);

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

      <BrandedTabs
        tabs={TABS.map((item) => ({ id: item.value, label: item.label }))}
        activeTab={tab}
        onTabChange={setTab}
      />

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
                className="h-2 rounded-full bg-brand-primary"
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

          <BrandedButton
            onClick={() => setConfirmOpen(true)}
            disabled={!registrationStats.canSubmit || isSubmitted || submitMutation.isPending}
          >
            Invia Anagrafiche ({registrationStats.valid} dipendenti)
          </BrandedButton>
        </div>
      ) : null}

      {tab === "attestati" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {course.certificates.length} attestati disponibili
            </p>
            <BrandedButton
              variant="outline"
              size="sm"
              onClick={handleDownloadZip}
              disabled={course.certificates.length === 0}
            >
              Download ZIP
            </BrandedButton>
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
                      className="btn-brand-outline rounded-md px-3 py-2 text-xs"
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

      {tab === "presenze" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Lezioni: {attendanceSummary?.totalLessons ?? 0} · Ore totali:{" "}
              {attendanceSummary?.totalHours ?? 0}
            </p>
            <Link
              href={`/corsi/${course.id}/presenze`}
              className="btn-brand-outline rounded-md px-3 py-2 text-xs"
            >
              Vedi dettaglio
            </Link>
          </div>
          <div className="rounded-lg border bg-card">
            {attendanceLoading ? (
              <p className="p-4 text-sm text-muted-foreground">
                Caricamento presenze...
              </p>
            ) : !attendanceSummary || attendanceSummary.stats.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nessuna presenza registrata.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3">Dipendente</th>
                    <th className="px-4 py-3">Presenze</th>
                    <th className="px-4 py-3">Percentuale</th>
                    <th className="px-4 py-3">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceSummary.stats.map((stat) => (
                    <tr key={stat.employeeId} className="border-t">
                      <td className="px-4 py-3 font-medium">
                        {stat.employeeName}
                      </td>
                      <td className="px-4 py-3">
                        {stat.present + stat.justified}/{stat.totalLessons}
                      </td>
                      <td className="px-4 py-3">{stat.percentage}%</td>
                      <td className="px-4 py-3">
                        {stat.belowMinimum ? (
                          <span className="text-amber-700">⚠️ Minimo</span>
                        ) : (
                          <span className="text-emerald-700">✅ OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      {confirmOpen && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
                <h2 className="text-lg font-semibold">Conferma invio anagrafiche</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Stai per inviare {registrationStats.valid} anagrafiche per il corso {course.title}.
                  Dopo l&apos;invio non sar&agrave; possibile modificare i dati.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                  <BrandedButton
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmOpen(false)}
                  >
                    Annulla
                  </BrandedButton>
                  <BrandedButton
                    size="sm"
                    onClick={handleSend}
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? "Invio..." : "Conferma invio"}
                  </BrandedButton>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
