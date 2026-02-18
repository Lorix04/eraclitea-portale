"use client";

import { useState } from "react";
import Link from "next/link";
import AuthLayout from "../AuthLayout";

export default function RecuperaPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    if (!email.trim()) {
      setFieldErrors({ email: "Questo campo e obbligatorio" });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error("Errore durante la richiesta");
      }

      setIsSubmitted(true);
    } catch {
      setError("Si e verificato un errore. Riprova piu tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <h2
          className="mb-1 text-xl font-semibold text-white"
          style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
        >
          Recupera Password
        </h2>
        <p className="text-sm text-white/40">Inserisci la tua email per ricevere il link di reset</p>
      </div>

      {isSubmitted ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10">
            <svg
              className="h-8 w-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p className="mb-1 font-medium text-white">Email inviata!</p>
            <p className="text-sm text-white/40">
              Se l&apos;indirizzo e registrato, riceverai un link per reimpostare la password.
              Controlla anche la cartella spam.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-[#EAB308] transition-colors hover:text-[#FACC15]"
          >
            &larr; Torna al login
          </Link>
        </div>
      ) : (
        <>
          {error ? (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
              {error}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/60">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                className={`w-full rounded-lg border bg-[#111111] px-4 py-2.5 text-sm text-white placeholder-white/20 transition-all focus:outline-none focus:ring-2 ${
                  fieldErrors.email
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
                    : "border-white/10 focus:border-[#EAB308]/50 focus:ring-[#EAB308]/50"
                }`}
                placeholder="nome@azienda.it"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: "" }));
                  }
                }}
              />
              {fieldErrors.email ? (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.email}</p>
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
                  Invio in corso...
                </span>
              ) : (
                "Invia link di recupero"
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="text-xs text-white/40 transition-colors hover:text-[#EAB308]"
            >
              &larr; Torna al login
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
