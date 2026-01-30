"use client";

import { useState } from "react";
import Link from "next/link";

export default function RecuperaPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

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
      setError("Si &egrave; verificato un errore. Riprova pi&ugrave; tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            &#10003;
          </div>
          <h1 className="text-2xl font-semibold">Controlla la tua email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Se l&apos;indirizzo &egrave; registrato, riceverai le istruzioni per
            reimpostare la password.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-md border px-4 py-2 text-sm"
          >
            Torna al login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Recupera password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Inserisci la tua email per ricevere il link di reset.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <label className="flex flex-col gap-2 text-sm">
            Email
            <input
              type="email"
              className="rounded-md border bg-background px-3 py-2"
              placeholder="tuaemail@esempio.it"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground"
            disabled={isLoading}
          >
            {isLoading ? "Invio in corso..." : "Invia link di reset"}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm text-primary">
              Torna al login
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
