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
  // New fields
  birthDate?: string | null;
  birthPlace?: string | null;
  birthProvince?: string | null;
  gender?: string | null;
  fiscalCode?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  fax?: string | null;
  mobile?: string | null;
  emailSecondary?: string | null;
  pec?: string | null;
  vatNumber?: string | null;
  iban?: string | null;
  vatExempt?: boolean;
  publicEmployee?: boolean | null;
  educationLevel?: string | null;
  profession?: string | null;
  employerName?: string | null;
  sdiCode?: string | null;
  registrationNumber?: string | null;
  status?: string;
  idDocumentPath?: string | null;
  idDocumentName?: string | null;
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
const EDUCATION_LEVELS = [
  "Licenza media",
  "Diploma di scuola superiore",
  "Laurea triennale",
  "Laurea magistrale",
  "Laurea vecchio ordinamento",
  "Master di I livello",
  "Master di II livello",
  "Dottorato di ricerca",
  "Altro",
];

const TABS = [
  { key: "personal", label: "Personali" },
  { key: "residence", label: "Residenza" },
  { key: "contacts", label: "Contatti" },
  { key: "professional", label: "Profess." },
  { key: "other", label: "Altro" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function validateEmail(value: string) {
  if (!value.trim()) return true;
  return EMAIL_REGEX.test(value.trim());
}

function dateToInput(v: string | null | undefined): string {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

// Styled input
const inputCls = "w-full rounded-md border bg-background px-3 py-2 text-sm";

export default function TeacherModal({
  open,
  onClose,
  onSaved,
  teacher,
  title,
}: TeacherModalProps) {
  // Tab
  const [tab, setTab] = useState<TabKey>("personal");

  // Core fields
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

  // New fields
  const [birthDate, setBirthDate] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthProvinceQuery, setBirthProvinceQuery] = useState("");
  const [birthProvinceValue, setBirthProvinceValue] = useState("");
  const [gender, setGender] = useState("");
  const [fiscalCode, setFiscalCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [fax, setFax] = useState("");
  const [mobile, setMobile] = useState("");
  const [emailSecondary, setEmailSecondary] = useState("");
  const [pec, setPec] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [iban, setIban] = useState("");
  const [vatExempt, setVatExempt] = useState(false);
  const [publicEmployee, setPublicEmployee] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [profession, setProfession] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [sdiCode, setSdiCode] = useState("0000000");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [adminStatus, setAdminStatus] = useState("");

  const { province: provinceOptions, regioni, filterRegioni } = useProvinceRegioni();
  const isEdit = Boolean(teacher?.id);

  // --- Init ---
  useEffect(() => {
    if (!open) return;
    setTab("personal");
    setFirstName(teacher?.firstName ?? "");
    setLastName(teacher?.lastName ?? "");
    setEmail(teacher?.email ?? "");
    setPhone(teacher?.phone ?? "");

    // Province
    const rawProvince = teacher?.province?.trim() ?? "";
    const pm = rawProvince
      ? provinceOptions.find(
          (p) =>
            p.sigla.toUpperCase() === rawProvince.toUpperCase() ||
            normalizeText(p.nome) === normalizeText(rawProvince)
        )
      : undefined;
    setProvinceValue(pm ? pm.sigla.toUpperCase() : rawProvince.toUpperCase());
    setProvinceQuery(pm ? `${pm.sigla.toUpperCase()} - ${pm.nome}` : rawProvince.toUpperCase());
    setRegionValue((teacher?.region?.trim() ?? pm?.regione ?? "").trim());
    setRegionQuery((teacher?.region?.trim() ?? pm?.regione ?? "").trim());

    // Birth province
    const rawBP = (teacher as any)?.birthProvince?.trim() ?? "";
    const bpm = rawBP
      ? provinceOptions.find(
          (p) =>
            p.sigla.toUpperCase() === rawBP.toUpperCase() ||
            normalizeText(p.nome) === normalizeText(rawBP)
        )
      : undefined;
    setBirthProvinceValue(bpm ? bpm.sigla.toUpperCase() : rawBP.toUpperCase());
    setBirthProvinceQuery(bpm ? `${bpm.sigla.toUpperCase()} - ${bpm.nome}` : rawBP.toUpperCase());

    setSpecialization(teacher?.specialization ?? "");
    setSelectedCategoryIds((teacher?.categories ?? []).map((c) => c.id));
    setCategorySearch("");
    setBio(teacher?.bio ?? "");
    setNotes(teacher?.notes ?? "");
    setActive(teacher?.active ?? true);
    setCvFile(null);
    setErrors({});

    // New fields
    setBirthDate(dateToInput((teacher as any)?.birthDate));
    setBirthPlace((teacher as any)?.birthPlace ?? "");
    setGender((teacher as any)?.gender ?? "");
    setFiscalCode((teacher as any)?.fiscalCode ?? "");
    setAddress((teacher as any)?.address ?? "");
    setCity((teacher as any)?.city ?? "");
    setPostalCode((teacher as any)?.postalCode ?? "");
    setFax((teacher as any)?.fax ?? "");
    setMobile((teacher as any)?.mobile ?? "");
    setEmailSecondary((teacher as any)?.emailSecondary ?? "");
    setPec((teacher as any)?.pec ?? "");
    setVatNumber((teacher as any)?.vatNumber ?? "");
    setIban((teacher as any)?.iban ?? "");
    setVatExempt((teacher as any)?.vatExempt ?? false);
    setPublicEmployee(
      (teacher as any)?.publicEmployee === true
        ? "true"
        : (teacher as any)?.publicEmployee === false
          ? "false"
          : ""
    );
    setEducationLevel((teacher as any)?.educationLevel ?? "");
    setProfession((teacher as any)?.profession ?? "");
    setEmployerName((teacher as any)?.employerName ?? "");
    setSdiCode((teacher as any)?.sdiCode ?? "0000000");
    setRegistrationNumber((teacher as any)?.registrationNumber ?? "");
    const s = (teacher as any)?.status;
    setAdminStatus(
      s === "ACTIVE" || s === "INACTIVE" || s === "SUSPENDED" ? s : ""
    );
  }, [open, teacher, provinceOptions]);

  // --- Categories load ---
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/categorie");
        if (!res.ok) { if (!cancelled) setCategories([]); return; }
        const json = await res.json().catch(() => ({}));
        const rows = Array.isArray(json?.data) ? (json.data as CategoryOption[]) : [];
        if (!cancelled) {
          setCategories(
            rows
              .map((r) => ({ id: r.id, name: r.name, color: r.color ?? null }))
              .sort((a, b) => a.name.localeCompare(b.name, "it"))
          );
        }
      } catch { if (!cancelled) setCategories([]); }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // --- Province/region helpers ---
  const provincePool = useMemo(() => {
    if (!regionValue) return provinceOptions;
    return provinceOptions.filter(
      (p) => normalizeText(p.regione) === normalizeText(regionValue)
    );
  }, [provinceOptions, regionValue]);

  const filteredProvinceOptions = useMemo(() => {
    const q = normalizeText(provinceQuery);
    if (!q) return provincePool.slice(0, 40);
    return provincePool
      .filter((p) => p.sigla.toLowerCase().startsWith(q) || normalizeText(p.nome).includes(q))
      .slice(0, 40);
  }, [provincePool, provinceQuery]);

  const filteredBirthProvinceOptions = useMemo(() => {
    const q = normalizeText(birthProvinceQuery);
    if (!q) return provinceOptions.slice(0, 40);
    return provinceOptions
      .filter((p) => p.sigla.toLowerCase().startsWith(q) || normalizeText(p.nome).includes(q))
      .slice(0, 40);
  }, [provinceOptions, birthProvinceQuery]);

  const filteredRegionOptions = useMemo(
    () => filterRegioni(regionQuery).slice(0, 20),
    [filterRegioni, regionQuery]
  );

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const handleProvinceInputChange = (value: string) => {
    setProvinceQuery(value);
    const n = normalizeText(value);
    if (!n) { setProvinceValue(""); return; }
    const m = provincePool.find((p) => {
      const label = normalizeText(`${p.sigla} - ${p.nome}`);
      return label === n || p.sigla.toLowerCase() === n || normalizeText(p.nome) === n;
    });
    if (!m) { setProvinceValue(""); return; }
    setProvinceValue(m.sigla.toUpperCase());
    setProvinceQuery(`${m.sigla.toUpperCase()} - ${m.nome}`);
    setRegionValue(m.regione);
    setRegionQuery(m.regione);
  };

  const handleBirthProvinceInputChange = (value: string) => {
    setBirthProvinceQuery(value);
    const n = normalizeText(value);
    if (!n) { setBirthProvinceValue(""); return; }
    const m = provinceOptions.find((p) => {
      const label = normalizeText(`${p.sigla} - ${p.nome}`);
      return label === n || p.sigla.toLowerCase() === n || normalizeText(p.nome) === n;
    });
    if (!m) { setBirthProvinceValue(""); return; }
    setBirthProvinceValue(m.sigla.toUpperCase());
    setBirthProvinceQuery(`${m.sigla.toUpperCase()} - ${m.nome}`);
  };

  const handleRegionInputChange = (value: string) => {
    setRegionQuery(value);
    const n = normalizeText(value);
    if (!n) { setRegionValue(""); return; }
    const m = regioni.find((r) => normalizeText(r) === n);
    if (!m) { setRegionValue(""); return; }
    setRegionValue(m);
    setRegionQuery(m);
    if (provinceValue) {
      const cur = provinceOptions.find((p) => p.sigla.toUpperCase() === provinceValue.toUpperCase());
      if (cur && normalizeText(cur.regione) !== normalizeText(m)) {
        setProvinceValue("");
        setProvinceQuery("");
      }
    }
  };

  // --- Submit ---
  const modalTitle = useMemo(() => {
    if (title) return title;
    return isEdit ? "Modifica docente" : "Nuovo docente";
  }, [isEdit, title]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs: FieldErrors = {};
    if (!firstName.trim()) errs.firstName = "Nome obbligatorio";
    if (!lastName.trim()) errs.lastName = "Cognome obbligatorio";
    if (!validateEmail(email)) errs.email = "Email non valida";
    setErrors(errs);
    if (Object.keys(errs).length > 0) { setTab("personal"); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
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
        // New fields
        birthDate: birthDate || "",
        birthPlace: birthPlace.trim(),
        birthProvince: birthProvinceValue.trim(),
        gender: gender || null,
        fiscalCode: fiscalCode.trim().toUpperCase(),
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        fax: fax.trim(),
        mobile: mobile.trim(),
        emailSecondary: emailSecondary.trim(),
        pec: pec.trim(),
        vatNumber: vatNumber.trim(),
        iban: iban.trim(),
        vatExempt,
        publicEmployee:
          publicEmployee === "true" ? true : publicEmployee === "false" ? false : null,
        educationLevel: educationLevel.trim(),
        profession: profession.trim(),
        employerName: employerName.trim(),
        sdiCode: sdiCode.trim(),
        registrationNumber: registrationNumber.trim(),
      };
      if (adminStatus) payload.status = adminStatus;

      const endpoint = isEdit
        ? `/api/admin/teachers/${teacher?.id}`
        : "/api/admin/teachers";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Errore salvataggio docente"); return; }

      const saved = json.data as TeacherFormValue;

      if (cvFile) {
        const fd = new FormData();
        fd.append("cv", cvFile);
        const uploadRes = await fetch(`/api/admin/teachers/${saved.id}/cv`, {
          method: "POST",
          body: fd,
        });
        if (!uploadRes.ok) {
          const uj = await uploadRes.json().catch(() => ({}));
          toast.error(uj.error ?? "Docente salvato ma upload CV non riuscito");
        }
      }

      toast.success(isEdit ? "Docente aggiornato" : "Docente creato");
      onSaved?.(saved);
      onClose();
    } catch (err) {
      console.error("[TEACHER_MODAL_SUBMIT] Error:", err);
      toast.error("Errore salvataggio docente");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="modal-panel border bg-white shadow-xl sm:max-w-2xl">
        <div className="modal-header flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{modalTitle}</h2>
            <p className="text-sm text-muted-foreground">
              Compila i dati del docente.
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

        {/* Tabs */}
        <div className="border-b px-4 overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex h-full flex-1 flex-col overflow-hidden">
          <div className="modal-body modal-scroll space-y-4">
            {/* ==== PERSONAL ==== */}
            {tab === "personal" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel required>Cognome</FormLabel>
                    <input className={`${inputCls} ${errors.lastName ? "border-red-500" : ""}`} value={lastName} onChange={(e) => { setLastName(e.target.value); if (errors.lastName) setErrors((p) => ({ ...p, lastName: undefined })); }} />
                    <FormFieldError message={errors.lastName} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel required>Nome</FormLabel>
                    <input className={`${inputCls} ${errors.firstName ? "border-red-500" : ""}`} value={firstName} onChange={(e) => { setFirstName(e.target.value); if (errors.firstName) setErrors((p) => ({ ...p, firstName: undefined })); }} />
                    <FormFieldError message={errors.firstName} />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Data di nascita</FormLabel>
                    <input type="date" className={inputCls} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Genere</FormLabel>
                    <select className={inputCls} value={gender} onChange={(e) => setGender(e.target.value)}>
                      <option value="">—</option>
                      <option value="M">Uomo</option>
                      <option value="F">Donna</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Comune di nascita</FormLabel>
                    <input className={inputCls} value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Provincia di nascita</FormLabel>
                    <input list="modal-bp-opts" className={inputCls} value={birthProvinceQuery} onChange={(e) => handleBirthProvinceInputChange(e.target.value)} placeholder="es. CT" />
                    <datalist id="modal-bp-opts">
                      {filteredBirthProvinceOptions.map((p) => (
                        <option key={`mbp-${p.sigla}`} value={`${p.sigla.toUpperCase()} - ${p.nome}`} />
                      ))}
                    </datalist>
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Codice Fiscale</FormLabel>
                    <input className={inputCls + " uppercase"} value={fiscalCode} onChange={(e) => setFiscalCode(e.target.value.toUpperCase())} maxLength={16} placeholder="RSSMRA85M01H501Z" />
                  </label>
                  <div />
                </div>
              </>
            )}

            {/* ==== RESIDENCE ==== */}
            {tab === "residence" && (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <FormLabel>Indirizzo</FormLabel>
                  <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Comune</FormLabel>
                    <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Provincia</FormLabel>
                    <input list="modal-prov-opts" className={inputCls} value={provinceQuery} onChange={(e) => handleProvinceInputChange(e.target.value)} placeholder="Es. CT - Catania" />
                    <datalist id="modal-prov-opts">
                      {filteredProvinceOptions.map((p) => (
                        <option key={`mp-${p.sigla}`} value={`${p.sigla.toUpperCase()} - ${p.nome}`} />
                      ))}
                    </datalist>
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>CAP</FormLabel>
                    <input className={inputCls} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} maxLength={5} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Regione</FormLabel>
                    <input list="modal-reg-opts" className={inputCls} value={regionQuery} onChange={(e) => handleRegionInputChange(e.target.value)} placeholder="Es. Sicilia" />
                    <datalist id="modal-reg-opts">
                      {filteredRegionOptions.map((r) => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  </label>
                </div>
              </>
            )}

            {/* ==== CONTACTS ==== */}
            {tab === "contacts" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Email</FormLabel>
                    <input type="email" className={`${inputCls} ${errors.email ? "border-red-500" : ""}`} value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }} />
                    <FormFieldError message={errors.email} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Email secondaria</FormLabel>
                    <input type="email" className={inputCls} value={emailSecondary} onChange={(e) => setEmailSecondary(e.target.value)} />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Telefono</FormLabel>
                    <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Cellulare</FormLabel>
                    <input className={inputCls} value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+39 ..." />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Fax</FormLabel>
                    <input className={inputCls} value={fax} onChange={(e) => setFax(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>PEC</FormLabel>
                    <input type="email" className={inputCls} value={pec} onChange={(e) => setPec(e.target.value)} />
                  </label>
                </div>
              </>
            )}

            {/* ==== PROFESSIONAL ==== */}
            {tab === "professional" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Specializzazione</FormLabel>
                    <input className={inputCls} value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Professione / Mansione</FormLabel>
                    <input className={inputCls} value={profession} onChange={(e) => setProfession(e.target.value)} />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Titolo di studio</FormLabel>
                    <select className={inputCls} value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}>
                      <option value="">—</option>
                      {EDUCATION_LEVELS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Datore di lavoro</FormLabel>
                    <input className={inputCls} value={employerName} onChange={(e) => setEmployerName(e.target.value)} />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Partita IVA</FormLabel>
                    <input className={inputCls} value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} maxLength={11} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>IBAN</FormLabel>
                    <input className={inputCls} value={iban} onChange={(e) => setIban(e.target.value)} maxLength={34} />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Codice Destinatario</FormLabel>
                    <input className={inputCls} value={sdiCode} onChange={(e) => setSdiCode(e.target.value)} maxLength={7} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Matricola</FormLabel>
                    <input className={inputCls} value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm mt-1">
                    <input type="checkbox" checked={vatExempt} onChange={(e) => setVatExempt(e.target.checked)} />
                    Esente IVA
                  </label>
                  <div>
                    <FormLabel>Dipendente pubblico</FormLabel>
                    <div className="flex gap-4 items-center mt-1">
                      <label className="flex items-center gap-1.5 text-sm">
                        <input type="radio" name="pubEmp" checked={publicEmployee === "true"} onChange={() => setPublicEmployee("true")} /> Si
                      </label>
                      <label className="flex items-center gap-1.5 text-sm">
                        <input type="radio" name="pubEmp" checked={publicEmployee === "false"} onChange={() => setPublicEmployee("false")} /> No
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ==== OTHER ==== */}
            {tab === "other" && (
              <>
                {/* Categories */}
                <div className="space-y-2 text-sm">
                  <FormLabel>Aree</FormLabel>
                  {selectedCategoryIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedCategoryIds.map((cid) => {
                        const c = categories.find((x) => x.id === cid);
                        if (!c) return null;
                        return (
                          <span key={c.id} className="rounded-full px-2 py-0.5 text-xs text-white" style={{ backgroundColor: c.color ?? "#6B7280" }}>
                            {c.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input ref={categorySearchInputRef} value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} placeholder="Cerca area..." className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm" />
                  </div>
                  <div className="max-h-32 space-y-1 overflow-auto rounded-md border bg-background p-2">
                    {categories.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nessuna area disponibile.</p>
                    ) : filteredCategories.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nessuna area trovata.</p>
                    ) : (
                      filteredCategories.map((c) => {
                        const checked = selectedCategoryIds.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center justify-between gap-2 rounded px-1 py-1 text-xs hover:bg-muted/40">
                            <span className="inline-flex items-center gap-2">
                              <input type="checkbox" checked={checked} onChange={(e) => setSelectedCategoryIds((prev) => e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id))} />
                              {c.name}
                            </span>
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color ?? "#6B7280" }} />
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <label className="flex flex-col gap-1 text-sm">
                  <FormLabel>Bio</FormLabel>
                  <textarea rows={3} className={inputCls} value={bio} onChange={(e) => setBio(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <FormLabel>Note</FormLabel>
                  <textarea rows={3} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <FormLabel>CV (PDF, DOC, DOCX)</FormLabel>
                  <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCvFile(e.target.files?.[0] ?? null)} className={inputCls} />
                  {teacher?.cvOriginalName && (
                    <p className="text-xs text-muted-foreground">CV attuale: {teacher.cvOriginalName}</p>
                  )}
                </label>
                {isEdit && (
                  <label className="flex flex-col gap-1 text-sm">
                    <FormLabel>Stato</FormLabel>
                    <select className={inputCls} value={adminStatus} onChange={(e) => setAdminStatus(e.target.value)}>
                      <option value="">— Non modificare —</option>
                      <option value="ACTIVE">Attivo</option>
                      <option value="INACTIVE">Non attivo</option>
                      <option value="SUSPENDED">Sospeso</option>
                    </select>
                  </label>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                  Docente attivo (legacy)
                </label>
              </>
            )}
          </div>

          <div className="modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="inline-flex min-h-[44px] items-center justify-center rounded-md border px-4 py-2 text-sm">
              Annulla
            </button>
            <button type="submit" disabled={saving} className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</>
              ) : isEdit ? "Salva modifiche" : "Crea docente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
