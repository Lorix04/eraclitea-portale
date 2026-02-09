"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";

export default function ResetPasswordPage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      nextErrors.password = "Questo campo è obbligatorio";
    }
    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Questo campo è obbligatorio";
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isValid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
            ✕
          </div>
          <h1 className="text-2xl font-semibold">Link non valido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Il link di reset è scaduto o non valido. Richiedi un nuovo link.
          </p>
          <Link
            href="/recupera-password"
            className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            Richiedi nuovo link
          </Link>
        </div>
      </main>
    );
  }

  if (isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            ✓
          </div>
          <h1 className="text-2xl font-semibold">Password reimpostata</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verrai reindirizzato alla pagina di login.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Nuova password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Inserisci la tua nuova password.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <FormRequiredLegend />
          <div className="flex flex-col gap-2 text-sm">
            <FormLabel required>Nuova password</FormLabel>
            <input
              type="password"
              className={`rounded-md border bg-background px-3 py-2 ${
                fieldErrors.password
                  ? "border-red-500 focus-visible:outline-red-500"
                  : ""
              }`}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: "" }));
                }
              }}
            />
            <FormFieldError message={fieldErrors.password} />
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <FormLabel required>Conferma password</FormLabel>
            <input
              type="password"
              className={`rounded-md border bg-background px-3 py-2 ${
                fieldErrors.confirmPassword
                  ? "border-red-500 focus-visible:outline-red-500"
                  : ""
              }`}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }
              }}
            />
            <FormFieldError message={fieldErrors.confirmPassword} />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground"
            disabled={isLoading}
          >
            {isLoading ? "Salvataggio..." : "Salva nuova password"}
          </button>
        </form>
      </div>
    </main>
  );
}
