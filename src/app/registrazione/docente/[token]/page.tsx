"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useProvinceRegioni } from "@/hooks/useProvinceRegioni";
import DocumentSigningForm from "@/components/teacher/DocumentSigningForm";
import TeacherCvEditor from "@/components/teacher/cv/TeacherCvEditor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TeacherInfo = {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
};

type Step1Data = {
  lastName: string;
  firstName: string;
  birthDate: string;
  birthPlace: string;
  birthProvince: string;
  gender: string;
  fiscalCode: string;
  address: string;
  city: string;
  postalCode: string;
  province: string;
  region: string;
  phone: string;
  mobile: string;
  fax: string;
  emailSecondary: string;
  pec: string;
  vatNumber: string;
  iban: string;
  vatExempt: boolean;
  publicEmployee: string;
  educationLevel: string;
  profession: string;
  employerName: string;
  sdiCode: string;
  registrationNumber: string;
};

const EMPTY_STEP1: Step1Data = {
  lastName: "",
  firstName: "",
  birthDate: "",
  birthPlace: "",
  birthProvince: "",
  gender: "",
  fiscalCode: "",
  address: "",
  city: "",
  postalCode: "",
  province: "",
  region: "",
  phone: "",
  mobile: "",
  fax: "",
  emailSecondary: "",
  pec: "",
  vatNumber: "",
  iban: "",
  vatExempt: false,
  publicEmployee: "",
  educationLevel: "",
  profession: "",
  employerName: "",
  sdiCode: "0000000",
  registrationNumber: "",
};

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

const STEP_LABELS = ["Dati personali", "Competenze", "Documento", "Password"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-500">{error}</p>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="col-span-full mb-1 mt-4 text-sm font-semibold text-gray-600 uppercase tracking-wide first:mt-0">
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === step;
        const isDone = stepNum < step;
        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-8 sm:w-12 lg:w-20 h-0.5 ${
                  isDone ? "bg-[#EAB308]" : "bg-gray-200"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isDone
                    ? "bg-[#EAB308] text-white"
                    : isActive
                      ? "bg-[#EAB308] text-white ring-4 ring-[#EAB308]/20"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={`text-[10px] sm:text-xs whitespace-nowrap ${
                  isActive ? "text-[#EAB308] font-semibold" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// File upload component
// ---------------------------------------------------------------------------

function FileUploadField({
  label,
  accept,
  hint,
  fileName,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string;
  accept: string;
  hint: string;
  fileName: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="col-span-full">
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {fileName ? (
        <div className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2.5 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="truncate flex-1">{fileName}</span>
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500 transition-colors hover:border-[#EAB308] hover:text-[#EAB308]"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Caricamento..." : "Scegli file"}
        </button>
      )}
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TeacherRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  // Global state
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
  const [step, setStep] = useState(1);
  const [cvValid, setCvValid] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [finalStatus, setFinalStatus] = useState<string | null>(null);
  const [autoLogging, setAutoLogging] = useState(false);

  // Step 1 state
  const [form, setForm] = useState<Step1Data>(EMPTY_STEP1);
  const [errors, setErrors] = useState<Partial<Record<keyof Step1Data, string>>>({});
  const [saving, setSaving] = useState(false);

  // File uploads
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [idDocFileName, setIdDocFileName] = useState<string | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [uploadingIdDoc, setUploadingIdDoc] = useState(false);

  // Step 3 state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  // Province/region
  const { province, regioni, getRegioneByProvincia, filterProvince } =
    useProvinceRegioni();

  const filteredBirthProvinceOptions = useMemo(
    () => filterProvince(form.birthProvince),
    [form.birthProvince, filterProvince]
  );

  const filteredProvinceOptions = useMemo(
    () => filterProvince(form.province),
    [form.province, filterProvince]
  );

  // ------- Token validation -------
  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch("/api/teacher/validate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.valid) {
          setTeacherInfo({
            teacherId: data.teacherId,
            teacherName: data.teacherName,
            teacherEmail: data.teacherEmail,
          });
          // Pre-fill name from teacher
          const [firstName = "", ...lastParts] = (
            data.teacherName as string
          ).split(" ");
          const lastName = lastParts.join(" ");
          setForm((prev) => ({
            ...prev,
            firstName: prev.firstName || firstName,
            lastName: prev.lastName || lastName,
          }));
        } else {
          setTokenError(data.reason || "Link non valido");
        }
      } catch {
        setTokenError("Errore di connessione. Riprova piu tardi.");
      } finally {
        setValidating(false);
      }
    }
    validate();
  }, [token]);

  // ------- Form change -------
  const updateField = useCallback(
    <K extends keyof Step1Data>(key: K, value: Step1Data[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  // Auto-region from province
  useEffect(() => {
    if (form.province) {
      const sigla = form.province.split(" - ")[0]?.trim();
      if (sigla) {
        const region = getRegioneByProvincia(sigla);
        if (region) setForm((prev) => ({ ...prev, region }));
      }
    }
  }, [form.province, getRegioneByProvincia]);

  // ------- File upload handler -------
  const handleUpload = useCallback(
    async (file: File, type: "cv" | "idDocument") => {
      const setUploading = type === "cv" ? setUploadingCv : setUploadingIdDoc;
      const setFileName = type === "cv" ? setCvFileName : setIdDocFileName;
      setUploading(true);
      setStepError(null);

      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("token", token);
        fd.append("type", type);

        const res = await fetch("/api/teacher/register/upload", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setFileName(data.fileName);
        } else {
          setStepError(data.error || "Errore nel caricamento");
        }
      } catch {
        setStepError("Errore di connessione durante il caricamento");
      } finally {
        setUploading(false);
      }
    },
    [token]
  );

  // ------- Step 1 validation + submit -------
  const validateStep1 = useCallback((): boolean => {
    const errs: Partial<Record<keyof Step1Data, string>> = {};

    if (!form.lastName.trim()) errs.lastName = "Cognome obbligatorio";
    if (!form.firstName.trim()) errs.firstName = "Nome obbligatorio";
    if (!form.birthDate) errs.birthDate = "Data di nascita obbligatoria";
    if (!form.birthPlace.trim())
      errs.birthPlace = "Comune di nascita obbligatorio";
    if (!form.fiscalCode.trim()) {
      errs.fiscalCode = "Codice fiscale obbligatorio";
    } else if (!/^[A-Z0-9]{16}$/i.test(form.fiscalCode.trim())) {
      errs.fiscalCode = "Codice fiscale non valido (16 caratteri alfanumerici)";
    }
    if (!form.address.trim()) errs.address = "Indirizzo obbligatorio";
    if (!form.city.trim()) errs.city = "Comune obbligatorio";
    if (!form.postalCode.trim()) errs.postalCode = "CAP obbligatorio";
    if (!form.province.trim()) errs.province = "Provincia obbligatoria";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const submitStep1 = useCallback(async () => {
    if (!validateStep1()) return;
    setSaving(true);
    setStepError(null);

    try {
      const res = await fetch("/api/teacher/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          data: {
            ...form,
            // Extract sigla from display values like "BG - Bergamo"
            birthProvince: form.birthProvince.split(" - ")[0]?.trim() || form.birthProvince,
            province: form.province.split(" - ")[0]?.trim() || form.province,
            // Convert radio string to boolean|null
            publicEmployee:
              form.publicEmployee === "true"
                ? true
                : form.publicEmployee === "false"
                  ? false
                  : null,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep(2);
      } else {
        setStepError(data.error || "Errore nel salvataggio");
      }
    } catch {
      setStepError("Errore di connessione");
    } finally {
      setSaving(false);
    }
  }, [token, form, validateStep1]);

  // ------- Step 3: password checks -------
  const passwordChecks = useMemo(
    () => ({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      match: password.length > 0 && password === confirmPassword,
    }),
    [password, confirmPassword]
  );

  const allPasswordValid =
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.number &&
    passwordChecks.special &&
    passwordChecks.match;

  const submitComplete = useCallback(async () => {
    if (!allPasswordValid) return;
    setCompleting(true);
    setStepError(null);

    try {
      const res = await fetch("/api/teacher/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFinalStatus(data.status ?? "ONBOARDING");
        setCompleted(true);
      } else {
        setStepError(data.error || "Errore nel completamento");
      }
    } catch {
      setStepError("Errore di connessione");
    } finally {
      setCompleting(false);
    }
  }, [token, password, confirmPassword, allPasswordValid]);

  // ------- Auto-login handler -------
  const handleAutoLogin = useCallback(async () => {
    if (!teacherInfo?.teacherEmail || !password) {
      window.location.href = "/login";
      return;
    }
    setAutoLogging(true);
    try {
      const result = await signIn("credentials", {
        email: teacherInfo.teacherEmail,
        password,
        redirect: false,
      });
      if (result?.ok) {
        window.location.href = finalStatus === "ACTIVE" ? "/docente" : "/onboarding/docente";
      } else {
        window.location.href = "/login";
      }
    } catch {
      window.location.href = "/login";
    }
  }, [teacherInfo, password, finalStatus]);

  // ------- Province change handler -------
  const handleProvinceChange = useCallback(
    (value: string) => {
      updateField("province", value);
      const sigla = value.split(" - ")[0]?.trim();
      if (sigla) {
        const r = getRegioneByProvincia(sigla);
        if (r) updateField("region", r);
      }
    },
    [updateField, getRegioneByProvincia]
  );

  const handleBirthProvinceChange = useCallback(
    (value: string) => {
      updateField("birthProvince", value);
    },
    [updateField]
  );

  // ------- Render: Loading / Error -------
  if (validating) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#EAB308]" />
          <p className="mt-4 text-sm text-gray-500">Verifica in corso...</p>
        </div>
      </PageShell>
    );
  }

  if (tokenError) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Link non valido
          </h2>
          <p className="text-sm text-gray-500 max-w-md">{tokenError}</p>
          <p className="mt-4 text-sm text-gray-500">
            Se hai gia completato la registrazione,{" "}
            <Link href="/login" className="font-medium text-[#EAB308] hover:underline">accedi al portale</Link>.
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Per assistenza contatta la segreteria.
          </p>
        </div>
      </PageShell>
    );
  }

  // ------- Render: Success -------
  if (completed) {
    const isActive = finalStatus === "ACTIVE";
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isActive
              ? "Registrazione completata!"
              : "Registrazione quasi completata!"}
          </h2>
          {isActive ? (
            <p className="text-sm text-gray-500 max-w-md">
              Il tuo account e stato attivato con successo.
              Puoi accedere al portale con le tue credenziali.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-500 max-w-md mb-2">
                I tuoi dati sono stati salvati con successo.
              </p>
              <p className="text-sm text-gray-500 max-w-md">
                Per attivare il tuo account devi ancora firmare la{" "}
                <strong>Dichiarazione sostitutiva dell&apos;atto di notorieta</strong>.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={handleAutoLogin}
            disabled={autoLogging}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#EAB308] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#FACC15] disabled:opacity-60"
          >
            {autoLogging ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Accesso in corso...</>
            ) : (
              isActive ? "Accedi al portale" : "Accedi al portale per completare"
            )}
          </button>
        </div>
      </PageShell>
    );
  }

  // ------- Render: Form -------
  return (
    <PageShell>
      <div className="mb-6 text-center">
        <h2
          className="text-xl font-semibold text-gray-900"
          style={{
            fontFamily: "var(--font-landing-display, var(--font-display))",
          }}
        >
          Registrazione Docente
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Benvenuto{teacherInfo?.teacherName ? `, ${teacherInfo.teacherName}` : ""}. Completa la tua registrazione.
        </p>
      </div>

      <Stepper step={step} />

      {stepError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {stepError}
        </div>
      )}

      {/* ========== STEP 1 ========== */}
      {step === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <SectionTitle>Dati personali</SectionTitle>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cognome <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
            />
            <FieldError error={errors.lastName} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nome <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
            />
            <FieldError error={errors.firstName} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Data di nascita <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.birthDate}
              onChange={(e) => updateField("birthDate", e.target.value)}
            />
            <FieldError error={errors.birthDate} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Genere
            </label>
            <select
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.gender}
              onChange={(e) => updateField("gender", e.target.value)}
            >
              <option value="">—</option>
              <option value="M">Uomo</option>
              <option value="F">Donna</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Comune di nascita <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.birthPlace}
              onChange={(e) => updateField("birthPlace", e.target.value)}
            />
            <FieldError error={errors.birthPlace} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Provincia di nascita
            </label>
            <input
              list="birth-province-options"
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.birthProvince}
              onChange={(e) => handleBirthProvinceChange(e.target.value)}
              placeholder="es. RM"
            />
            <datalist id="birth-province-options">
              {filteredBirthProvinceOptions.map((p) => (
                <option
                  key={`bp-${p.sigla}`}
                  value={`${p.sigla.toUpperCase()} - ${p.nome}`}
                />
              ))}
            </datalist>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Codice Fiscale <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm uppercase focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.fiscalCode}
              onChange={(e) =>
                updateField("fiscalCode", e.target.value.toUpperCase())
              }
              maxLength={16}
              placeholder="RSSMRA85M01H501Z"
            />
            <FieldError error={errors.fiscalCode} />
          </div>

          <div /> {/* spacer for grid alignment */}

          <SectionTitle>Residenza</SectionTitle>

          <div className="col-span-full">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Indirizzo <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
            <FieldError error={errors.address} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Comune <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
            />
            <FieldError error={errors.city} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Provincia <span className="text-red-400">*</span>
            </label>
            <input
              list="res-province-options"
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.province}
              onChange={(e) => handleProvinceChange(e.target.value)}
              placeholder="es. MI"
            />
            <FieldError error={errors.province} />
            <datalist id="res-province-options">
              {filteredProvinceOptions.map((p) => (
                <option
                  key={`rp-${p.sigla}`}
                  value={`${p.sigla.toUpperCase()} - ${p.nome}`}
                />
              ))}
            </datalist>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              CAP <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.postalCode}
              onChange={(e) => updateField("postalCode", e.target.value)}
              maxLength={5}
            />
            <FieldError error={errors.postalCode} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Regione
            </label>
            <select
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.region}
              onChange={(e) => updateField("region", e.target.value)}
            >
              <option value="">—</option>
              {regioni.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <SectionTitle>Contatti</SectionTitle>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Telefono fisso
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cellulare
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.mobile}
              onChange={(e) => updateField("mobile", e.target.value)}
              placeholder="+39 ..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Fax
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.fax}
              onChange={(e) => updateField("fax", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full rounded-lg border bg-gray-100 px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed"
              value={teacherInfo?.teacherEmail ?? ""}
              readOnly
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email secondaria
            </label>
            <input
              type="email"
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.emailSecondary}
              onChange={(e) => updateField("emailSecondary", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              PEC
            </label>
            <input
              type="email"
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.pec}
              onChange={(e) => updateField("pec", e.target.value)}
            />
          </div>

          <SectionTitle>Dati professionali</SectionTitle>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Partita IVA
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.vatNumber}
              onChange={(e) => updateField("vatNumber", e.target.value)}
              maxLength={11}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              IBAN
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.iban}
              onChange={(e) => updateField("iban", e.target.value)}
              maxLength={34}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="vatExempt"
              checked={form.vatExempt}
              onChange={(e) => updateField("vatExempt", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#EAB308] focus:ring-[#EAB308]"
            />
            <label htmlFor="vatExempt" className="text-sm text-gray-700">
              Esente IVA
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Dipendente pubblico
            </label>
            <div className="flex gap-4 items-center mt-1">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="publicEmployee"
                  checked={form.publicEmployee === "true"}
                  onChange={() => updateField("publicEmployee", "true")}
                  className="text-[#EAB308] focus:ring-[#EAB308]"
                />
                Si
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="publicEmployee"
                  checked={form.publicEmployee === "false"}
                  onChange={() => updateField("publicEmployee", "false")}
                  className="text-[#EAB308] focus:ring-[#EAB308]"
                />
                No
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Titolo di studio
            </label>
            <select
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.educationLevel}
              onChange={(e) => updateField("educationLevel", e.target.value)}
            >
              <option value="">—</option>
              {EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Professione / Mansione
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.profession}
              onChange={(e) => updateField("profession", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Datore di lavoro
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.employerName}
              onChange={(e) => updateField("employerName", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Codice Destinatario
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.sdiCode}
              onChange={(e) => updateField("sdiCode", e.target.value)}
              maxLength={7}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Matricola
            </label>
            <input
              className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
              value={form.registrationNumber}
              onChange={(e) => updateField("registrationNumber", e.target.value)}
            />
          </div>

          <SectionTitle>Documenti</SectionTitle>

          <FileUploadField
            label="CV (PDF, DOC, DOCX)"
            accept=".pdf,.doc,.docx"
            hint="Max 10MB — PDF, DOC, DOCX"
            fileName={cvFileName}
            uploading={uploadingCv}
            onUpload={(file) => handleUpload(file, "cv")}
            onRemove={() => setCvFileName(null)}
          />

          <FileUploadField
            label="Documento d'identita (copia in corso di validita)"
            accept=".pdf,.jpg,.jpeg,.png"
            hint="Max 10MB — PDF, JPG, PNG"
            fileName={idDocFileName}
            uploading={uploadingIdDoc}
            onUpload={(file) => handleUpload(file, "idDocument")}
            onRemove={() => setIdDocFileName(null)}
          />
        </div>
      )}

      {/* ========== STEP 2: Competenze e CV ========== */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Competenze e CV
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Compila il tuo curriculum vitae strutturato.
            </p>
          </div>
          <TeacherCvEditor
            mode="registration"
            onValidationChange={(valid) => setCvValid(valid)}
          />
        </div>
      )}

      {/* ========== STEP 3: Firma documento ========== */}
      {step === 3 && (
        <DocumentSigningForm
          teacher={{
            firstName: form.firstName,
            lastName: form.lastName,
            birthDate: form.birthDate,
            birthPlace: form.birthPlace,
            city: form.city,
            address: form.address,
            postalCode: form.postalCode,
            province: form.province.split(" - ")[0]?.trim() || form.province,
          }}
          token={token}
          onComplete={() => {
            setStepError(null);
            setStep(4);
          }}
        />
      )}

      {/* ========== STEP 4: Password ========== */}
      {step === 4 && (
        <div className="mx-auto max-w-md space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Scegli la tua password
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Questa password ti servira per accedere al Portale Sapienta come
              docente.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nuova password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-lg border bg-white px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Conferma password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                className="w-full rounded-lg border bg-white px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-[#EAB308]/30 focus:border-[#EAB308]"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="rounded-lg border bg-gray-50 px-4 py-3 space-y-1.5">
            <p className="text-xs font-medium text-gray-600 mb-2">
              Requisiti password:
            </p>
            <PasswordCheck ok={passwordChecks.length} label="Almeno 8 caratteri" />
            <PasswordCheck ok={passwordChecks.uppercase} label="Almeno una lettera maiuscola" />
            <PasswordCheck ok={passwordChecks.number} label="Almeno un numero" />
            <PasswordCheck ok={passwordChecks.special} label="Almeno un carattere speciale" />
            <PasswordCheck ok={passwordChecks.match} label="Le password coincidono" />
          </div>
        </div>
      )}

      {/* ========== Nav buttons ========== */}
      {!completed && step !== 3 && (
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                setStepError(null);
                setStep(step - 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Indietro
            </button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <button
              type="button"
              onClick={submitStep1}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#EAB308] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#FACC15] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Avanti
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              onClick={() => {
                setStepError(null);
                setStep(3);
              }}
              disabled={!cvValid}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#EAB308] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#FACC15] disabled:opacity-50"
              title={!cvValid ? "Inserisci almeno 1 esperienza lavorativa e 1 titolo di studio" : undefined}
            >
              Avanti
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {step === 4 && (
            <button
              type="button"
              onClick={submitComplete}
              disabled={completing || !allPasswordValid}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#EAB308] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#FACC15] disabled:opacity-50"
            >
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Completa registrazione"
              )}
            </button>
          )}
        </div>
      )}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Shell wrapper
// ---------------------------------------------------------------------------

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8 sm:py-12">
      <div className="mb-8">
        <Image
          src="/icons/sapienta-remove.png"
          alt="Sapienta"
          width={180}
          height={48}
          className="h-12 w-auto"
          priority
        />
      </div>
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-lg">
        {children}
      </div>
      <p className="mt-6 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Accademia Eraclitea — Portale Sapienta
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Password check item
// ---------------------------------------------------------------------------

function PasswordCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <X className="h-3.5 w-3.5 text-gray-300" />
      )}
      <span className={ok ? "text-emerald-600" : "text-gray-400"}>
        {label}
      </span>
    </div>
  );
}
