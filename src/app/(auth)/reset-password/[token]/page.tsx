"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "../../AuthLayout";

export default function ResetPasswordPage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/auth/reset-password/${params.token}`)
      .then((res) => res.json())
      .then((data) => {
        setIsValid(Boolean(data.valid));
        setIsValidating(false);
      })
      .catch(() => {
        setIsValid(false);
        setIsValidating(false);
      });
  }, [params.token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const nextErrors: Record<string, string> = {};
    if (!password.trim()) {
      nextErrors.password = "Questo campo e obbligatorio";
    }
    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Questo campo e obbligatorio";
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    if (password.length < 8) {
      setFieldErrors({ password: "La password deve essere di almeno 8 caratteri" });
      return;
    }

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Le password non coincidono" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/auth/reset-password/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Errore durante il reset");
      }

      setIsSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il reset");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#EAB308] border-t-transparent" />
          <p className="mt-4 text-sm text-white/50">Verifica del link in corso...</p>
        </div>
      </AuthLayout>
    );
  }

  if (!isValid) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
            <svg
              className="h-8 w-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2
            className="text-xl font-semibold text-white"
            style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
          >
            Link non valido
          </h2>
          <p className="text-sm text-white/45">Il link di reset e scaduto o non valido.</p>
          <Link
            href="/recupera-password"
            className="inline-block rounded-lg bg-[#EAB308] px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#FACC15]"
          >
            Richiedi nuovo link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10">
            <svg
              className="h-8 w-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2
            className="text-xl font-semibold text-white"
            style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
          >
            Password aggiornata!
          </h2>
          <p className="text-sm text-white/45">Ora puoi accedere con la tua nuova password.</p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-[#EAB308] px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#FACC15]"
          >
            Vai al login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <h2
          className="mb-1 text-xl font-semibold text-white"
          style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
        >
          Nuova Password
        </h2>
        <p className="text-sm text-white/40">Scegli la tua nuova password</p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/60">
            Nuova password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className={`w-full rounded-lg border bg-[#111111] px-4 py-2.5 pr-10 text-sm text-white placeholder-white/20 transition-all focus:outline-none focus:ring-2 ${
                fieldErrors.password
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
                  : "border-white/10 focus:border-[#EAB308]/50 focus:ring-[#EAB308]/50"
              }`}
              minLength={8}
              placeholder="Almeno 8 caratteri"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: "" }));
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-[#EAB308]"
              aria-label={showPassword ? "Nascondi password" : "Mostra password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {fieldErrors.password ? (
            <p className="mt-1 text-sm text-red-400">{fieldErrors.password}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/60">
            Conferma password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              className={`w-full rounded-lg border bg-[#111111] px-4 py-2.5 pr-10 text-sm text-white placeholder-white/20 transition-all focus:outline-none focus:ring-2 ${
                fieldErrors.confirmPassword
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
                  : "border-white/10 focus:border-[#EAB308]/50 focus:ring-[#EAB308]/50"
              }`}
              placeholder="Ripeti la password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-[#EAB308]"
              aria-label={
                showConfirmPassword
                  ? "Nascondi conferma password"
                  : "Mostra conferma password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {fieldErrors.confirmPassword ? (
            <p className="mt-1 text-sm text-red-400">{fieldErrors.confirmPassword}</p>
          ) : null}
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-[#EAB308] px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-[#FACC15] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Salvataggio...
            </span>
          ) : (
            "Salva nuova password"
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/login" className="text-xs text-white/40 transition-colors hover:text-[#EAB308]">
          &larr; Torna al login
        </Link>
      </div>
    </AuthLayout>
  );
}
