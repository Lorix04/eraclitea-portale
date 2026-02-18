"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormLabel } from "@/components/ui/FormLabel";

type CourseOption = {
  id: string;
  title: string;
  categories: string[];
};

type ClientOption = {
  id: string;
  ragioneSociale: string;
  isActive: boolean;
};

type FieldErrors = {
  courseId?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  deadlineRegistry?: string;
};

type CreateEditionModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
};

function normalizeCourse(item: any): CourseOption {
  const categories = Array.isArray(item?.categories)
    ? item.categories
        .map((entry: any) => entry?.category?.name ?? entry?.name)
        .filter((name: unknown): name is string => typeof name === "string" && name.length > 0)
    : [];

  return {
    id: String(item?.id ?? ""),
    title: String(item?.title ?? ""),
    categories,
  };
}

function normalizeClient(item: any): ClientOption {
  return {
    id: String(item?.id ?? ""),
    ragioneSociale: String(item?.ragioneSociale ?? ""),
    isActive: Boolean(item?.isActive),
  };
}

function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function CreateEditionModal({
  open,
  onClose,
  onCreated,
}: CreateEditionModalProps) {
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);

  const [courseQuery, setCourseQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");

  const [courseId, setCourseId] = useState("");
  const [clientId, setClientId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deadlineRegistry, setDeadlineRegistry] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const resetForm = () => {
    setApiError(null);
    setFieldErrors({});
    setCourseQuery("");
    setClientQuery("");
    setCourseId("");
    setClientId("");
    setStartDate("");
    setEndDate("");
    setDeadlineRegistry("");
    setNotes("");
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const loadOptions = async () => {
      setLoadingOptions(true);
      setApiError(null);
      try {
        const [coursesRes, clientsRes] = await Promise.all([
          fetch("/api/corsi"),
          fetch("/api/admin/clienti?isActive=true"),
        ]);

        if (!coursesRes.ok || !clientsRes.ok) {
          if (!cancelled) {
            setApiError("Errore nel caricamento di corsi o clienti.");
          }
          return;
        }

        const [coursesJson, clientsJson] = await Promise.all([
          coursesRes.json(),
          clientsRes.json(),
        ]);

        if (cancelled) return;

        const nextCourses = Array.isArray(coursesJson?.data)
          ? coursesJson.data.map(normalizeCourse).filter((course: CourseOption) => course.id && course.title)
          : [];

        const nextClients = Array.isArray(clientsJson?.data)
          ? clientsJson.data
              .map(normalizeClient)
              .filter((client: ClientOption) => client.id && client.ragioneSociale && client.isActive)
          : [];

        setCourses(nextCourses);
        setClients(nextClients);
      } catch {
        if (!cancelled) {
          setApiError("Errore nel caricamento di corsi o clienti.");
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    };

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const filteredCourses = useMemo(() => {
    const query = courseQuery.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter((course) => {
      const categoriesText = course.categories.join(" ").toLowerCase();
      return (
        course.title.toLowerCase().includes(query) || categoriesText.includes(query)
      );
    });
  }, [courses, courseQuery]);

  const filteredClients = useMemo(() => {
    const query = clientQuery.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) =>
      client.ragioneSociale.toLowerCase().includes(query)
    );
  }, [clients, clientQuery]);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    const parsedStart = parseDateOnly(startDate);
    const parsedEnd = parseDateOnly(endDate);
    const parsedDeadline = parseDateOnly(deadlineRegistry);

    if (!courseId) errors.courseId = "Seleziona un corso";
    if (!clientId) errors.clientId = "Seleziona un cliente";
    if (!startDate) errors.startDate = "Data inizio obbligatoria";
    if (!endDate) errors.endDate = "Data fine obbligatoria";

    if (parsedStart && parsedEnd && parsedEnd <= parsedStart) {
      errors.endDate = "La data di fine deve essere successiva alla data di inizio";
    }

    if (parsedStart && parsedDeadline && parsedDeadline >= parsedStart) {
      errors.deadlineRegistry =
        "La deadline anagrafiche deve essere precedente alla data di inizio";
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApiError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/corsi/${courseId}/edizioni`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          startDate,
          endDate,
          deadlineRegistry: deadlineRegistry || null,
          notes: notes.trim() || undefined,
          status: "DRAFT",
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const serverError = String(json?.error ?? "Errore nella creazione dell'edizione");
        if (serverError.toLowerCase().includes("fine")) {
          setFieldErrors((prev) => ({ ...prev, endDate: serverError }));
        } else if (serverError.toLowerCase().includes("deadline")) {
          setFieldErrors((prev) => ({ ...prev, deadlineRegistry: serverError }));
        } else if (serverError.toLowerCase().includes("client")) {
          setFieldErrors((prev) => ({ ...prev, clientId: serverError }));
        }
        setApiError(serverError);
        return;
      }

      toast.success("Edizione creata con successo");
      onClose();
      if (onCreated) {
        await onCreated();
      }
    } catch {
      setApiError("Errore nella creazione dell'edizione");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-xl border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Nuova Edizione</h2>
            <p className="text-sm text-muted-foreground">
              Crea una nuova edizione scegliendo corso, cliente e date.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
            aria-label="Chiudi modal"
            disabled={saving}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {apiError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          ) : null}

          {loadingOptions ? (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento corsi e clienti...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FormLabel required>Corso</FormLabel>
                  <input
                    type="text"
                    value={courseQuery}
                    onChange={(event) => setCourseQuery(event.target.value)}
                    placeholder="Cerca corso..."
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <select
                    value={courseId}
                    onChange={(event) => {
                      setCourseId(event.target.value);
                      if (fieldErrors.courseId) {
                        setFieldErrors((prev) => ({ ...prev, courseId: undefined }));
                      }
                    }}
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      fieldErrors.courseId ? "border-red-500" : ""
                    }`}
                  >
                    <option value="">Seleziona corso</option>
                    {filteredCourses.map((course) => {
                      const categoryLabel = course.categories.length
                        ? ` - ${course.categories.join(", ")}`
                        : "";
                      return (
                        <option key={course.id} value={course.id}>
                          {course.title}
                          {categoryLabel}
                        </option>
                      );
                    })}
                  </select>
                  <FormFieldError message={fieldErrors.courseId} />
                </div>

                <div className="space-y-2">
                  <FormLabel required>Cliente</FormLabel>
                  <input
                    type="text"
                    value={clientQuery}
                    onChange={(event) => setClientQuery(event.target.value)}
                    placeholder="Cerca cliente..."
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <select
                    value={clientId}
                    onChange={(event) => {
                      setClientId(event.target.value);
                      if (fieldErrors.clientId) {
                        setFieldErrors((prev) => ({ ...prev, clientId: undefined }));
                      }
                    }}
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      fieldErrors.clientId ? "border-red-500" : ""
                    }`}
                  >
                    <option value="">Seleziona cliente attivo</option>
                    {filteredClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.ragioneSociale}
                      </option>
                    ))}
                  </select>
                  <FormFieldError message={fieldErrors.clientId} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <FormLabel required>Data inizio</FormLabel>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      if (fieldErrors.startDate) {
                        setFieldErrors((prev) => ({ ...prev, startDate: undefined }));
                      }
                    }}
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      fieldErrors.startDate ? "border-red-500" : ""
                    }`}
                  />
                  <FormFieldError message={fieldErrors.startDate} />
                </div>
                <div className="space-y-2">
                  <FormLabel required>Data fine</FormLabel>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      if (fieldErrors.endDate) {
                        setFieldErrors((prev) => ({ ...prev, endDate: undefined }));
                      }
                    }}
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      fieldErrors.endDate ? "border-red-500" : ""
                    }`}
                  />
                  <FormFieldError message={fieldErrors.endDate} />
                </div>
                <div className="space-y-2">
                  <FormLabel>Deadline anagrafiche</FormLabel>
                  <input
                    type="date"
                    value={deadlineRegistry}
                    onChange={(event) => {
                      setDeadlineRegistry(event.target.value);
                      if (fieldErrors.deadlineRegistry) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          deadlineRegistry: undefined,
                        }));
                      }
                    }}
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                      fieldErrors.deadlineRegistry ? "border-red-500" : ""
                    }`}
                  />
                  <FormFieldError message={fieldErrors.deadlineRegistry} />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel>Note</FormLabel>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Note opzionali..."
                />
              </div>

              <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                Numero edizione calcolato automaticamente al salvataggio.
              </div>
            </>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex min-h-[44px] items-center justify-center rounded-md border px-4 py-2 text-sm"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving || loadingOptions}
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Creazione..." : "Crea Edizione"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
