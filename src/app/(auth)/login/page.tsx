"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          <div className="flex flex-col gap-2 text-sm text-gray-700">
            <FormLabel>Email</FormLabel>
            <input
              type="email"
              className={`rounded-md border bg-white px-3 py-2 focus:outline-none focus:ring-1 ${
                errors.email
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-gray-500 focus:ring-gray-500"
              }`}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: "" }));
                }
              }}
            />
            <FormFieldError message={errors.email} />
          </div>
          <div className="flex flex-col gap-2 text-sm text-gray-700">
            <FormLabel>Password</FormLabel>
            <input
              type="password"
              className={`rounded-md border bg-white px-3 py-2 focus:outline-none focus:ring-1 ${
                errors.password
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-gray-500 focus:ring-gray-500"
              }`}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: "" }));
                }
              }}
            />
            <FormFieldError message={errors.password} />
          </div>

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
