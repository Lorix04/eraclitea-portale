"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { clientSchema } from "@/lib/schemas";
import CategorySelect from "@/components/CategorySelect";

const ClientFormSchema = clientSchema.extend({
  userEmail: z.string().email(),
  password: z.string().min(6).optional(),
  categoryIds: z.array(z.string()).optional(),
});

type ClientFormData = z.infer<typeof ClientFormSchema>;

type ClientFormProps = {
  clientId?: string;
  initialData?: Partial<ClientFormData>;
};

function generatePassword() {
  return `Temp${Math.random().toString(36).slice(-8)}!`;
}

export default function ClientForm({ clientId, initialData }: ClientFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ClientFormData>({
    ragioneSociale: initialData?.ragioneSociale ?? "",
    piva: initialData?.piva ?? "",
    indirizzo: initialData?.indirizzo ?? "",
    referenteNome: initialData?.referenteNome ?? "",
    referenteEmail: initialData?.referenteEmail ?? "",
    telefono: initialData?.telefono ?? "",
    userEmail: initialData?.userEmail ?? "",
    password: initialData?.password ?? "",
    categoryIds: initialData?.categoryIds ?? [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const isEdit = useMemo(() => Boolean(clientId), [clientId]);

  const updateField = (
    key: keyof ClientFormData,
    value: string | string[]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleGeneratePassword = () => {
    const temp = generatePassword();
    setGeneratedPassword(temp);
    updateField("password", temp);
  };

  const handleSubmit = async () => {
    setErrors({});
    const parsed = ClientFormSchema.safeParse(form);
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

    if (!isEdit && !parsed.data.password) {
      setErrors({ password: "Password obbligatoria" });
      return;
    }

    setSaving(true);
    const payload = {
      client: {
        ragioneSociale: parsed.data.ragioneSociale,
        piva: parsed.data.piva,
        indirizzo: parsed.data.indirizzo,
        referenteNome: parsed.data.referenteNome,
        referenteEmail: parsed.data.referenteEmail,
        telefono: parsed.data.telefono,
      },
      user: {
        email: parsed.data.userEmail,
        password: parsed.data.password || undefined,
      },
      categoryIds: parsed.data.categoryIds ?? [],
    };

    const res = await fetch(
      isEdit ? `/api/admin/clienti/${clientId}` : "/api/admin/clienti",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);

    if (!res.ok) {
      setErrors({ form: "Errore durante il salvataggio." });
      return;
    }

    router.push("/admin/clienti");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Ragione sociale
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={form.ragioneSociale}
            onChange={(event) => updateField("ragioneSociale", event.target.value)}
          />
          {errors.ragioneSociale ? (
            <span className="text-xs text-destructive">{errors.ragioneSociale}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Partita IVA
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={form.piva}
            onChange={(event) => updateField("piva", event.target.value)}
          />
          {errors.piva ? (
            <span className="text-xs text-destructive">{errors.piva}</span>
          ) : null}
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        Indirizzo
        <input
          className="rounded-md border bg-background px-3 py-2"
          value={form.indirizzo}
          onChange={(event) => updateField("indirizzo", event.target.value)}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Referente nome
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={form.referenteNome}
            onChange={(event) => updateField("referenteNome", event.target.value)}
          />
          {errors.referenteNome ? (
            <span className="text-xs text-destructive">{errors.referenteNome}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Referente email
          <input
            className="rounded-md border bg-background px-3 py-2"
            value={form.referenteEmail}
            onChange={(event) => updateField("referenteEmail", event.target.value)}
          />
          {errors.referenteEmail ? (
            <span className="text-xs text-destructive">{errors.referenteEmail}</span>
          ) : null}
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        Telefono
        <input
          className="rounded-md border bg-background px-3 py-2"
          value={form.telefono}
          onChange={(event) => updateField("telefono", event.target.value)}
        />
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium">Categorie</p>
        <CategorySelect
          value={form.categoryIds ?? []}
          onChange={(ids) => updateField("categoryIds", ids)}
          placeholder="Nessuna categoria selezionata"
          searchPlaceholder="Cerca categoria"
        />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Utente di accesso</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            Email
            <input
              className="rounded-md border bg-background px-3 py-2"
              value={form.userEmail}
              onChange={(event) => updateField("userEmail", event.target.value)}
            />
            {errors.userEmail ? (
              <span className="text-xs text-destructive">{errors.userEmail}</span>
            ) : null}
          </label>
          <label className="flex flex-col gap-2 text-sm">
            {isEdit ? "Nuova password (opzionale)" : "Password"}
            <input
              type="text"
              className="rounded-md border bg-background px-3 py-2"
              value={form.password ?? ""}
              onChange={(event) => updateField("password", event.target.value)}
            />
            {errors.password ? (
              <span className="text-xs text-destructive">{errors.password}</span>
            ) : null}
          </label>
        </div>
        {isEdit ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              className="rounded-md border px-3 py-1"
              onClick={handleGeneratePassword}
            >
              Genera nuova password
            </button>
            {generatedPassword ? (
              <span className="text-xs text-muted-foreground">
                Password generata: {generatedPassword}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {errors.form ? (
        <p className="text-sm text-destructive">{errors.form}</p>
      ) : null}

      <button
        type="button"
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? "Salvataggio..." : "Salva cliente"}
      </button>
    </div>
  );
}
