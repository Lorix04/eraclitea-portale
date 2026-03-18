"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertCircle, Check, Loader2, X } from "lucide-react";
import SignatureCanvas from "@/components/SignatureCanvas";

interface TeacherData {
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  city: string;
  address?: string;
  postalCode?: string;
  province?: string;
}

interface DocumentSigningFormProps {
  teacher: TeacherData;
  token?: string;
  onComplete: () => void;
}

const DECLARATIONS = [
  "di essere in possesso di un'esperienza lavorativa di oltre 5 anni nell'ambito formazione in materia di salute e sicurezza sui luoghi di lavoro",
  "di essere in possesso dei requisiti previsti dal Decreto interministeriale del 6 marzo 2013",
  "di essere in possesso dei requisiti previsti dal Decreto Ministeriale del 02 Settembre 2021 quale docente per svolgimento dei corsi antincendio come docente di parte teorica e pratica",
  "di essere in possesso dei requisiti previsti dall'Accordo Stato Regioni del 17 aprile 2025 quale docente per lo svolgimento dei corsi di formazione sulle attrezzature da lavoro",
  "di essere in possesso dei requisiti previsti dal DM 388/2003 quale docente per lo svolgimento dei corsi di formazione per il primo soccorso",
];

function formatDateIT(dateStr: string): string {
  if (!dateStr) return "___";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DocumentSigningForm({
  teacher,
  token,
  onComplete,
}: DocumentSigningFormProps) {
  const [declarations, setDeclarations] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [place, setPlace] = useState("");
  const [date, setDate] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDeclaration = useCallback((index: number) => {
    setDeclarations((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const checks = useMemo(
    () => ({
      hasDeclaration: declarations.some(Boolean),
      hasPrivacy: privacyAccepted,
      hasSignature: signatureImage !== null,
      hasPlace: place.trim().length > 0,
      hasDate: date.length > 0,
    }),
    [declarations, privacyAccepted, signatureImage, place, date]
  );

  const allValid =
    checks.hasDeclaration &&
    checks.hasPrivacy &&
    checks.hasSignature &&
    checks.hasPlace &&
    checks.hasDate;

  const handleSubmit = useCallback(async () => {
    if (!allValid) return;
    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        declaration1: declarations[0],
        declaration2: declarations[1],
        declaration3: declarations[2],
        declaration4: declarations[3],
        declaration5: declarations[4],
        privacyAccepted,
        signatureImage,
        declarationPlace: place.trim(),
        declarationDate: date,
      };
      if (token) body.token = token;

      const res = await fetch("/api/teacher/sign-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore durante la firma");
        return;
      }

      onComplete();
    } catch {
      setError("Errore di connessione");
    } finally {
      setSubmitting(false);
    }
  }, [
    allValid,
    declarations,
    privacyAccepted,
    signatureImage,
    place,
    date,
    token,
    onComplete,
  ]);

  const fullName = `${teacher.lastName.toUpperCase()} ${teacher.firstName.toUpperCase()}`;
  const birthDateFormatted = formatDateIT(teacher.birthDate);
  const birthPlaceUpper = teacher.birthPlace?.toUpperCase() || "___";
  const fullResidence = [
    teacher.address,
    [teacher.postalCode, teacher.city].filter(Boolean).join(" "),
    teacher.province ? `(${teacher.province})` : "",
  ].filter(Boolean).join(", ").toUpperCase() || "___";

  return (
    <div className="space-y-6">
      {/* Document card */}
      <div className="mx-auto max-w-3xl rounded-xl border bg-white shadow-md">
        {/* Header */}
        <div className="border-b px-6 py-5 text-center">
          <h2
            className="text-base font-bold uppercase tracking-wide text-gray-900 sm:text-lg"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Dichiarazione sostitutiva dell&apos;atto di notorieta
          </h2>
          <p
            className="mt-1 text-sm text-gray-500"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            (Art. 46 D.P.R. 445 del 28 dicembre 2000)
          </p>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-8">
          {/* Declarant section */}
          <p
            className="text-sm leading-relaxed text-gray-700"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Il sottoscritto{" "}
            <strong className="text-gray-900">{fullName}</strong>, nato a{" "}
            <strong className="text-gray-900">{birthPlaceUpper}</strong> il{" "}
            <strong className="text-gray-900">{birthDateFormatted}</strong>,
            residente a{" "}
            <strong className="text-gray-900">{fullResidence}</strong>
          </p>

          <p
            className="text-sm leading-relaxed text-gray-600 italic"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            consapevole delle sanzioni penali, nel caso di dichiarazioni non
            veritiere, di formazione o uso di atti falsi, richiamate
            dall&apos;art. 76 del D.P.R. 445 del 28 dicembre 2000
          </p>

          {/* DICHIARO */}
          <div className="border-y py-4 text-center">
            <span
              className="text-base font-bold tracking-widest text-gray-900"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              DICHIARO
            </span>
            <p className="mt-1 text-xs text-gray-500">
              (flaggare la/e casella/e di propria pertinenza)
            </p>
          </div>

          {/* 5 declarations */}
          <div className="space-y-4">
            {DECLARATIONS.map((text, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={declarations[i]}
                  onChange={() => toggleDeclaration(i)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-[#EAB308] focus:ring-[#EAB308]"
                />
                <span
                  className="text-sm leading-relaxed text-gray-700"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {text}
                </span>
              </label>
            ))}
          </div>

          {/* Privacy */}
          <div className="border-t pt-5">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-[#EAB308] focus:ring-[#EAB308]"
              />
              <span
                className="text-sm leading-relaxed text-gray-700"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Dichiaro di essere informato, ai sensi e per gli effetti di
                cui al D. Lgs. 196/2003 e del regolamento EU 679/2016 che i
                dati personali raccolti saranno trattati, anche con strumenti
                informatici, esclusivamente nell&apos;ambito del procedimento
                per il quale la presente dichiarazione viene resa.
              </span>
            </label>
          </div>

          {/* Place and date */}
          <div className="grid grid-cols-1 gap-4 border-t pt-5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Luogo
              </label>
              <input
                className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-[#EAB308] focus:ring-2 focus:ring-[#EAB308]/30"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Inserisci il luogo"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data
              </label>
              <input
                type="date"
                className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-[#EAB308] focus:ring-2 focus:ring-[#EAB308]/30"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Signature */}
          <div className="border-t pt-5">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Firma
            </label>
            <SignatureCanvas
              onSignatureChange={setSignatureImage}
              width={400}
              height={150}
            />
          </div>

          {/* Document note */}
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500 italic">
            Si allega copia del documento di riconoscimento in corso di
            validita (caricato nel passaggio precedente).
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Validation checklist */}
      <div className="mx-auto max-w-3xl rounded-lg border bg-gray-50 px-4 py-3 space-y-1.5">
        <p className="text-xs font-medium text-gray-600 mb-2">
          Per procedere e necessario:
        </p>
        <CheckItem ok={checks.hasDeclaration} label="Selezionare almeno una dichiarazione" />
        <CheckItem ok={checks.hasPrivacy} label="Accettare l'informativa privacy" />
        <CheckItem ok={checks.hasSignature} label="Apporre la firma" />
        <CheckItem ok={checks.hasPlace} label="Compilare il luogo" />
        <CheckItem ok={checks.hasDate} label="Compilare la data" />
      </div>

      {/* Submit */}
      <div className="mx-auto flex max-w-3xl justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allValid || submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-[#EAB308] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#FACC15] disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Firma e prosegui"
          )}
        </button>
      </div>
    </div>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <X className="h-3.5 w-3.5 text-red-400" />
      )}
      <span className={ok ? "text-emerald-600" : "text-gray-500"}>
        {label}
      </span>
    </div>
  );
}
