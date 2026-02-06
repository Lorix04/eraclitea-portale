"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <LogIn className="h-8 w-8 text-gray-700" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">Accedi</h1>
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-muted-foreground text-center">
            Portale
          </p>
        <p className="mt-3 text-center text-sm text-gray-500">
          Inserisci le tue credenziali per accedere
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm text-gray-700">
            Email
            <input
              type="email"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-700">
            Password
            <input
              type="password"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="rounded-md bg-gray-800 px-4 py-2 text-white hover:bg-gray-900 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>

          <a
            href="/recupera-password"
            className="text-center text-sm text-gray-600 hover:text-gray-800"
          >
            Hai dimenticato la password?
          </a>
        </form>
      </div>
    </main>
  );
}
