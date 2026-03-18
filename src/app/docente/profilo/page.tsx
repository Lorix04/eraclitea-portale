"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Loader2, UserCircle, X } from "lucide-react";
import { toast } from "sonner";
import { useProvinceRegioni } from "@/hooks/useProvinceRegioni";

const EDUCATION_LEVELS = [
  "Licenza media", "Diploma di scuola superiore", "Laurea triennale",
  "Laurea magistrale", "Laurea vecchio ordinamento", "Master di I livello",
  "Master di II livello", "Dottorato di ricerca", "Altro",
];

const inputCls = "w-full rounded-md border bg-background px-3 py-2 text-sm";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="col-span-full text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-6 mb-2 first:mt-0">{children}</h3>;
}

function dateToInput(v: string | null | undefined): string {
  if (!v) return "";
  try { const d = new Date(v); return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); } catch { return ""; }
}

export default function TeacherProfiloPage() {
  // Form state
  const [form, setForm] = useState<Record<string, string | boolean | null>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const { province: provinceOptions, regioni, filterProvince, getRegioneByProvincia } = useProvinceRegioni();

  const profileQuery = useQuery({
    queryKey: ["teacher-profile-edit"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/profile");
      if (!res.ok) throw new Error("Errore caricamento profilo");
      return await res.json();
    },
  });

  // Init form from profile data
  useEffect(() => {
    if (!profileQuery.data || loaded) return;
    const d = profileQuery.data;
    setForm({
      firstName: d.firstName ?? "",
      lastName: d.lastName ?? "",
      birthDate: dateToInput(d.birthDate),
      birthPlace: d.birthPlace ?? "",
      birthProvince: d.birthProvince ?? "",
      gender: d.gender ?? "",
      fiscalCode: d.fiscalCode ?? "",
      address: d.address ?? "",
      city: d.city ?? "",
      postalCode: d.postalCode ?? "",
      province: d.province ?? "",
      region: d.region ?? "",
      phone: d.phone ?? "",
      mobile: d.mobile ?? "",
      fax: d.fax ?? "",
      emailSecondary: d.emailSecondary ?? "",
      pec: d.pec ?? "",
      specialization: d.specialization ?? "",
      profession: d.profession ?? "",
      educationLevel: d.educationLevel ?? "",
      employerName: d.employerName ?? "",
      vatNumber: d.vatNumber ?? "",
      iban: d.iban ?? "",
      vatExempt: d.vatExempt ?? false,
      publicEmployee: d.publicEmployee === true ? "true" : d.publicEmployee === false ? "false" : "",
      sdiCode: d.sdiCode ?? "0000000",
      registrationNumber: d.registrationNumber ?? "",
      bio: d.bio ?? "",
      notes: d.notes ?? "",
    });
    setLoaded(true);
  }, [profileQuery.data, loaded]);

  const updateField = useCallback((key: string, value: string | boolean | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const filteredBirthProvOptions = useMemo(
    () => filterProvince(String(form.birthProvince ?? "")).slice(0, 40),
    [form.birthProvince, filterProvince]
  );
  const filteredProvOptions = useMemo(
    () => filterProvince(String(form.province ?? "")).slice(0, 40),
    [form.province, filterProvince]
  );

  const handleProvinceChange = useCallback((value: string) => {
    updateField("province", value);
    const sigla = value.split(" - ")[0]?.trim();
    if (sigla) {
      const r = getRegioneByProvincia(sigla);
      if (r) updateField("region", r);
    }
  }, [updateField, getRegioneByProvincia]);

  const handleSave = useCallback(async () => {
    if (!String(form.firstName ?? "").trim() || !String(form.lastName ?? "").trim()) {
      toast.error("Nome e cognome obbligatori");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        province: String(form.province ?? "").split(" - ")[0]?.trim() || "",
        birthProvince: String(form.birthProvince ?? "").split(" - ")[0]?.trim() || "",
        publicEmployee: form.publicEmployee === "true" ? true : form.publicEmployee === "false" ? false : null,
      };
      const res = await fetch("/api/teacher/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Errore salvataggio"); return; }
      toast.success("Profilo aggiornato");
    } catch {
      toast.error("Errore di connessione");
    } finally {
      setSaving(false);
    }
  }, [form]);

  // Password checks
  const pwdChecks = useMemo(() => ({
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword,
  }), [newPassword, confirmPassword]);

  const allPwdValid = pwdChecks.length && pwdChecks.uppercase && pwdChecks.number && pwdChecks.special && pwdChecks.match;

  const handleChangePassword = useCallback(async () => {
    if (!allPwdValid || !currentPassword) return;
    setChangingPwd(true);
    try {
      const res = await fetch("/api/teacher/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Errore cambio password"); return; }
      toast.success("Password modificata");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch {
      toast.error("Errore di connessione");
    } finally {
      setChangingPwd(false);
    }
  }, [currentPassword, newPassword, confirmPassword, allPwdValid]);

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold"><UserCircle className="h-5 w-5" /> Il mio Profilo</h1>
        <div className="h-40 animate-pulse rounded-lg border bg-muted" />
      </div>
    );
  }

  const email = profileQuery.data?.email ?? profileQuery.data?.emailSecondary ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <UserCircle className="h-5 w-5" /> Il mio Profilo
        </h1>
        <p className="text-sm text-muted-foreground">Gestisci i tuoi dati personali.</p>
      </div>

      {/* === Profile form === */}
      <div className="rounded-lg border bg-card p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 max-w-3xl">
          <SectionTitle>Dati personali</SectionTitle>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Cognome <span className="text-red-400">*</span></span>
            <input className={inputCls} value={String(form.lastName ?? "")} onChange={(e) => updateField("lastName", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Nome <span className="text-red-400">*</span></span>
            <input className={inputCls} value={String(form.firstName ?? "")} onChange={(e) => updateField("firstName", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Data di nascita</span>
            <input type="date" className={inputCls} value={String(form.birthDate ?? "")} onChange={(e) => updateField("birthDate", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Genere</span>
            <select className={inputCls} value={String(form.gender ?? "")} onChange={(e) => updateField("gender", e.target.value)}>
              <option value="">—</option><option value="M">Uomo</option><option value="F">Donna</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Comune di nascita</span>
            <input className={inputCls} value={String(form.birthPlace ?? "")} onChange={(e) => updateField("birthPlace", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Prov. nascita</span>
            <input list="prof-bp" className={inputCls} value={String(form.birthProvince ?? "")} onChange={(e) => updateField("birthProvince", e.target.value)} />
            <datalist id="prof-bp">{filteredBirthProvOptions.map((p) => <option key={p.sigla} value={`${p.sigla.toUpperCase()} - ${p.nome}`} />)}</datalist>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Codice Fiscale</span>
            <input className={inputCls + " uppercase"} value={String(form.fiscalCode ?? "")} onChange={(e) => updateField("fiscalCode", e.target.value.toUpperCase())} maxLength={16} />
          </label>
          <div />

          <SectionTitle>Residenza</SectionTitle>
          <label className="col-span-full flex flex-col gap-1 text-sm">
            <span className="font-medium">Indirizzo</span>
            <input className={inputCls} value={String(form.address ?? "")} onChange={(e) => updateField("address", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Comune</span>
            <input className={inputCls} value={String(form.city ?? "")} onChange={(e) => updateField("city", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Provincia</span>
            <input list="prof-prov" className={inputCls} value={String(form.province ?? "")} onChange={(e) => handleProvinceChange(e.target.value)} />
            <datalist id="prof-prov">{filteredProvOptions.map((p) => <option key={p.sigla} value={`${p.sigla.toUpperCase()} - ${p.nome}`} />)}</datalist>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">CAP</span>
            <input className={inputCls} value={String(form.postalCode ?? "")} onChange={(e) => updateField("postalCode", e.target.value)} maxLength={5} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Regione</span>
            <select className={inputCls} value={String(form.region ?? "")} onChange={(e) => updateField("region", e.target.value)}>
              <option value="">—</option>
              {regioni.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>

          <SectionTitle>Contatti</SectionTitle>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Telefono</span>
            <input className={inputCls} value={String(form.phone ?? "")} onChange={(e) => updateField("phone", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Cellulare</span>
            <input className={inputCls} value={String(form.mobile ?? "")} onChange={(e) => updateField("mobile", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Fax</span>
            <input className={inputCls} value={String(form.fax ?? "")} onChange={(e) => updateField("fax", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Email</span>
            <input className={inputCls + " bg-gray-100 cursor-not-allowed"} value={email} readOnly />
            <span className="text-xs text-muted-foreground">Contatta l&apos;admin per modificare l&apos;email</span>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Email secondaria</span>
            <input type="email" className={inputCls} value={String(form.emailSecondary ?? "")} onChange={(e) => updateField("emailSecondary", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">PEC</span>
            <input type="email" className={inputCls} value={String(form.pec ?? "")} onChange={(e) => updateField("pec", e.target.value)} />
          </label>

          <SectionTitle>Dati professionali</SectionTitle>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Specializzazione</span>
            <input className={inputCls} value={String(form.specialization ?? "")} onChange={(e) => updateField("specialization", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Professione</span>
            <input className={inputCls} value={String(form.profession ?? "")} onChange={(e) => updateField("profession", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Titolo di studio</span>
            <select className={inputCls} value={String(form.educationLevel ?? "")} onChange={(e) => updateField("educationLevel", e.target.value)}>
              <option value="">—</option>
              {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Datore di lavoro</span>
            <input className={inputCls} value={String(form.employerName ?? "")} onChange={(e) => updateField("employerName", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">P.IVA</span>
            <input className={inputCls} value={String(form.vatNumber ?? "")} onChange={(e) => updateField("vatNumber", e.target.value)} maxLength={11} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">IBAN</span>
            <input className={inputCls} value={String(form.iban ?? "")} onChange={(e) => updateField("iban", e.target.value)} maxLength={34} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Codice Destinatario</span>
            <input className={inputCls} value={String(form.sdiCode ?? "")} onChange={(e) => updateField("sdiCode", e.target.value)} maxLength={7} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Matricola</span>
            <input className={inputCls} value={String(form.registrationNumber ?? "")} onChange={(e) => updateField("registrationNumber", e.target.value)} />
          </label>
          <div className="flex items-center gap-3 mt-1">
            <input type="checkbox" checked={form.vatExempt === true} onChange={(e) => updateField("vatExempt", e.target.checked)} className="h-4 w-4" />
            <span className="text-sm">Esente IVA</span>
          </div>
          <div>
            <span className="text-sm font-medium">Dipendente pubblico</span>
            <div className="flex gap-4 items-center mt-1">
              <label className="flex items-center gap-1.5 text-sm"><input type="radio" name="pubEmp" checked={form.publicEmployee === "true"} onChange={() => updateField("publicEmployee", "true")} /> Si</label>
              <label className="flex items-center gap-1.5 text-sm"><input type="radio" name="pubEmp" checked={form.publicEmployee === "false"} onChange={() => updateField("publicEmployee", "false")} /> No</label>
            </div>
          </div>

          <SectionTitle>Bio</SectionTitle>
          <label className="col-span-full flex flex-col gap-1 text-sm">
            <textarea rows={3} className={inputCls} value={String(form.bio ?? "")} onChange={(e) => updateField("bio", e.target.value)} />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-6 py-2 text-sm text-primary-foreground disabled:opacity-60">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</> : "Salva modifiche"}
          </button>
        </div>
      </div>

      {/* === Change password === */}
      <div className="rounded-lg border bg-card p-4 md:p-6">
        <h2 className="text-sm font-semibold mb-4">Cambia password</h2>
        <div className="max-w-md space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Password attuale</span>
            <input type="password" className={inputCls} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Nuova password</span>
            <div className="relative">
              <input type={showPwd ? "text" : "password"} className={inputCls + " pr-10"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Conferma password</span>
            <input type="password" className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>
          <div className="rounded-lg border bg-gray-50 px-3 py-2 space-y-1">
            <PwdCheck ok={pwdChecks.length} label="Almeno 8 caratteri" />
            <PwdCheck ok={pwdChecks.uppercase} label="Almeno una maiuscola" />
            <PwdCheck ok={pwdChecks.number} label="Almeno un numero" />
            <PwdCheck ok={pwdChecks.special} label="Almeno un carattere speciale" />
            <PwdCheck ok={pwdChecks.match} label="Le password coincidono" />
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleChangePassword} disabled={changingPwd || !allPwdValid || !currentPassword} className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-6 py-2 text-sm text-primary-foreground disabled:opacity-60">
              {changingPwd ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cambio...</> : "Cambia password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PwdCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <X className="h-3.5 w-3.5 text-gray-300" />}
      <span className={ok ? "text-emerald-600" : "text-gray-400"}>{label}</span>
    </div>
  );
}
