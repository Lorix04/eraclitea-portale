"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { useProvinceRegioni } from "@/hooks/useProvinceRegioni";

export type TeacherFormValue = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  province: string | null;
  region: string | null;
  specialization: string | null;
  categories?: { id: string; name: string; color?: string | null }[];
  bio: string | null;
  notes: string | null;
  active: boolean;
  cvPath?: string | null;
  cvOriginalName?: string | null;
};

type CategoryOption = {
  id: string;
  name: string;
  color?: string | null;
};

type TeacherModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: (teacher: TeacherFormValue) => void;
  teacher?: TeacherFormValue | null;
  title?: string;
};

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string) {
  if (!value.trim()) return true;
  return EMAIL_REGEX.test(value.trim());
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function TeacherModal({
  open,
  onClose,
  onSaved,
  teacher,
  title,
}: TeacherModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [provinceValue, setProvinceValue] = useState("");
  const [regionValue, setRegionValue] = useState("");
  const [provinceQuery, setProvinceQuery] = useState("");
  const [regionQuery, setRegionQuery] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [bio, setBio] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const categorySearchInputRef = useRef<HTMLInputElement>(null);
  const { province: provinceOptions, regioni, filterRegioni } = useProvinceRegioni();

  const isEdit = Boolean(teacher?.id);

  useEffect(() => {
    if (!open) return;
    setFirstName(teacher?.firstName ?? "");
    setLastName(teacher?.lastName ?? "");
    setEmail(teacher?.email ?? "");
    setPhone(teacher?.phone ?? "");
    const rawProvince = teacher?.province?.trim() ?? "";
    const provinceMatch = rawProvince
      ? provinceOptions.find(
          (item) =>
            item.sigla.toUpperCase() === rawProvince.toUpperCase() ||
            normalizeText(item.nome) === normalizeText(rawProvince)
        )
      : undefined;
    const normalizedProvince = provinceMatch
      ? provinceMatch.sigla.toUpperCase()
      : rawProvince.toUpperCase();
    const normalizedRegion = (
      teacher?.region?.trim() ??
      provinceMatch?.regione ??
      ""
    ).trim();

    setProvinceValue(normalizedProvince);
    setProvinceQuery(
      provinceMatch
        ? `${provinceMatch.sigla.toUpperCase()} - ${provinceMatch.nome}`
        : normalizedProvince
    );
    setRegionValue(normalizedRegion);
    setRegionQuery(normalizedRegion);
    setSpecialization(teacher?.specialization ?? "");
    setSelectedCategoryIds((teacher?.categories ?? []).map((category) => category.id));
    setCategorySearch("");
    setBio(teacher?.bio ?? "");
    setNotes(teacher?.notes ?? "");
    setActive(teacher?.active ?? true);
    setCvFile(null);
    setErrors({});
  }, [open, teacher, provinceOptions]);

  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(() => {
      categorySearchInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const response = await fetch("/api/admin/categorie");
        if (!response.ok) {
          if (!cancelled) setCategories([]);
          return;
        }
        const json = await response.json().catch(() => ({}));
        const rows = Array.isArray(json?.data) ? (json.data as CategoryOption[]) : [];
        if (!cancelled) {
          setCategories(
            rows
              .map((row) => ({
                id: row.id,
                name: row.name,
                color: row.color ?? null,
              }))
              .sort((a, b) => a.name.localeCompare(b.name, "it"))
          );
        }
      } catch {
        if (!cancelled) setCategories([]);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const modalTitle = useMemo(() => {
    if (title) return title;
    return isEdit ? "Modifica docente" : "Nuovo docente";
  }, [isEdit, title]);

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((category) =>
      category.name.toLowerCase().includes(query)
    );
  }, [categories, categorySearch]);

  const provincePool = useMemo(() => {
    if (!regionValue) return provinceOptions;
    return provinceOptions.filter(
      (province) => normalizeText(province.regione) === normalizeText(regionValue)
    );
  }, [provinceOptions, regionValue]);

  const filteredProvinceOptions = useMemo(() => {
    const query = normalizeText(provinceQuery);
    if (!query) return provincePool.slice(0, 40);
    return provincePool
      .filter((province) => {
        const siglaMatch = province.sigla.toLowerCase().startsWith(query);
        const nameMatch = normalizeText(province.nome).includes(query);
        return siglaMatch || nameMatch;
      })
      .slice(0, 40);
  }, [provincePool, provinceQuery]);

  const filteredRegionOptions = useMemo(
    () => filterRegioni(regionQuery).slice(0, 20),
    [filterRegioni, regionQuery]
  );

  const handleProvinceInputChange = (value: string) => {
    setProvinceQuery(value);
    const normalized = normalizeText(value);
    if (!normalized) {
      setProvinceValue("");
      return;
    }

    const provinceMatch = provincePool.find((province) => {
      const label = normalizeText(`${province.sigla} - ${province.nome}`);
      return (
        label === normalized ||
        province.sigla.toLowerCase() === normalized ||
        normalizeText(province.nome) === normalized
      );
    });

    if (!provinceMatch) {
      setProvinceValue("");
      return;
    }

    setProvinceValue(provinceMatch.sigla.toUpperCase());
    setProvinceQuery(`${provinceMatch.sigla.toUpperCase()} - ${provinceMatch.nome}`);
    setRegionValue(provinceMatch.regione);
    setRegionQuery(provinceMatch.regione);
  };

  const handleRegionInputChange = (value: string) => {
    setRegionQuery(value);
    const normalized = normalizeText(value);
    if (!normalized) {
      setRegionValue("");
      return;
    }

    const regionMatch = regioni.find(
      (region) => normalizeText(region) === normalized
    );
    if (!regionMatch) {
      setRegionValue("");
      return;
    }

    setRegionValue(regionMatch);
    setRegionQuery(regionMatch);

    if (provinceValue) {
      const currentProvince = provinceOptions.find(
        (province) => province.sigla.toUpperCase() === provinceValue.toUpperCase()
      );
      if (
        currentProvince &&
        normalizeText(currentProvince.regione) !== normalizeText(regionMatch)
      ) {
        setProvinceValue("");
        setProvinceQuery("");
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!firstName.trim()) {
      nextErrors.firstName = "Nome obbligatorio";
    }
    if (!lastName.trim()) {
      nextErrors.lastName = "Cognome obbligatorio";
    }
    if (!validateEmail(email)) {
      nextErrors.email = "Email non valida";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        province: provinceValue.trim(),
        region: regionValue.trim(),
        specialization: specialization.trim(),
        categoryIds: selectedCategoryIds,
        bio: bio.trim(),
        notes: notes.trim(),
        active,
      };

      const endpoint = isEdit
        ? `/api/admin/teachers/${teacher?.id}`
        : "/api/admin/teachers";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(json.error ?? "Errore salvataggio docente");
        return;
      }

      const savedTeacher = json.data as TeacherFormValue;

      if (cvFile) {
        const form = new FormData();
        form.append("cv", cvFile);
        const uploadRes = await fetch(`/api/admin/teachers/${savedTeacher.id}/cv`, {
          method: "POST",
          body: form,
        });
        if (!uploadRes.ok) {
          const uploadJson = await uploadRes.json().catch(() => ({}));
          toast.error(uploadJson.error ?? "Docente salvato ma upload CV non riuscito");
        }
      }

      toast.success(isEdit ? "Docente aggiornato" : "Docente creato");
      onSaved?.(savedTeacher);
      onClose();
    } catch (error) {
      console.error("[TEACHER_MODAL_SUBMIT] Error:", error);
      toast.error("Errore salvataggio docente");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{modalTitle}</h2>
            <p className="text-sm text-muted-foreground">
              Compila i dati anagrafici del docente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
            disabled={saving}
            aria-label="Chiudi modale docente"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <FormLabel required>Nome</FormLabel>
              <input
                className={`rounded-md border bg-background px-3 py-2 ${
                  errors.firstName ? "border-red-500" : ""
                }`}
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value);
                  if (errors.firstName) {
                    setErrors((prev) => ({ ...prev, firstName: undefined }));
                  }
                }}
              />
              <FormFieldError message={errors.firstName} />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <FormLabel required>Cognome</FormLabel>
              <input
                className={`rounded-md border bg-background px-3 py-2 ${
                  errors.lastName ? "border-red-500" : ""
                }`}
                value={lastName}
                onChange={(event) => {
                  setLastName(event.target.value);
                  if (errors.lastName) {
                    setErrors((prev) => ({ ...prev, lastName: undefined }));
                  }
                }}
              />
              <FormFieldError message={errors.lastName} />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <FormLabel>Email</FormLabel>
              <input
                type="email"
                className={`rounded-md border bg-background px-3 py-2 ${
                  errors.email ? "border-red-500" : ""
                }`}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
              />
              <FormFieldError message={errors.email} />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <FormLabel>Telefono</FormLabel>
              <input
                className="rounded-md border bg-background px-3 py-2"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <FormLabel>Provincia</FormLabel>
              <input
                list="teacher-province-options"
                className="rounded-md border bg-background px-3 py-2"
                value={provinceQuery}
                onChange={(event) => handleProvinceInputChange(event.target.value)}
                placeholder="Es. CT - Catania"
              />
              <datalist id="teacher-province-options">
                {filteredProvinceOptions.map((province) => (
                  <option
                    key={`${province.sigla}-${province.nome}`}
                    value={`${province.sigla.toUpperCase()} - ${province.nome}`}
                  />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <FormLabel>Regione</FormLabel>
              <input
                list="teacher-region-options"
                className="rounded-md border bg-background px-3 py-2"
                value={regionQuery}
                onChange={(event) => handleRegionInputChange(event.target.value)}
                placeholder="Es. Sicilia"
              />
              <datalist id="teacher-region-options">
                {filteredRegionOptions.map((region) => (
                  <option key={region} value={region} />
                ))}
              </datalist>
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm">
            <FormLabel>Specializzazione</FormLabel>
            <input
              className="rounded-md border bg-background px-3 py-2"
              value={specialization}
              onChange={(event) => setSpecialization(event.target.value)}
            />
          </label>

          <div className="space-y-2 text-sm">
            <FormLabel>Aree</FormLabel>
            {selectedCategoryIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedCategoryIds.map((categoryId) => {
                  const category = categories.find((item) => item.id === categoryId);
                  if (!category) return null;
                  return (
                    <span
                      key={category.id}
                      className="rounded-full px-2 py-0.5 text-xs text-white"
                      style={{ backgroundColor: category.color ?? "#6B7280" }}
                    >
                      {category.name}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nessuna area selezionata.</p>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={categorySearchInputRef}
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Cerca area..."
                className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <div className="max-h-32 space-y-1 overflow-auto rounded-md border bg-background p-2">
              {categories.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nessuna area disponibile.
                </p>
              ) : filteredCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nessuna area trovata.
                </p>
              ) : (
                filteredCategories.map((category) => {
                  const checked = selectedCategoryIds.includes(category.id);
                  return (
                    <label
                      key={category.id}
                      className="flex items-center justify-between gap-2 rounded px-1 py-1 text-xs hover:bg-muted/40"
                    >
                      <span className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const isChecked = event.target.checked;
                            setSelectedCategoryIds((prev) =>
                              isChecked
                                ? [...prev, category.id]
                                : prev.filter((id) => id !== category.id)
                            );
                          }}
                        />
                        {category.name}
                      </span>
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color ?? "#6B7280" }}
                      />
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <label className="flex flex-col gap-2 text-sm">
            <FormLabel>Bio</FormLabel>
            <textarea
              rows={3}
              className="rounded-md border bg-background px-3 py-2"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <FormLabel>Note</FormLabel>
            <textarea
              rows={3}
              className="rounded-md border bg-background px-3 py-2"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <FormLabel>CV (PDF, DOC, DOCX)</FormLabel>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setCvFile(file ?? null);
              }}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            {teacher?.cvOriginalName ? (
              <p className="text-xs text-muted-foreground">
                CV attuale: {teacher.cvOriginalName}
              </p>
            ) : null}
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
            Docente attivo
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
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
              disabled={saving}
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : isEdit ? (
                "Salva modifiche"
              ) : (
                "Crea docente"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
