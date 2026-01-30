"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

    window.location.href = "/";
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/brand/eraclitea-logo.svg"
            alt="Eraclitea"
            width={320}
            height={80}
            priority
            className="h-20 w-80 object-contain"
          />
          <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Portale
          </p>
          <h1 className="text-2xl font-semibold">Accedi al portale</h1>
        </div>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Inserisci le credenziali fornite dall&apos;ente di formazione.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm">
            Email
            <input
              type="email"
              className="rounded-md border bg-background px-3 py-2"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Password
            <input
              type="password"
              className="rounded-md border bg-background px-3 py-2"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            disabled={loading}
          >
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>

          <a href="/recupera-password" className="text-center text-sm text-primary">
            Hai dimenticato la password?
          </a>
        </form>
      </div>
    </main>
  );
}
