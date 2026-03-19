/** Shared constants for material storage — safe to import from client components. */

export const MATERIAL_CATEGORIES: Record<string, string> = {
  slides: "Slide",
  exercises: "Esercitazioni",
  documents: "Documenti",
  regulations: "Normativa",
  templates: "Modelli",
  other: "Altro",
};

export const MATERIAL_ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/zip",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "video/mp4",
  "audio/mpeg",
]);

export const MATERIAL_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
