"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  X,
} from "lucide-react";
import Link from "next/link";

type TokenInfo = {
  valid: boolean;
  email?: string;
  roleName?: string;
};

export default function AdminRegistrationPage() {
  const params = useParams();
  const token = params.token as string;

  const [validating, setValidating] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [autoLogging, setAutoLogging] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch("/api/admin-registration/validate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        setTokenInfo(data);
      } catch {
        setTokenInfo({ valid: false });
      } finally {
        setValidating(false);
      }
    }
    validate();
  }, [token]);

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

  const allValid =
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.number &&
    passwordChecks.special &&
    passwordChecks.match;

  const handleSubmit = useCallback(async () => {
    if (!allValid) return;
    setCompleting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin-registration/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Errore durante il completamento");
      }
      setUserEmail(data.email);
      setCompleted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCompleting(false);
    }
  }, [token, password, confirmPassword, allValid]);

  const handleAutoLogin = useCallback(async () => {
    if (!userEmail || !password) {
      window.location.href = "/login";
      return;
    }
    setAutoLogging(true);
    try {
      const result = await signIn("credentials", {
        email: userEmail,
        password,
        redirect: false,
      });
      if (result?.ok) {
        window.location.href = "/admin";
      } else {
        window.location.href = "/login";
      }
    } catch {
      window.location.href = "/login";
    }
  }, [userEmail, password]);

  // Loading
  if (validating) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#EAB308]" />
          <p className="mt-4 text-sm text-gray-500">Verifica in corso...</p>
        </div>
      </Shell>
    );
  }

  // Invalid token
  if (!tokenInfo?.valid) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Link non valido</h2>
          <p className="text-sm text-gray-500 max-w-md">
            Questo link di registrazione non è valido o è scaduto.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Se hai già completato la registrazione,{" "}
            <Link href="/login" className="font-medium text-[#EAB308] hover:underline">
              accedi al portale
            </Link>
            .
          </p>
        </div>
      </Shell>
    );
  }

  // Completed
  if (completed) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Registrazione completata!
          </h2>
          <p className="text-sm text-gray-500 max-w-md">
            Il tuo account è stato attivato. Puoi accedere al portale amministrativo.
          </p>
          <button
            type="button"
            onClick={handleAutoLogin}
            disabled={autoLogging}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#EAB308] px-6 py-3 text-sm font-semibold text-white hover:bg-[#FACC15] disabled:opacity-60"
          >
            {autoLogging ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Accesso in corso...
              </>
            ) : (
              "Accedi al portale"
            )}
          </button>
        </div>
      </Shell>
    );
  }

  // Registration form
  return (
    <Shell>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
          <Shield className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          Registrazione Amministratore
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Email: <strong>{tokenInfo.email}</strong>
        </p>
        <p className="text-sm text-gray-500">
          Ruolo: <strong>{tokenInfo.roleName}</strong>
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mx-auto max-w-md space-y-4">
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
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-lg border bg-gray-50 px-4 py-3 space-y-1.5">
          <p className="text-xs font-medium text-gray-600 mb-2">Requisiti password:</p>
          <PwdCheck ok={passwordChecks.length} label="Almeno 8 caratteri" />
          <PwdCheck ok={passwordChecks.uppercase} label="Almeno una lettera maiuscola" />
          <PwdCheck ok={passwordChecks.number} label="Almeno un numero" />
          <PwdCheck ok={passwordChecks.special} label="Almeno un carattere speciale" />
          <PwdCheck ok={passwordChecks.match} label="Le password coincidono" />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={completing || !allValid}
          className="w-full rounded-lg bg-[#EAB308] px-6 py-3 text-sm font-semibold text-white hover:bg-[#FACC15] disabled:opacity-50"
        >
          {completing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Completamento...
            </span>
          ) : (
            "Completa registrazione"
          )}
        </button>
      </div>
    </Shell>
  );
}

function PwdCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <X className="h-3.5 w-3.5 text-gray-300" />
      )}
      <span className={ok ? "text-emerald-600" : "text-gray-400"}>{label}</span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm border">
        {children}
      </div>
    </div>
  );
}
