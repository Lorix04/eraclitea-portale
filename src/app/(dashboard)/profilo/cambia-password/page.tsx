"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { BrandedButton } from "@/components/BrandedButton";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormLabel } from "@/components/ui/FormLabel";

export default function ForcedChangePasswordPage() {
  const router = useRouter();
  const { update } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validate = () => {
    const nextErrors: { newPassword?: string; confirmPassword?: string } = {};
    if (newPassword.trim().length < 8) {
      nextErrors.newPassword = "La password deve contenere almeno 8 caratteri";
    }
    if (confirmPassword.trim().length < 8) {
      nextErrors.confirmPassword = "Conferma password obbligatoria";
    }
    if (
      newPassword.trim().length >= 8 &&
      confirmPassword.trim().length >= 8 &&
      newPassword !== confirmPassword
    ) {
      nextErrors.confirmPassword = "Le password non coincidono";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/profilo/cambia-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Errore durante il cambio password");
      }

      await update({ mustChangePassword: false });
      toast.success("Password aggiornata con successo");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore durante il cambio password"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cambia Password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Per la tua sicurezza, devi impostare una nuova password.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FormLabel required>Nuova Password</FormLabel>
            <div className="relative mt-1">
              <input
                type={showNewPassword ? "text" : "password"}
                className={`w-full rounded-md border bg-background px-3 py-2 pr-10 ${
                  errors.newPassword ? "border-red-500 focus-visible:outline-red-500" : ""
                }`}
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  if (errors.newPassword) {
                    setErrors((prev) => ({ ...prev, newPassword: undefined }));
                  }
                }}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? "Nascondi nuova password" : "Mostra nuova password"}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FormFieldError message={errors.newPassword} />
          </div>

          <div>
            <FormLabel required>Conferma Nuova Password</FormLabel>
            <div className="relative mt-1">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className={`w-full rounded-md border bg-background px-3 py-2 pr-10 ${
                  errors.confirmPassword ? "border-red-500 focus-visible:outline-red-500" : ""
                }`}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? "Nascondi conferma nuova password"
                    : "Mostra conferma nuova password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <FormFieldError message={errors.confirmPassword} />
          </div>

          <BrandedButton type="submit" disabled={isSaving} className="min-h-[44px]">
            {isSaving ? "Salvataggio..." : "Salva Nuova Password"}
          </BrandedButton>
        </form>
      </div>
    </div>
  );
}
