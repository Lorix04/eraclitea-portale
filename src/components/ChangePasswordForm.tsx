"use client";

import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
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

  const updateField = (key: keyof PasswordFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const parsed = passwordSchema.safeParse(form);
    if (!parsed.success) {
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

      toast.success("Password cambiata con successo");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
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
        <input
          type="password"
          className={`mt-1 w-full rounded-md border bg-background px-3 py-2 ${
            errors.currentPassword
              ? "border-red-500 focus-visible:outline-red-500"
              : ""
          }`}
          value={form.currentPassword}
          onChange={(event) => updateField("currentPassword", event.target.value)}
        />
        <FormFieldError message={errors.currentPassword} />
      </div>
      <div>
        <FormLabel required>Nuova password</FormLabel>
        <input
          type="password"
          className={`mt-1 w-full rounded-md border bg-background px-3 py-2 ${
            errors.newPassword
              ? "border-red-500 focus-visible:outline-red-500"
              : ""
          }`}
          value={form.newPassword}
          onChange={(event) => updateField("newPassword", event.target.value)}
        />
        <FormFieldError message={errors.newPassword} />
      </div>
      <div>
        <FormLabel required>Conferma nuova password</FormLabel>
        <input
          type="password"
          className={`mt-1 w-full rounded-md border bg-background px-3 py-2 ${
            errors.confirmPassword
              ? "border-red-500 focus-visible:outline-red-500"
              : ""
          }`}
          value={form.confirmPassword}
          onChange={(event) => updateField("confirmPassword", event.target.value)}
        />
        <FormFieldError message={errors.confirmPassword} />
      </div>
      <BrandedButton type="submit" disabled={loading}>
        {loading ? "Salvataggio..." : "Cambia password"}
      </BrandedButton>
    </form>
  );
}
