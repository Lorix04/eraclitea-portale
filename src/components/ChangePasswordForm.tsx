"use client";

import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { BrandedButton } from "@/components/BrandedButton";

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
      <div>
        <label className="text-sm">Password attuale</label>
        <input
          type="password"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          value={form.currentPassword}
          onChange={(event) => updateField("currentPassword", event.target.value)}
        />
        {errors.currentPassword ? (
          <p className="text-sm text-destructive">{errors.currentPassword}</p>
        ) : null}
      </div>
      <div>
        <label className="text-sm">Nuova password</label>
        <input
          type="password"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          value={form.newPassword}
          onChange={(event) => updateField("newPassword", event.target.value)}
        />
        {errors.newPassword ? (
          <p className="text-sm text-destructive">{errors.newPassword}</p>
        ) : null}
      </div>
      <div>
        <label className="text-sm">Conferma nuova password</label>
        <input
          type="password"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          value={form.confirmPassword}
          onChange={(event) => updateField("confirmPassword", event.target.value)}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-destructive">{errors.confirmPassword}</p>
        ) : null}
      </div>
      <BrandedButton type="submit" disabled={loading}>
        {loading ? "Salvataggio..." : "Cambia password"}
      </BrandedButton>
    </form>
  );
}
