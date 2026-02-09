import fs from "fs/promises";
import path from "path";

const configuredBase = process.env.FILE_STORAGE_PATH
  ? path.resolve(process.env.FILE_STORAGE_PATH)
  : null;

const baseRoot = configuredBase
  ? path.basename(configuredBase) === "certificates"
    ? path.dirname(configuredBase)
    : configuredBase
  : path.resolve("storage");

const BASE_DIR = path.join(baseRoot, "clients");

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
};

function getExtension(file: File): string {
  const ext = path.extname(file.name || "").toLowerCase();
  if (ext) return ext;
  return MIME_TO_EXT[file.type] || ".png";
}

export function getClientsBaseDir() {
  return BASE_DIR;
}

export async function saveClientLogo(
  file: File,
  clientId: string,
  type: "main" | "light" | "favicon"
) {
  const dir = path.resolve(BASE_DIR, clientId);
  await fs.mkdir(dir, { recursive: true });

  const ext = getExtension(file);
  let fileName = `logo${ext}`;
  if (type === "light") {
    fileName = `logo-light${ext}`;
  }
  if (type === "favicon") {
    fileName = `favicon${ext}`;
  }
  const filePath = path.join(dir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return {
    fileName,
    relativePath: path.posix.join(clientId, fileName),
    absolutePath: filePath,
  };
}

export async function deleteClientLogo(relativePath?: string | null) {
  if (!relativePath) return;
  const resolved = path.resolve(BASE_DIR, relativePath);
  if (!resolved.startsWith(BASE_DIR)) return;
  try {
    await fs.unlink(resolved);
  } catch {
    // ignore if missing
  }
}
