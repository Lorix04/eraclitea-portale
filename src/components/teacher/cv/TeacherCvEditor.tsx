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
  ScrollText,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { CV_SECTIONS, type CvSectionKey } from "@/lib/cv-schemas";
import CvSection from "./CvSection";
import CvEntryCard from "./CvEntryCard";
import CvEntryModal from "./CvEntryModal";
import ImportCvModal from "./ImportCvModal";

type TeacherCvEditorProps = {
  mode: "registration" | "profile";
  apiBase?: string; // default "/api/teacher/cv"
  onValidationChange?: (isValid: boolean) => void;
};

type SectionData = Record<CvSectionKey, any[]>;

const SECTION_ORDER: {
  key: CvSectionKey;
  icon: typeof Briefcase;
  required?: boolean;
}[] = [
  { key: "work-experience", icon: Briefcase, required: true },
  { key: "education", icon: GraduationCap, required: true },
  { key: "languages", icon: Globe },
  { key: "certifications", icon: Award },
  { key: "skills", icon: Laptop },
  { key: "training-courses", icon: BookOpen },
  { key: "teaching-experience", icon: ScrollText },
  { key: "publications", icon: FileText },
];

const EMPTY_DATA: SectionData = {
  "work-experience": [],
  education: [],
  languages: [],
  certifications: [],
  skills: [],
  "training-courses": [],
  "teaching-experience": [],
  publications: [],
};

export default function TeacherCvEditor({
  mode,
  apiBase = "/api/teacher/cv",
  onValidationChange,
}: TeacherCvEditorProps) {
  const [data, setData] = useState<SectionData>({ ...EMPTY_DATA });
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Set<CvSectionKey>>(
    new Set(["work-experience"])
  );
  const [modalSection, setModalSection] = useState<CvSectionKey | null>(null);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null); // null = checking

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(apiBase);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData({
        "work-experience": json.workExperiences ?? [],
        education: json.educations ?? [],
        languages: json.languages ?? [],
        certifications: json.certifications ?? [],
        skills: json.skills ?? [],
        "training-courses": json.trainingCourses ?? [],
        "teaching-experience": json.teachingExperiences ?? [],
        publications: json.publications ?? [],
      });
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Check if AI import is available (ANTHROPIC_API_KEY configured)
  useEffect(() => {
    fetch(`${apiBase}/import-pdf`, { method: "POST" })
      .then((res) => {
        // 503 = not configured, 400/403 = configured but bad request (means it's available)
        setAiAvailable(res.status !== 503);
      })
      .catch(() => setAiAvailable(false));
  }, [apiBase]);

  // Report validation to parent
  useEffect(() => {
    if (onValidationChange) {
      const isValid =
        data["work-experience"].length >= 1 && data.education.length >= 1;
      onValidationChange(isValid);
    }
  }, [data, onValidationChange]);

  const toggleSection = (key: CvSectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAdd = (section: CvSectionKey) => {
    setModalSection(section);
    setEditingEntry(null);
  };

  const handleEdit = (section: CvSectionKey, entry: any) => {
    setModalSection(section);
    setEditingEntry(entry);
  };

  const handleDelete = async (section: CvSectionKey, id: string) => {
    try {
      const res = await fetch(`${apiBase}/${section}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setData((prev) => ({
        ...prev,
        [section]: prev[section].filter((e: any) => e.id !== id),
      }));
      toast.success("Elemento rimosso");
    } catch {
      toast.error("Errore durante l'eliminazione");
    }
  };

  const handleModalSaved = () => {
    setModalSection(null);
    setEditingEntry(null);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg border bg-muted" />
        ))}
      </div>
    );
  }

  const hasAnyCvData = Object.values(data).some((arr) => arr.length > 0);

  const handleDownloadPdf = () => {
    window.open(`${apiBase}/download-pdf`, "_blank");
  };

  const handleImported = () => {
    setImportModalOpen(false);
    fetchAll();
  };

  return (
    <div className="space-y-2">
      {/* Import / Download buttons */}
      {(aiAvailable || hasAnyCvData) && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          {aiAvailable && (
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Upload className="h-4 w-4" />
              Importa da CV PDF
            </button>
          )}
          {hasAnyCvData && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4" />
              Scarica CV Europass PDF
            </button>
          )}
        </div>
      )}

      {mode === "registration" ? (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {aiAvailable ? (
            <>
              Hai gia un CV? <button type="button" onClick={() => setImportModalOpen(true)} className="underline font-medium">Importa i dati automaticamente</button>.
              Oppure inserisci almeno <strong>1 esperienza lavorativa</strong> e{" "}
              <strong>1 titolo di studio</strong> per procedere.
            </>
          ) : (
            <>
              Inserisci almeno <strong>1 esperienza lavorativa</strong> e{" "}
              <strong>1 titolo di studio</strong> per procedere. Le altre sezioni
              sono opzionali e potrai completarle dal tuo profilo.
            </>
          )}
        </div>
      ) : null}

      {SECTION_ORDER.map(({ key, icon, required }) => {
        const entries = data[key];
        const isReqInMode = mode === "registration" ? required : false;
        return (
          <CvSection
            key={key}
            title={CV_SECTIONS[key].label}
            icon={icon}
            count={entries.length}
            required={isReqInMode}
            isOpen={openSections.has(key)}
            onToggle={() => toggleSection(key)}
            onAdd={() => handleAdd(key)}
          >
            {key === "skills" ? (
              <div className="flex flex-wrap gap-2">
                {entries.map((entry: any) => (
                  <CvEntryCard
                    key={entry.id}
                    section={key}
                    entry={entry}
                    canEdit={!entry.isFromPortal}
                    onEdit={() => handleEdit(key, entry)}
                    onDelete={() => handleDelete(key, entry.id)}
                  />
                ))}
              </div>
            ) : (
              entries.map((entry: any) => (
                <CvEntryCard
                  key={entry.id}
                  section={key}
                  entry={entry}
                  canEdit={!entry.isFromPortal}
                  onEdit={() => handleEdit(key, entry)}
                  onDelete={() => handleDelete(key, entry.id)}
                />
              ))
            )}
          </CvSection>
        );
      })}

      {mode === "registration" ? (
        <div className="mt-4 rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Riepilogo</p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {SECTION_ORDER.map(({ key, required }) => {
              const count = data[key].length;
              const isReq = required;
              const ok = !isReq || count > 0;
              return (
                <div key={key} className="flex items-center gap-1">
                  <span className={ok ? "text-emerald-500" : "text-red-400"}>
                    {ok ? "✓" : "○"}
                  </span>
                  <span className="text-muted-foreground">
                    {CV_SECTIONS[key].label}: {count}
                    {isReq && count === 0 ? " (obbligatorio)" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {modalSection ? (
        <CvEntryModal
          open={true}
          onClose={() => {
            setModalSection(null);
            setEditingEntry(null);
          }}
          section={modalSection}
          sectionLabel={CV_SECTIONS[modalSection].label}
          entry={editingEntry}
          onSaved={handleModalSaved}
          apiBase={apiBase}
        />
      ) : null}

      <ImportCvModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={handleImported}
        apiBase={apiBase}
      />
    </div>
  );
}
