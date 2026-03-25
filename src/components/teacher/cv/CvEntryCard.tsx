"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { CvSectionKey } from "@/lib/cv-schemas";

type CvEntryCardProps = {
  section: CvSectionKey;
  entry: any;
  canEdit?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("it-IT", { month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function dateRange(start: string | null, end: string | null, isCurrent?: boolean): string {
  const s = fmtDate(start);
  if (isCurrent) return `${s} — In corso`;
  const e = fmtDate(end);
  if (s && e) return `${s} — ${e}`;
  if (s) return s;
  return "";
}

export default function CvEntryCard({ section, entry, canEdit = true, onEdit, onDelete }: CvEntryCardProps) {
  const Actions = canEdit ? (
    <div className="flex gap-1 shrink-0">
      <button type="button" onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Modifica">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-red-400" title="Elimina">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  ) : null;

  switch (section) {
    case "work-experience":
      return (
        <div className="flex items-start justify-between gap-2 rounded-md border p-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">{entry.jobTitle}</p>
            <p className="text-xs text-muted-foreground">
              {entry.employer}{entry.city ? ` · ${entry.city}` : ""}
            </p>
            {entry.startDate ? (
              <p className="text-xs text-muted-foreground">{dateRange(entry.startDate, entry.endDate, entry.isCurrent)}</p>
            ) : null}
            {entry.sector ? <p className="text-xs text-muted-foreground">{entry.sector}</p> : null}
            {entry.description ? <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{entry.description}</p> : null}
          </div>
          {Actions}
        </div>
      );

    case "education":
      return (
        <div className="flex items-start justify-between gap-2 rounded-md border p-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">{entry.title}</p>
            <p className="text-xs text-muted-foreground">
              {entry.institution}{entry.city ? ` · ${entry.city}` : ""}
            </p>
            {(entry.startDate || entry.endDate) ? (
              <p className="text-xs text-muted-foreground">{dateRange(entry.startDate, entry.endDate)}</p>
            ) : null}
            {entry.fieldOfStudy ? <p className="text-xs text-muted-foreground">{entry.fieldOfStudy}</p> : null}
            {entry.grade ? <p className="text-xs text-muted-foreground">Voto: {entry.grade}</p> : null}
          </div>
          {Actions}
        </div>
      );

    case "languages":
      return (
        <div className="flex items-start justify-between gap-2 rounded-md border p-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">
              {entry.language}{entry.isNative ? " — Lingua madre" : ""}
            </p>
            {!entry.isNative ? (
              <p className="text-xs text-muted-foreground">
                {[
                  entry.listening && `Compr. ${entry.listening}`,
                  entry.reading && `Lett. ${entry.reading}`,
                  entry.speaking && `Parl. ${entry.speaking}`,
                  entry.writing && `Scrit. ${entry.writing}`,
                ].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {entry.certificate ? <p className="text-xs text-muted-foreground">Cert: {entry.certificate}</p> : null}
          </div>
          {Actions}
        </div>
      );

    case "certifications":
      return (
        <div className="flex items-start justify-between gap-2 rounded-md border p-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">{entry.name}</p>
            <p className="text-xs text-muted-foreground">
              {entry.issuingBody}{entry.issueDate ? ` · ${fmtDate(entry.issueDate)}` : ""}
            </p>
            {entry.expiryDate ? (
              <p className={`text-xs ${new Date(entry.expiryDate) < new Date() ? "text-red-500" : "text-muted-foreground"}`}>
                Scadenza: {fmtDate(entry.expiryDate)}
                {new Date(entry.expiryDate) < new Date() ? " (Scaduta)" : ""}
              </p>
            ) : null}
            {entry.credentialId ? <p className="text-xs text-muted-foreground">Cod: {entry.credentialId}</p> : null}
          </div>
          {Actions}
        </div>
      );

    case "skills":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
          {entry.name}
          {entry.level ? <span className="text-muted-foreground">· {entry.level}</span> : null}
          {canEdit ? (
            <button type="button" onClick={onDelete} className="ml-1 text-red-400 hover:text-red-600">
              <Trash2 className="h-3 w-3" />
            </button>
          ) : null}
        </span>
      );

    case "training-courses":
      return (
        <div className="flex items-start justify-between gap-2 rounded-md border p-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">{entry.title}</p>
            <p className="text-xs text-muted-foreground">
              {[entry.provider, fmtDate(entry.date), entry.durationHours && `${entry.durationHours}h`].filter(Boolean).join(" · ")}
            </p>
            {entry.topic ? <p className="text-xs text-muted-foreground">{entry.topic}</p> : null}
            {entry.certificate ? <p className="text-xs text-emerald-600">Certificato ricevuto</p> : null}
          </div>
          {Actions}
        </div>
      );

    case "teaching-experience":
      return (
        <div className="flex items-start justify-between gap-2 rounded-md border p-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{entry.courseTitle}</p>
              {entry.isFromPortal ? (
                <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">Dal portale</span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {[entry.organization, entry.location].filter(Boolean).join(" · ")}
            </p>
            {(entry.startDate || entry.totalHours) ? (
              <p className="text-xs text-muted-foreground">
                {dateRange(entry.startDate, entry.endDate)}
                {entry.totalHours ? ` · ${entry.totalHours}h` : ""}
              </p>
            ) : null}
            {entry.targetAudience ? <p className="text-xs text-muted-foreground">Destinatari: {entry.targetAudience}</p> : null}
          </div>
          {!entry.isFromPortal ? Actions : null}
        </div>
      );

    case "publications":
      return (
        <div className="flex items-start justify-between gap-2 rounded-md border p-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">{entry.title}</p>
            <p className="text-xs text-muted-foreground">
              {[entry.publisher, fmtDate(entry.date)].filter(Boolean).join(" · ")}
            </p>
            {entry.url ? <p className="text-xs text-primary truncate">{entry.url}</p> : null}
          </div>
          {Actions}
        </div>
      );

    default:
      return null;
  }
}
