"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  Briefcase,
  Download,
  FileText,
  Globe,
  GraduationCap,
  Laptop,
  Loader2,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";

type TeacherCvTabProps = {
  teacherId: string;
};

type CvData = {
  workExperiences: any[];
  educations: any[];
  languages: any[];
  certifications: any[];
  skills: any[];
  trainingCourses: any[];
  teachingExperiences: any[];
  publications: any[];
  stats: Record<string, number>;
};

const SECTIONS = [
  { key: "workExperiences", label: "Esperienze lavorative", icon: Briefcase },
  { key: "educations", label: "Formazione e istruzione", icon: GraduationCap },
  { key: "languages", label: "Competenze linguistiche", icon: Globe },
  { key: "certifications", label: "Certificazioni e abilitazioni", icon: Award },
  { key: "skills", label: "Competenze tecniche", icon: Laptop },
  { key: "trainingCourses", label: "Corsi di formazione", icon: BookOpen },
  { key: "teachingExperiences", label: "Esperienza come docente", icon: ScrollText },
  { key: "publications", label: "Pubblicazioni", icon: FileText },
] as const;

function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("it-IT", { month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function dateRange(start: string | null, end: string | null, isCurrent?: boolean): string {
  const s = fmtDate(start);
  if (!s) return "";
  if (isCurrent) return `${s} — In corso`;
  const e = fmtDate(end);
  if (s && e) return `${s} — ${e}`;
  return s;
}

function ExpiryBadge({ date }: { date: string | null | undefined }) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);

  if (d < now) {
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">Scaduta</span>;
  }
  if (d <= threeMonths) {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-600">In scadenza</span>;
  }
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Valido</span>;
}

function PortalBadge() {
  return (
    <span
      className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600"
      title="Generato automaticamente dalle lezioni erogate nel portale"
    >
      Dal portale
    </span>
  );
}

export default function TeacherCvTab({ teacherId }: TeacherCvTabProps) {
  const [data, setData] = useState<CvData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchCv = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/teachers/${teacherId}/cv-data`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Errore nel caricamento del CV");
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    fetchCv();
  }, [fetchCv]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/teachers/${teacherId}/sync-portal-experience`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Sincronizzato: ${json.created} create, ${json.updated} aggiornate, ${json.deleted} rimosse`);
      fetchCv();
    } catch (err: any) {
      toast.error(err.message || "Errore sincronizzazione");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Nessun dato CV disponibile.</p>;
  }

  const totalEntries = SECTIONS.reduce((sum, s) => sum + ((data as any)[s.key]?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {totalEntries} elementi nel curriculum
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Aggiorna esperienza portale
          </button>
          {totalEntries > 0 && (
            <a
              href={`/api/admin/teachers/${teacherId}/cv-pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              Scarica CV Europass
            </a>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const count = (data as any)[key]?.length ?? 0;
          return (
            <div key={key} className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-none">{count}</p>
                <p className="text-[10px] text-muted-foreground truncate">{label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sections */}
      {SECTIONS.map(({ key, label, icon: Icon }) => {
        const items = (data as any)[key] as any[];
        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-2 mt-4">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{label} ({items?.length ?? 0})</h3>
            </div>

            {!items || items.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-6">Nessun dato inserito</p>
            ) : key === "skills" ? (
              <div className="flex flex-wrap gap-1.5 pl-6">
                {items.map((s: any) => (
                  <span key={s.id} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
                    {s.name}
                    {s.level && <span className="text-muted-foreground">· {s.level}</span>}
                  </span>
                ))}
              </div>
            ) : (
              <div className="space-y-2 pl-6">
                {items.map((entry: any) => (
                  <div key={entry.id} className="rounded-md border p-3 space-y-0.5">
                    {renderEntry(key, entry)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderEntry(section: string, e: any) {
  switch (section) {
    case "workExperiences":
      return (
        <>
          <p className="text-sm font-medium">{e.jobTitle}</p>
          <p className="text-xs text-muted-foreground">{e.employer}{e.city ? ` · ${e.city}` : ""}</p>
          {e.startDate && <p className="text-xs text-muted-foreground">{dateRange(e.startDate, e.endDate, e.isCurrent)}</p>}
          {e.sector && <p className="text-xs text-muted-foreground">{e.sector}</p>}
          {e.description && <p className="text-xs text-muted-foreground line-clamp-3 mt-1">{e.description}</p>}
        </>
      );
    case "educations":
      return (
        <>
          <p className="text-sm font-medium">{e.title}</p>
          <p className="text-xs text-muted-foreground">{e.institution}{e.city ? ` · ${e.city}` : ""}</p>
          {(e.startDate || e.endDate) && <p className="text-xs text-muted-foreground">{dateRange(e.startDate, e.endDate)}</p>}
          {e.fieldOfStudy && <p className="text-xs text-muted-foreground">{e.fieldOfStudy}</p>}
          {e.grade && <p className="text-xs text-muted-foreground">Voto: {e.grade}</p>}
        </>
      );
    case "languages":
      return (
        <>
          <p className="text-sm font-medium">{e.language}{e.isNative ? " — Lingua madre" : ""}</p>
          {!e.isNative && (
            <p className="text-xs text-muted-foreground">
              {[e.listening && `Compr. ${e.listening}`, e.reading && `Lett. ${e.reading}`, e.speaking && `Parl. ${e.speaking}`, e.writing && `Scrit. ${e.writing}`].filter(Boolean).join(" · ")}
            </p>
          )}
          {e.certificate && <p className="text-xs text-muted-foreground">Cert: {e.certificate}</p>}
        </>
      );
    case "certifications":
      return (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{e.name}</p>
            <ExpiryBadge date={e.expiryDate} />
          </div>
          <p className="text-xs text-muted-foreground">
            {e.issuingBody}{e.issueDate ? ` · ${fmtDate(e.issueDate)}` : ""}
          </p>
          {e.expiryDate && <p className="text-xs text-muted-foreground">Scadenza: {fmtDate(e.expiryDate)}</p>}
          {e.credentialId && <p className="text-xs text-muted-foreground">Cod: {e.credentialId}</p>}
        </>
      );
    case "trainingCourses":
      return (
        <>
          <p className="text-sm font-medium">{e.title}</p>
          <p className="text-xs text-muted-foreground">
            {[e.provider, fmtDate(e.date), e.durationHours && `${e.durationHours}h`].filter(Boolean).join(" · ")}
          </p>
          {e.topic && <p className="text-xs text-muted-foreground">{e.topic}</p>}
          {e.certificate && <p className="text-xs text-emerald-600 text-[10px]">Certificato ricevuto</p>}
        </>
      );
    case "teachingExperiences":
      return (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{e.courseTitle}</p>
            {e.isFromPortal && <PortalBadge />}
          </div>
          <p className="text-xs text-muted-foreground">
            {[e.organization, e.location].filter(Boolean).join(" · ")}
          </p>
          {(e.startDate || e.totalHours) && (
            <p className="text-xs text-muted-foreground">
              {dateRange(e.startDate, e.endDate)}
              {e.totalHours ? ` · ${e.totalHours}h` : ""}
            </p>
          )}
          {e.targetAudience && <p className="text-xs text-muted-foreground">Destinatari: {e.targetAudience}</p>}
          {e.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{e.description}</p>}
        </>
      );
    case "publications":
      return (
        <>
          <p className="text-sm font-medium">{e.title}</p>
          <p className="text-xs text-muted-foreground">
            {[e.publisher, fmtDate(e.date)].filter(Boolean).join(" · ")}
          </p>
          {e.url && <p className="text-xs text-primary truncate">{e.url}</p>}
        </>
      );
    default:
      return null;
  }
}
