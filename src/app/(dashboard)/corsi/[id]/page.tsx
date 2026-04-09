"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { formatItalianDate } from "@/lib/date-utils";
import { useSubmitRegistrations } from "@/hooks/useSubmitRegistrations";
import { BrandedTabs } from "@/components/BrandedTabs";
import { BrandedButton } from "@/components/BrandedButton";
import { Skeleton } from "@/components/ui/Skeleton";
import EditionStatusBadge from "@/components/EditionStatusBadge";
import { Upload } from "lucide-react";
import ImportEmployeesModal from "@/components/ImportEmployeesModal";

type CourseDetail = {
  id: string;
  courseId?: string;
  clientId?: string;
  editionNumber?: number | null;
  title: string;
  categories?: { id: string; name: string; color?: string | null }[];
  durationHours?: number | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  deadlineRegistry?: string | null;
  presenzaMinimaType?: "percentage" | "days" | "hours" | null;
  presenzaMinimaValue?: number | null;
  status?: string | null;
  notes?: string | null;
  luoghi?: string[];
  lessons?: Array<{
    id: string;
    date: string | Date;
    startTime?: string | null;
    endTime?: string | null;
    durationHours?: number | null;
    title?: string | null;
    luogo?: string | null;
  }>;
  registrations: Array<{
    id: string;
    status: string;
    updatedAt: string | Date;
    employee: {
      id: string;
      nome: string;
      cognome: string;
      codiceFiscale: string;
      sesso?: string | null;
      dataNascita?: string | null;
      luogoNascita?: string | null;
      email?: string | null;
      telefono?: string | null;
      cellulare?: string | null;
      indirizzo?: string | null;
      comuneResidenza?: string | null;
      cap?: string | null;
      provincia?: string | null;
      regione?: string | null;
      emailAziendale?: string | null;
      partitaIva?: string | null;
      iban?: string | null;
      pec?: string | null;
      mansione?: string | null;
      note?: string | null;
      customData?: Record<string, any> | null;
    };
  }>;
  certificates: Array<{ id: string; employeeName: string; uploadedAt: string }>;
  progress: { total: number; completed: number };
};

type AttendanceSummary = {
  totalLessons: number;
  totalHours: number;
  presenzaMinimaType: "percentage" | "days" | "hours" | null;
  presenzaMinimaValue: number | null;
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
  { value: "materiali", label: "Materiali" },
  { value: "info", label: "Info" },
];

const ClientEditionMaterialsTab = dynamic(
  () => import("@/components/client/EditionMaterialsTab"),
  { ssr: false }
);

const AnagraficheResponsive = dynamic(
  () => import("@/components/AnagraficheResponsive"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full rounded-lg border border-gray-200 bg-white p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-8 w-full" />
        <Skeleton className="mt-2 h-8 w-full" />
        <Skeleton className="mt-2 h-8 w-full" />
      </div>
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
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(
    null
  );
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [liveRows, setLiveRows] = useState<import("@/types").EmployeeFormRow[] | null>(null);
  const handleRowsChange = useRef((rows: import("@/types").EmployeeFormRow[]) => {
    setLiveRows(rows);
  }).current;
  const submitMutation = useSubmitRegistrations(params.id);
  const { data: session } = useSession();
  const clientId = session?.user?.clientId;

  // Use course.clientId (always correct) with session fallback for the custom fields query
  const cfClientId = course?.clientId ?? clientId;
  const { data: cfData } = useQuery({
    queryKey: ["custom-fields-status", cfClientId],
    queryFn: async () => {
      if (!cfClientId) return { enabled: false, fields: [] };
      const res = await fetch(`/api/custom-fields?clientId=${cfClientId}`);
      if (!res.ok) return { enabled: false, fields: [] };
      return res.json() as Promise<{ enabled: boolean; fields: { name: string; required: boolean; standardField: string | null }[] }>;
    },
    enabled: !!cfClientId,
    staleTime: 60_000,
  });
  const hasCustomFields = cfData?.enabled && (cfData?.fields?.length ?? 0) > 0;

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
        presenzaMinimaType: json.presenzaMinimaType ?? null,
        presenzaMinimaValue:
          typeof json.presenzaMinimaValue === "number"
            ? json.presenzaMinimaValue
            : null,
        stats: json.stats ?? [],
      });
      setAttendanceLoading(false);
    };
    loadAttendance();
  }, [tab, params.id]);

  const rows: import("@/types").EmployeeFormRow[] = useMemo(() => {
    if (!course) return [];
    if (!course.registrations.length) {
      return [
        {
          nome: "",
          cognome: "",
          codiceFiscale: "",
          sesso: "",
          dataNascita: "",
          luogoNascita: "",
          email: "",
          telefono: "",
          cellulare: "",
          indirizzo: "",
          comuneResidenza: "",
          cap: "",
          provincia: "",
          regione: "",
          emailAziendale: "",
          partitaIva: "",
          iban: "",
          pec: "",
          mansione: "",
          note: "",
        },
      ];
    }
    return course.registrations.map((reg) => ({
      employeeId: reg.employee.id,
      nome: reg.employee.nome,
      cognome: reg.employee.cognome,
      codiceFiscale: reg.employee.codiceFiscale,
      sesso: reg.employee.sesso ?? "",
      dataNascita: reg.employee.dataNascita
        ? formatItalianDate(reg.employee.dataNascita)
        : "",
      luogoNascita: reg.employee.luogoNascita ?? "",
      email: reg.employee.email ?? "",
      telefono: reg.employee.telefono ?? "",
      cellulare: reg.employee.cellulare ?? "",
      indirizzo: reg.employee.indirizzo ?? "",
      comuneResidenza: reg.employee.comuneResidenza ?? "",
      cap: reg.employee.cap ?? "",
      provincia: reg.employee.provincia ?? "",
      regione: reg.employee.regione ?? "",
      emailAziendale: reg.employee.emailAziendale ?? "",
      partitaIva: reg.employee.partitaIva ?? "",
      iban: reg.employee.iban ?? "",
      pec: reg.employee.pec ?? "",
      mansione: reg.employee.mansione ?? "",
      note: reg.employee.note ?? "",
      customData: reg.employee.customData ?? undefined,
    }));
  }, [course]);

  const registrationStats = useMemo(() => {
    // Use live rows from the spreadsheet when available, fall back to API data
    const dataRows = liveRows ?? rows;
    // Filter to non-empty rows (at least cognome, email, or CF)
    const nonEmpty = dataRows.filter(
      (r) =>
        String(r.cognome ?? "").trim() ||
        String(r.email ?? "").trim() ||
        String(r.codiceFiscale ?? "").trim()
    );
    const total = nonEmpty.length;
    if (total === 0) return { total: 0, valid: 0, invalid: 0, canSubmit: false };

    if (process.env.NODE_ENV === "development") {
      console.warn("[registrationStats] hasCustomFields:", hasCustomFields, "cfClientId:", cfClientId, "cfData:", cfData?.enabled, "fields:", cfData?.fields?.length, "liveRows:", !!liveRows, "total:", total);
    }

    const valid = nonEmpty.filter((row) => {
      if (hasCustomFields && cfData?.fields) {
        // Custom fields mode: minimum existence check
        if (!String(row.cognome ?? "").trim() && !String(row.email ?? "").trim()) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[validation] SKIP", row.codiceFiscale, "— no cognome/email");
          }
          return false;
        }
        // Check only required custom fields
        const requiredFields = cfData.fields.filter((f: any) => f.required);
        const missingFields: string[] = [];
        for (const field of requiredFields) {
          if (field.standardField) {
            const val = (row as any)[field.standardField];
            if (!val || String(val).trim() === "") {
              missingFields.push(`${field.name}(std:${field.standardField})`);
            }
          } else {
            // Check custom_* key (live data) then customData (API fallback)
            const val =
              (row as any)[`custom_${field.name}`] ??
              (row.customData as Record<string, any> | undefined)?.[field.name];
            if (!val || String(val).trim() === "") {
              missingFields.push(`${field.name}(custom)`);
            }
          }
        }
        if (missingFields.length > 0) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[validation] INVALID", row.cognome || row.codiceFiscale, "missing:", missingFields.join(", "));
          }
          return false;
        }
        return true;
      }

      // Standard mode: all standard fields required
      const stdMissing: string[] = [];
      if (!String(row.nome ?? "").trim()) stdMissing.push("nome");
      if (!String(row.cognome ?? "").trim()) stdMissing.push("cognome");
      if (!String(row.codiceFiscale ?? "").trim()) stdMissing.push("codiceFiscale");
      if (!String(row.sesso ?? "").trim()) stdMissing.push("sesso");
      if (!String(row.dataNascita ?? "").trim()) stdMissing.push("dataNascita");
      if (!String(row.luogoNascita ?? "").trim()) stdMissing.push("luogoNascita");
      if (!String(row.email ?? "").trim()) stdMissing.push("email");
      if (stdMissing.length > 0) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[validation] INVALID (standard)", row.cognome || row.codiceFiscale, "missing:", stdMissing.join(", "));
        }
        return false;
      }
      return true;
    }).length;

    const invalid = Math.max(0, total - valid);
    return { total, valid, invalid, canSubmit: total > 0 && invalid === 0 };
  }, [liveRows, rows, hasCustomFields, cfData, cfClientId]);

  const isSubmitted = useMemo(() => {
    if (!course) return false;
    if (course.registrations.length === 0) return false;
    return course.registrations.every((reg) => reg.status !== "INSERTED");
  }, [course]);
  const submittedAt = useMemo(() => {
    if (!course || !isSubmitted) return null;
    const timestamps = course.registrations
      .filter((reg) => reg.status !== "INSERTED")
      .map((reg) => new Date(reg.updatedAt).getTime())
      .filter((value) => !Number.isNaN(value));
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps));
  }, [course, isSubmitted]);

  const deadlineDate = useMemo(() => {
    if (!course?.deadlineRegistry) return null;
    const date = new Date(course.deadlineRegistry);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [course?.deadlineRegistry]);

  const deadlineExpired = useMemo(() => {
    if (!deadlineDate) return false;
    return deadlineDate.getTime() < Date.now();
  }, [deadlineDate]);

  const isClosedStatus = useMemo(() => {
    const status = (course?.status || "").toUpperCase();
    return status === "CLOSED" || status === "ARCHIVED";
  }, [course?.status]);

  const isEditionLocked = isClosedStatus || deadlineExpired;
  const isAnagraficheReadOnly = isEditionLocked;

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
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-4 w-56" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-3 h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!course) {
    return <p className="text-sm text-muted-foreground">Corso non trovato.</p>;
  }

  const resolvedClientId = session?.user?.clientId ?? course.clientId ?? "";
  const coursePresenceRequirementLabel =
    course.presenzaMinimaType &&
    typeof course.presenzaMinimaValue === "number"
      ? course.presenzaMinimaType === "percentage"
        ? `${course.presenzaMinimaValue}%`
        : course.presenzaMinimaType === "hours"
          ? `${course.presenzaMinimaValue}h`
          : `${course.presenzaMinimaValue} lezioni`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {course.title}{" "}
          {course.editionNumber ? `· Edizione #${course.editionNumber}` : ""}
        </h1>
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
            {course.startDate
              ? formatItalianDate(course.startDate)
              : ""}
          </span>
          {course.endDate ? (
            <span> - {formatItalianDate(course.endDate)}</span>
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
        <p className="text-sm text-muted-foreground">
          Luogo: {course.luoghi && course.luoghi.length > 0 ? course.luoghi.join(", ") : "-"}
        </p>
        {coursePresenceRequirementLabel ? (
          <p className="text-sm text-muted-foreground">
            Presenza minima richiesta: {coursePresenceRequirementLabel}
          </p>
        ) : null}
        {course.status ? (
          <div className="mt-2">
            <EditionStatusBadge status={course.status} className="text-xs" />
          </div>
        ) : null}
      </div>

      <BrandedTabs
        tabs={TABS.map((item) => ({ id: item.value, label: item.label }))}
        activeTab={tab}
        onTabChange={setTab}
      />

      {tab === "anagrafiche" ? (
        <div className="space-y-4">
          {isClosedStatus ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>Anagrafiche bloccate:</strong> l&apos;edizione e stata
              chiusa. Le anagrafiche non sono piu modificabili.
            </div>
          ) : null}
          {!isClosedStatus && deadlineExpired && deadlineDate ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>Anagrafiche bloccate:</strong> la deadline per
              l&apos;inserimento e scaduta il {formatItalianDate(deadlineDate)}.
            </div>
          ) : null}

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
                Anagrafiche inviate all&apos;ente di formazione
                {submittedAt ? ` il ${formatItalianDate(submittedAt)}` : ""}.
                {!isEditionLocked ? " Puoi ancora modificarle entro la deadline." : ""}
              </p>
            ) : null}
          </div>

          <AnagraficheResponsive
            initialData={rows}
            courseEditionId={course.id}
            clientId={course.clientId}
            readOnly={isAnagraficheReadOnly}
            onRowsChange={handleRowsChange}
          />

          {!isAnagraficheReadOnly ? (
            <div className="flex justify-end">
              <BrandedButton
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!resolvedClientId) {
                    toast.error("Cliente non disponibile");
                    return;
                  }
                  setImportModalOpen(true);
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importa CSV/Excel
              </BrandedButton>
            </div>
          ) : null}

          {!isSubmitted && !isEditionLocked ? (
            <BrandedButton
              onClick={() => setConfirmOpen(true)}
              disabled={!registrationStats.canSubmit || submitMutation.isPending}
            >
              Invia Anagrafiche ({registrationStats.valid} dipendenti)
            </BrandedButton>
          ) : null}
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
          {attendanceSummary?.presenzaMinimaType &&
          typeof attendanceSummary?.presenzaMinimaValue === "number" ? (
            <p className="text-sm text-muted-foreground">
              Presenza minima richiesta:{" "}
              {attendanceSummary.presenzaMinimaType === "percentage"
                ? `${attendanceSummary.presenzaMinimaValue}%`
                : attendanceSummary.presenzaMinimaType === "hours"
                  ? `${attendanceSummary.presenzaMinimaValue}h`
                  : `${attendanceSummary.presenzaMinimaValue} lezioni`}
            </p>
          ) : null}
          <div className="rounded-lg border bg-card">
            {attendanceLoading ? (
              <div className="p-4">
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`attendance-skeleton-${index}`} className="flex gap-4">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </div>
            ) : !attendanceSummary || attendanceSummary.totalLessons === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  Nessuna lezione disponibile per questa edizione.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Le presenze saranno visibili quando l&apos;ente inserira le lezioni.
                </p>
              </div>
            ) : attendanceSummary.stats.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nessuna presenza registrata.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                        <th className="px-4 py-3">Dipendente</th>
                        <th className="px-4 py-3">Ore frequentate</th>
                        <th className="px-4 py-3">Percentuale</th>
                        <th className="px-4 py-3">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceSummary.stats.map((stat) => (
                      <tr key={stat.employeeId} className="border-t">
                        <td className="max-w-[220px] truncate px-4 py-3 font-medium" title={stat.employeeName}>
                          {stat.employeeName}
                        </td>
                          <td className="px-4 py-3">
                            {stat.attendedHours}/{stat.totalHours}h
                          </td>
                        <td className="px-4 py-3">{stat.percentage}%</td>
                        <td className="px-4 py-3">
                          {attendanceSummary.presenzaMinimaType &&
                          typeof attendanceSummary.presenzaMinimaValue ===
                            "number" ? (
                            stat.belowMinimum ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-red-700">
                                Non raggiunto
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-green-700">
                                Raggiunto
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                              Nessun requisito
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "materiali" && course.courseId ? (
        <ClientEditionMaterialsTab
          courseId={course.courseId}
          editionId={course.id}
        />
      ) : null}

      {tab === "info" ? (
        <div className="space-y-4 rounded-lg border bg-card p-6">
          {course.durationHours ? (
            <p className="text-sm text-muted-foreground">
              Durata: {course.durationHours} ore
            </p>
          ) : null}
          {course.notes ? (
            <p className="text-sm text-muted-foreground">
              Note: {course.notes}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {course.description || "Nessuna descrizione disponibile."}
          </p>
          {course.lessons && course.lessons.length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2">Orario</th>
                    <th className="px-4 py-2">Luogo</th>
                  </tr>
                </thead>
                <tbody>
                  {course.lessons.map((lesson) => (
                    <tr key={lesson.id} className="border-t">
                      <td className="px-4 py-2">{formatItalianDate(lesson.date)}</td>
                      <td className="px-4 py-2">
                        {lesson.startTime || "-"}
                        {lesson.endTime ? ` - ${lesson.endTime}` : ""}
                      </td>
                      <td className="px-4 py-2">{lesson.luogo || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {confirmOpen && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 bg-black/30 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
              <div className="modal-panel bg-card shadow-lg sm:max-w-md">
                <div className="modal-header">
                  <h2 className="text-lg font-semibold">Conferma invio anagrafiche</h2>
                </div>
                <div className="modal-body modal-scroll">
                  <p className="text-sm text-muted-foreground">
                    Stai per inviare {registrationStats.valid} anagrafiche per il corso {course.title}
                    {course.editionNumber ? ` (Ed. #${course.editionNumber})` : ""}.
                    Dopo l&apos;invio non sar&agrave; possibile modificare i dati.
                  </p>
                </div>
                <div className="modal-footer flex justify-end gap-2">
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

      {resolvedClientId ? (
        <ImportEmployeesModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          clientId={resolvedClientId}
          editionId={params.id}
          onImportComplete={async () => {
            await loadCourse();
          }}
        />
      ) : null}
    </div>
  );
}
