"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { clientSchema } from "@/lib/schemas";
import CategorySelect from "@/components/CategorySelect";
import { BrandingPreview } from "@/components/BrandingPreview";
import { ColorPicker } from "@/components/ColorPicker";
import { LogoUpload } from "@/components/LogoUpload";
import { toast } from "sonner";

const COLOR_PALETTES = [
  {
    id: "blue",
    name: "Blu professionale",
    primary: "#3B82F6",
    secondary: "#60A5FA",
    sidebarBg: "#1E3A5F",
    sidebarText: "#FFFFFF",
  },
  {
    id: "green",
    name: "Verde natura",
    primary: "#10B981",
    secondary: "#34D399",
    sidebarBg: "#064E3B",
    sidebarText: "#FFFFFF",
  },
  {
    id: "red",
    name: "Rosso energia",
    primary: "#EF4444",
    secondary: "#F87171",
    sidebarBg: "#7F1D1D",
    sidebarText: "#FFFFFF",
  },
  {
    id: "purple",
    name: "Viola elegante",
    primary: "#8B5CF6",
    secondary: "#A78BFA",
    sidebarBg: "#4C1D95",
    sidebarText: "#FFFFFF",
  },
  {
    id: "orange",
    name: "Arancio dinamico",
    primary: "#F97316",
    secondary: "#FB923C",
    sidebarBg: "#7C2D12",
    sidebarText: "#FFFFFF",
  },
  {
    id: "gray",
    name: "Grigio minimal",
    primary: "#6B7280",
    secondary: "#9CA3AF",
    sidebarBg: "#1F2937",
    sidebarText: "#FFFFFF",
  },
  {
    id: "custom",
    name: "Personalizzato",
    primary: "",
    secondary: "",
    sidebarBg: "",
    sidebarText: "",
  },
] as const;

type PaletteId = (typeof COLOR_PALETTES)[number]["id"];

type BrandingInitialData = {
  logoPath?: string | null;
  logoLightPath?: string | null;
};

const ClientFormSchema = clientSchema.extend({
  userEmail: z.string().email(),
  password: z.string().min(6).optional().or(z.literal("")),
  categoryIds: z.array(z.string()).optional(),
});

type ClientFormData = z.infer<typeof ClientFormSchema>;

type ClientFormProps = {
  clientId?: string;
  initialData?: Partial<ClientFormData>;
  initialBranding?: BrandingInitialData;
};

function generatePassword() {
  return `Temp${Math.random().toString(36).slice(-8)}!`;
}

function normalizePath(pathValue?: string | null) {
  if (!pathValue) return null;
  return pathValue.replace(/\\/g, "/");
}

function buildLogoUrl(pathValue?: string | null) {
  const normalized = normalizePath(pathValue);
  return normalized ? `/api/storage/clients/${normalized}` : null;
}

export default function ClientForm({
  clientId,
  initialData,
  initialBranding,
}: ClientFormProps) {
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
    primaryColor: initialData?.primaryColor ?? "",
    secondaryColor: initialData?.secondaryColor ?? "",
    sidebarBgColor: initialData?.sidebarBgColor ?? "",
    sidebarTextColor: initialData?.sidebarTextColor ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(
    initialBranding?.logoPath ?? null
  );
  const [logoLightPath, setLogoLightPath] = useState<string | null>(
    initialBranding?.logoLightPath ?? null
  );
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingLight, setUploadingLight] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingLogoLightFile, setPendingLogoLightFile] = useState<File | null>(
    null
  );
  const [pendingLogoPreview, setPendingLogoPreview] = useState<string | null>(
    null
  );
  const [pendingLogoLightPreview, setPendingLogoLightPreview] = useState<
    string | null
  >(null);

  const isEdit = useMemo(() => Boolean(clientId), [clientId]);

  const initialPalette = useMemo<PaletteId>(() => {
    const match = COLOR_PALETTES.find(
      (palette) =>
        palette.id !== "custom" &&
        palette.primary === (initialData?.primaryColor ?? "") &&
        palette.secondary === (initialData?.secondaryColor ?? "") &&
        palette.sidebarBg === (initialData?.sidebarBgColor ?? "") &&
        palette.sidebarText === (initialData?.sidebarTextColor ?? "")
    );
    return match?.id ?? "custom";
  }, [
    initialData?.primaryColor,
    initialData?.secondaryColor,
    initialData?.sidebarBgColor,
    initialData?.sidebarTextColor,
  ]);

  const [selectedPalette, setSelectedPalette] = useState<PaletteId>(
    initialPalette
  );

  const updateField = (
    key: keyof ClientFormData,
    value: string | string[]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleColorChange = (
    key: "primaryColor" | "secondaryColor" | "sidebarBgColor" | "sidebarTextColor",
    value: string
  ) => {
    setSelectedPalette("custom");
    updateField(key, value);
  };

  const handlePaletteSelect = (paletteId: PaletteId) => {
    setSelectedPalette(paletteId);
    if (paletteId === "custom") return;
    const palette = COLOR_PALETTES.find((item) => item.id === paletteId);
    if (!palette) return;
    setForm((prev) => ({
      ...prev,
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      sidebarBgColor: palette.sidebarBg,
      sidebarTextColor: palette.sidebarText,
    }));
  };

  const handleGeneratePassword = () => {
    const temp = generatePassword();
    setGeneratedPassword(temp);
    updateField("password", temp);
  };

  const handleLogoUpload = async (file: File, type: "main" | "light") => {
    if (!clientId) return;
    try {
      setErrors({});
      if (type === "main") setUploadingMain(true);
      if (type === "light") setUploadingLight(true);

      const formData = new FormData();
      formData.append("logo", file);
      formData.append("type", type);

      const res = await fetch(`/api/admin/clienti/${clientId}/logo`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setErrors({
          form: payload?.error || "Errore durante il caricamento del logo.",
        });
        return;
      }

      const data = await res.json();
      if (type === "main") {
        setLogoPath(data.path ?? null);
      } else {
        setLogoLightPath(data.path ?? null);
      }
    } catch {
      setErrors({ form: "Errore durante il caricamento del logo." });
    } finally {
      if (type === "main") setUploadingMain(false);
      if (type === "light") setUploadingLight(false);
    }
  };

  const handleLogoRemove = async (type: "main" | "light") => {
    if (!clientId) return;
    const res = await fetch(
      `/api/admin/clienti/${clientId}/logo?type=${type}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      setErrors({ form: "Errore durante la rimozione del logo." });
      return;
    }
    if (type === "main") setLogoPath(null);
    if (type === "light") setLogoLightPath(null);
  };

  const handlePendingLogoUpload = async (
    file: File,
    type: "main" | "light"
  ) => {
    if (type === "main") {
      setPendingLogoFile(file);
      setPendingLogoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    } else {
      setPendingLogoLightFile(file);
      setPendingLogoLightPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    }
  };

  const handlePendingLogoRemove = (type: "main" | "light") => {
    if (type === "main") {
      setPendingLogoFile(null);
      setPendingLogoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    setPendingLogoLightFile(null);
    setPendingLogoLightPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const uploadLogoAfterCreate = async (
    targetClientId: string,
    file: File,
    type: "main" | "light"
  ) => {
    const formData = new FormData();
    formData.append("logo", file);
    formData.append("type", type);

    const res = await fetch(`/api/admin/clienti/${targetClientId}/logo`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(
        payload?.error || "Errore durante il caricamento del logo."
      );
    }
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
        primaryColor: parsed.data.primaryColor,
        secondaryColor: parsed.data.secondaryColor,
        sidebarBgColor: parsed.data.sidebarBgColor,
        sidebarTextColor: parsed.data.sidebarTextColor,
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
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setErrors({ form: data?.error || "Errore durante il salvataggio." });
      return;
    }

    if (!isEdit) {
      const createdId = data?.data?.id as string | undefined;
      if (createdId && (pendingLogoFile || pendingLogoLightFile)) {
        try {
          if (pendingLogoFile) {
            await uploadLogoAfterCreate(createdId, pendingLogoFile, "main");
          }
          if (pendingLogoLightFile) {
            await uploadLogoAfterCreate(createdId, pendingLogoLightFile, "light");
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Errore durante il caricamento del logo.";
          toast.error(message);
        }
      }
    }

    router.push("/admin/clienti");
  };

  useEffect(() => {
    return () => {
      if (pendingLogoPreview) URL.revokeObjectURL(pendingLogoPreview);
      if (pendingLogoLightPreview) URL.revokeObjectURL(pendingLogoLightPreview);
    };
  }, [pendingLogoPreview, pendingLogoLightPreview]);

  const logoUrl = buildLogoUrl(logoPath);
  const logoLightUrl = buildLogoUrl(logoLightPath);

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
              type="password"
              className="rounded-md border bg-background px-3 py-2"
              placeholder={isEdit ? "Lascia vuoto per non modificare" : undefined}
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

      <div className="rounded-lg border bg-card p-4 space-y-6">
        <div>
          <p className="text-sm font-medium">Personalizzazione grafica</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Personalizza colori e logo visibili ai clienti.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium">Palette predefinite</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {COLOR_PALETTES.map((palette) => (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => handlePaletteSelect(palette.id)}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                      selectedPalette === palette.id
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/20 hover:border-primary/40"
                    }`}
                  >
                    <span>{palette.name}</span>
                    <span className="flex items-center gap-1">
                      <span
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: palette.primary || "#E5E7EB" }}
                      />
                      <span
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: palette.secondary || "#E5E7EB" }}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <ColorPicker
                  label="Colore primario"
                  value={form.primaryColor}
                  onChange={(value) => handleColorChange("primaryColor", value)}
                  placeholder="#3B82F6"
                />
                {errors.primaryColor ? (
                  <span className="text-xs text-destructive">
                    {errors.primaryColor}
                  </span>
                ) : null}
              </div>
              <div>
                <ColorPicker
                  label="Colore secondario"
                  value={form.secondaryColor}
                  onChange={(value) => handleColorChange("secondaryColor", value)}
                  placeholder="#60A5FA"
                />
                {errors.secondaryColor ? (
                  <span className="text-xs text-destructive">
                    {errors.secondaryColor}
                  </span>
                ) : null}
              </div>
              <div>
                <ColorPicker
                  label="Sfondo sidebar"
                  value={form.sidebarBgColor}
                  onChange={(value) => handleColorChange("sidebarBgColor", value)}
                  placeholder="#1F2937"
                />
                {errors.sidebarBgColor ? (
                  <span className="text-xs text-destructive">
                    {errors.sidebarBgColor}
                  </span>
                ) : null}
              </div>
              <div>
                <ColorPicker
                  label="Testo sidebar"
                  value={form.sidebarTextColor}
                  onChange={(value) => handleColorChange("sidebarTextColor", value)}
                  placeholder="#FFFFFF"
                />
                {errors.sidebarTextColor ? (
                  <span className="text-xs text-destructive">
                    {errors.sidebarTextColor}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <BrandingPreview
              clientName={form.ragioneSociale}
              primaryColor={form.primaryColor || null}
              secondaryColor={form.secondaryColor || null}
              sidebarBgColor={form.sidebarBgColor || null}
              sidebarTextColor={form.sidebarTextColor || null}
              logoUrl={logoUrl}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <LogoUpload
            label="Logo principale"
            description="Per sfondi chiari"
            currentLogoUrl={isEdit ? logoUrl : pendingLogoPreview}
            onUpload={(file) =>
              isEdit ? handleLogoUpload(file, "main") : handlePendingLogoUpload(file, "main")
            }
            onRemove={() =>
              isEdit ? handleLogoRemove("main") : handlePendingLogoRemove("main")
            }
            isUploading={isEdit ? uploadingMain : false}
          />
          <LogoUpload
            label="Logo versione chiara"
            description="Per sfondi scuri"
            currentLogoUrl={isEdit ? logoLightUrl : pendingLogoLightPreview}
            onUpload={(file) =>
              isEdit ? handleLogoUpload(file, "light") : handlePendingLogoUpload(file, "light")
            }
            onRemove={() =>
              isEdit ? handleLogoRemove("light") : handlePendingLogoRemove("light")
            }
            isUploading={isEdit ? uploadingLight : false}
          />
        </div>
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
