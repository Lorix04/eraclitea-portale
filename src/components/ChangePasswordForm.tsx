"use client";

import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { BrandedButton } from "@/components/BrandedButton";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password attuale richiesta"),
    newPassword: z
      .string()
      .min(8, "Minimo 8 caratteri")
      .regex(/[A-Z]/, "Almeno una maiuscola")
      .regex(/[a-z]/, "Almeno una minuscola")
      .regex(/[0-9]/, "Almeno un numero"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ChangePasswordForm() {
  const [form, setForm] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (key: keyof PasswordFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (successVisible) {
      setSuccessVisible(false);
    }
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const parsed = passwordSchema.safeParse(form);
    if (!parsed.success) {
      setSuccessVisible(false);
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[String(issue.path[0])] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Errore durante il cambio password");
      }

      toast.success("Password aggiornata con successo!");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccessVisible(true);
    } catch (error) {
      setSuccessVisible(false);
      toast.error(error instanceof Error ? error.message : "Errore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <FormRequiredLegend />
      <div>
        <FormLabel required>Password attuale</FormLabel>
        <div className="relative mt-1">
          <input
            type={showCurrentPassword ? "text" : "password"}
            className={`w-full rounded-md border bg-background px-3 py-2 pr-10 ${
              errors.currentPassword
                ? "border-red-500 focus-visible:outline-red-500"
                : ""
            }`}
            value={form.currentPassword}
            onChange={(event) => updateField("currentPassword", event.target.value)}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowCurrentPassword((prev) => !prev)}
            aria-label={
              showCurrentPassword ? "Nascondi password attuale" : "Mostra password attuale"
            }
          >
            {showCurrentPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <FormFieldError message={errors.currentPassword} />
      </div>
      <div>
        <FormLabel required>Nuova password</FormLabel>
        <div className="relative mt-1">
          <input
            type={showNewPassword ? "text" : "password"}
            className={`w-full rounded-md border bg-background px-3 py-2 pr-10 ${
              errors.newPassword
                ? "border-red-500 focus-visible:outline-red-500"
                : ""
            }`}
            value={form.newPassword}
            onChange={(event) => updateField("newPassword", event.target.value)}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowNewPassword((prev) => !prev)}
            aria-label={showNewPassword ? "Nascondi nuova password" : "Mostra nuova password"}
          >
            {showNewPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <FormFieldError message={errors.newPassword} />
      </div>
      <div>
        <FormLabel required>Conferma nuova password</FormLabel>
        <div className="relative mt-1">
          <input
            type={showConfirmPassword ? "text" : "password"}
            className={`w-full rounded-md border bg-background px-3 py-2 pr-10 ${
              errors.confirmPassword
                ? "border-red-500 focus-visible:outline-red-500"
                : ""
            }`}
            value={form.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
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
      <BrandedButton type="submit" disabled={loading} className="min-h-[44px]">
        {loading ? "Salvataggio..." : "Cambia password"}
      </BrandedButton>
      {successVisible ? (
        <p className="text-sm text-emerald-700">
          La nuova password sara effettiva immediatamente.
        </p>
      ) : null}
    </form>
  );
}
