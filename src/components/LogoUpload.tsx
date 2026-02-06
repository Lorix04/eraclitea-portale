"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertCircle, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoUploadProps {
  label: string;
  description?: string;
  currentLogoUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  isUploading?: boolean;
}

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/webp",
  "image/gif",
];

export function LogoUpload({
  label,
  description,
  currentLogoUrl,
  onUpload,
  onRemove,
  isUploading,
}: LogoUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE) {
      return "Il file supera la dimensione massima di 2MB";
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Formato non supportato. Usa PNG, JPG, SVG, WEBP o GIF";
    }
    return null;
  };

  const handleFile = async (file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    await onUpload(file);
  };

  const inputId = `logo-input-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}

      {currentLogoUrl ? (
        <div className="relative inline-block">
          <Image
            src={currentLogoUrl}
            alt={label}
            width={200}
            height={100}
            unoptimized
            className="max-h-[100px] max-w-[200px] rounded border p-2 object-contain"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
          >
            x
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Caricamento...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Trascina qui o clicca per selezionare
              </span>
              <span className="text-xs text-muted-foreground">
                PNG, JPG, SVG, WEBP, GIF (max 2MB)
              </span>
            </div>
          )}
        </div>
      )}

      {error ? (
        <p className="flex items-center gap-1 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

