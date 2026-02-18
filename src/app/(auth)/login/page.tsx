"use client";

import { useState } from "react";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import AuthLayout from "../AuthLayout";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldErrors: Record<string, string> = {};
    if (!email.trim()) fieldErrors.email = "Questo campo e obbligatorio";
    if (!password.trim()) fieldErrors.password = "Questo campo e obbligatorio";
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (result?.error) {
      setError("Credenziali non valide.");
      return;
    }

    const session = await getSession();
    if (session?.user?.role === "ADMIN") {
      router.replace("/admin");
      return;
    }
    router.replace("/dashboard");
  };

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#EAB308]/25 bg-[#EAB308]/10">
          <LogIn className="h-6 w-6 text-[#EAB308]" />
        </div>
        <h2
          className="mb-1 text-xl font-semibold text-white"
          style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
        >
          Accedi
        </h2>
        <p className="text-sm text-white/40">Inserisci le tue credenziali</p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/60">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            className={`w-full rounded-lg border bg-[#111111] px-4 py-2.5 text-sm text-white placeholder-white/20 transition-all focus:outline-none focus:ring-2 ${
              errors.email
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
                : "border-white/10 focus:border-[#EAB308]/50 focus:ring-[#EAB308]/50"
            }`}
            placeholder="nome@azienda.it"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email) {
                setErrors((prev) => ({ ...prev, email: "" }));
              }
            }}
          />
          {errors.email ? <p className="mt-1 text-sm text-red-400">{errors.email}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/60">
            Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className={`w-full rounded-lg border bg-[#111111] px-4 py-2.5 pr-10 text-sm text-white placeholder-white/20 transition-all focus:outline-none focus:ring-2 ${
                errors.password
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
                  : "border-white/10 focus:border-[#EAB308]/50 focus:ring-[#EAB308]/50"
              }`}
              placeholder="••••••••"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: "" }));
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
          {errors.password ? (
            <p className="mt-1 text-sm text-red-400">{errors.password}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <label className="group flex cursor-pointer items-center gap-2">
            <span className="relative">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="peer sr-only"
              />
              <span className="flex h-4 w-4 items-center justify-center rounded border border-white/20 bg-[#111111] transition-all peer-checked:border-[#EAB308] peer-checked:bg-[#EAB308]">
                {rememberMe ? (
                  <svg
                    className="h-3 w-3 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </span>
            </span>
            <span className="text-xs text-white/40 transition-colors group-hover:text-white/60">
              Ricordami
            </span>
          </label>

          <Link
            href="/recupera-password"
            className="text-xs text-[#EAB308]/70 transition-colors hover:text-[#EAB308]"
          >
            Password dimenticata?
          </Link>
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-lg bg-[#EAB308] px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-[#FACC15] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
        >
          {loading ? (
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
              Accesso in corso...
            </span>
          ) : (
            "Accedi"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
