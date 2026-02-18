"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { clientSchema } from "@/lib/schemas";
import CategorySelect from "@/components/CategorySelect";
import { BrandingPreview } from "@/components/BrandingPreview";
import { ColorPicker } from "@/components/ColorPicker";
import { LogoUpload } from "@/components/LogoUpload";
import { toast } from "sonner";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";

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
  faviconPath?: string | null;
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

const FAVICON_ALLOWED_TYPES = new Set([
  "image/png",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);
const FAVICON_MAX_SIZE = 1 * 1024 * 1024;

function validateFaviconFile(file: File): string | null {
  if (!FAVICON_ALLOWED_TYPES.has(file.type)) {
    return "Formato non supportato. Usa .ico, .png o .svg";
  }
  if (file.size > FAVICON_MAX_SIZE) {
    return "Il file supera la dimensione massima di 1MB";
  }
  return null;
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
  const [showPassword, setShowPassword] = useState(false);
  const [logoPath, setLogoPath] = useState<string | null>(
    initialBranding?.logoPath ?? null
  );
  const [logoLightPath, setLogoLightPath] = useState<string | null>(
    initialBranding?.logoLightPath ?? null
  );
  const [faviconPath, setFaviconPath] = useState<string | null>(
    initialBranding?.faviconPath ?? null
  );
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingLight, setUploadingLight] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingLogoLightFile, setPendingLogoLightFile] = useState<File | null>(
    null
  );
  const [pendingFaviconFile, setPendingFaviconFile] = useState<File | null>(
    null
  );
  const [pendingLogoPreview, setPendingLogoPreview] = useState<string | null>(
    null
  );
  const [pendingLogoLightPreview, setPendingLogoLightPreview] = useState<
    string | null
  >(null);
  const [pendingFaviconPreview, setPendingFaviconPreview] = useState<
    string | null
  >(null);
  const [faviconError, setFaviconError] = useState<string | null>(null);

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
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
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

  const handleFaviconUpload = async (file: File) => {
    if (!clientId) return;
    const validation = validateFaviconFile(file);
    if (validation) {
      setFaviconError(validation);
      return;
    }
    setFaviconError(null);
    setUploadingFavicon(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      formData.append("type", "favicon");

      const res = await fetch(`/api/admin/clienti/${clientId}/logo`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setFaviconError(
          payload?.error || "Errore durante il caricamento della favicon."
        );
        return;
      }

      const data = await res.json();
      setFaviconPath(data.path ?? null);
    } catch {
      setFaviconError("Errore durante il caricamento della favicon.");
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleFaviconRemove = async () => {
    if (!clientId) return;
    const res = await fetch(
      `/api/admin/clienti/${clientId}/logo?type=favicon`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      setFaviconError("Errore durante la rimozione della favicon.");
      return;
    }
    setFaviconPath(null);
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

  const handlePendingFaviconUpload = (file: File) => {
    const validation = validateFaviconFile(file);
    if (validation) {
      setFaviconError(validation);
      return;
    }
    setFaviconError(null);
    setPendingFaviconFile(file);
    setPendingFaviconPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handlePendingFaviconRemove = () => {
    setPendingFaviconFile(null);
    setPendingFaviconPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const uploadLogoAfterCreate = async (
    targetClientId: string,
    file: File,
    type: "main" | "light" | "favicon"
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
      if (
        createdId &&
        (pendingLogoFile || pendingLogoLightFile || pendingFaviconFile)
      ) {
        try {
          if (pendingLogoFile) {
            await uploadLogoAfterCreate(createdId, pendingLogoFile, "main");
          }
          if (pendingLogoLightFile) {
            await uploadLogoAfterCreate(createdId, pendingLogoLightFile, "light");
          }
          if (pendingFaviconFile) {
            await uploadLogoAfterCreate(createdId, pendingFaviconFile, "favicon");
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
      if (pendingFaviconPreview) URL.revokeObjectURL(pendingFaviconPreview);
    };
  }, [pendingLogoPreview, pendingLogoLightPreview, pendingFaviconPreview]);

  const logoUrl = buildLogoUrl(logoPath);
  const logoLightUrl = buildLogoUrl(logoLightPath);
  const faviconUrl = buildLogoUrl(faviconPath);

  return (
    <div className="space-y-6">
      <FormRequiredLegend />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FormLabel required>Ragione sociale</FormLabel>
          <input
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.ragioneSociale
                ? "border-red-500 focus-visible:outline-red-500"
                : ""
            }`}
            value={form.ragioneSociale}
            onChange={(event) => updateField("ragioneSociale", event.target.value)}
          />
          <FormFieldError message={errors.ragioneSociale} />
        </div>
        <div className="flex flex-col gap-2">
          <FormLabel required>Partita IVA</FormLabel>
          <input
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.piva ? "border-red-500 focus-visible:outline-red-500" : ""
            }`}
            value={form.piva}
            onChange={(event) => updateField("piva", event.target.value)}
          />
          <FormFieldError message={errors.piva} />
        </div>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <FormLabel>Indirizzo</FormLabel>
        <input
          className="rounded-md border bg-background px-3 py-2"
          value={form.indirizzo}
          onChange={(event) => updateField("indirizzo", event.target.value)}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FormLabel required>Referente nome</FormLabel>
          <input
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.referenteNome
                ? "border-red-500 focus-visible:outline-red-500"
                : ""
            }`}
            value={form.referenteNome}
            onChange={(event) => updateField("referenteNome", event.target.value)}
          />
          <FormFieldError message={errors.referenteNome} />
        </div>
        <div className="flex flex-col gap-2">
          <FormLabel required>Referente email</FormLabel>
          <input
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.referenteEmail
                ? "border-red-500 focus-visible:outline-red-500"
                : ""
            }`}
            value={form.referenteEmail}
            onChange={(event) => updateField("referenteEmail", event.target.value)}
          />
          <FormFieldError message={errors.referenteEmail} />
        </div>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <FormLabel>Telefono</FormLabel>
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
          <div className="flex flex-col gap-2">
            <FormLabel required>Email</FormLabel>
            <input
              className={`rounded-md border bg-background px-3 py-2 ${
                errors.userEmail
                  ? "border-red-500 focus-visible:outline-red-500"
                  : ""
              }`}
              value={form.userEmail}
              onChange={(event) => updateField("userEmail", event.target.value)}
            />
            <FormFieldError message={errors.userEmail} />
          </div>
          <div className="flex flex-col gap-2">
            <FormLabel required={!isEdit}>
              {isEdit ? "Nuova password (opzionale)" : "Password"}
            </FormLabel>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={`w-full rounded-md border bg-background px-3 py-2 pr-10 ${
                  errors.password
                    ? "border-red-500 focus-visible:outline-red-500"
                    : ""
                }`}
                placeholder={isEdit ? "Lascia vuoto per non modificare" : undefined}
                value={form.password ?? ""}
                onChange={(event) => updateField("password", event.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <FormFieldError message={errors.password} />
          </div>
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
            onRemove={async () =>
              isEdit ? await handleLogoRemove("main") : handlePendingLogoRemove("main")
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
            onRemove={async () =>
              isEdit ? await handleLogoRemove("light") : handlePendingLogoRemove("light")
            }
            isUploading={isEdit ? uploadingLight : false}
          />
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Favicon (icona tab browser)</p>
            <p className="text-xs text-muted-foreground">
              Carica l&apos;icona che apparir&agrave; nella tab del browser per questo cliente.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {((isEdit && faviconUrl) || (!isEdit && pendingFaviconPreview)) ? (
              <div className="flex items-center gap-3">
                <Image
                  src={isEdit ? (faviconUrl as string) : (pendingFaviconPreview as string)}
                  alt="Anteprima favicon"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded border bg-background object-contain"
                />
                <button
                  type="button"
                  className="rounded-md border px-3 py-1 text-xs"
                  onClick={() =>
                    isEdit ? handleFaviconRemove() : handlePendingFaviconRemove()
                  }
                >
                  Rimuovi
                </button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                Nessuna favicon caricata.
              </span>
            )}

            <label className="flex flex-col gap-2 text-xs">
              <span className="text-muted-foreground">
                Formati supportati: .ico, .png, .svg (max 1MB)
              </span>
              <input
                type="file"
                accept=".ico,image/x-icon,image/png,image/svg+xml"
                className="text-xs"
                disabled={uploadingFavicon}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (isEdit) {
                    handleFaviconUpload(file);
                  } else {
                    handlePendingFaviconUpload(file);
                  }
                }}
              />
            </label>
          </div>
          {faviconError ? (
            <p className="text-xs text-destructive">{faviconError}</p>
          ) : null}
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
