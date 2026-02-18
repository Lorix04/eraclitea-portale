"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Award, BookOpen, Search, Users } from "lucide-react";

type SearchResults = {
  courses: Array<{
    id: string;
    title: string;
    kind: "course" | "edition";
    editionNumber?: number;
  }>;
  employees: Array<{ id: string; nome: string; cognome: string; codiceFiscale: string }>;
  certificates: Array<{
    id: string;
    employee: { nome: string; cognome: string };
    courseEdition?: { editionNumber?: number; course?: { title: string } } | null;
  }>;
};

export default function ClientSearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        setResults(await res.json());
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (type: string, id: string, kind?: "course" | "edition") => {
    setOpen(false);
    switch (type) {
      case "course":
        if (kind === "edition") {
          router.push(`/corsi/${id}`);
        }
        break;
      case "employee":
        router.push(`/dipendenti/${id}`);
        break;
      case "certificate":
        router.push("/attestati");
        break;
      default:
        break;
    }
  };

  const hasResults = useMemo(() => {
    if (!results) return false;
    return (
      results.courses.length ||
      results.employees.length ||
      results.certificates.length
    );
  }, [results]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="search-command flex min-h-[44px] items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
        type="button"
      >
        <Search className="h-4 w-4" />
        <span>Cerca...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">Ctrl</span>K
        </kbd>
      </button>

      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4">
              <div className="w-full max-w-2xl rounded-lg bg-card p-4 shadow-lg">
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    className="flex-1 bg-transparent text-sm outline-none"
                    placeholder="Cerca corsi, dipendenti, attestati..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="text-xs text-muted-foreground"
                    onClick={() => setOpen(false)}
                  >
                    ESC
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {!results && query.length >= 2 ? (
                    <p className="text-sm text-muted-foreground">Ricerca in corso...</p>
                  ) : null}

                  {results && !hasResults ? (
                    <p className="text-sm text-muted-foreground">Nessun risultato trovato.</p>
                  ) : null}

                  {results?.courses.length ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">Corsi</p>
                      <div className="space-y-1">
                        {results.courses.map((course) => (
                          <button
                            key={course.id}
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
                            onClick={() => handleSelect("course", course.id, course.kind)}
                          >
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {course.title}
                              {course.kind === "edition" && course.editionNumber
                                ? ` (Ed. #${course.editionNumber})`
                                : ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {results?.employees.length ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">Dipendenti</p>
                      <div className="space-y-1">
                        {results.employees.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
                            onClick={() => handleSelect("employee", emp.id)}
                          >
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {emp.cognome} {emp.nome} - {emp.codiceFiscale}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {results?.certificates.length ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">Attestati</p>
                      <div className="space-y-1">
                        {results.certificates.map((cert) => (
                          <button
                            key={cert.id}
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
                            onClick={() => handleSelect("certificate", cert.id)}
                          >
                            <Award className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {cert.employee.cognome} -{" "}
                              {cert.courseEdition?.course?.title ?? "Esterno"}
                              {cert.courseEdition?.editionNumber
                                ? ` (Ed. #${cert.courseEdition.editionNumber})`
                                : ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
