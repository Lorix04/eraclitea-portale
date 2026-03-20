import fs from "fs/promises";
import path from "path";

const configuredBase = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : process.env.FILE_STORAGE_PATH
    ? path.resolve(process.env.FILE_STORAGE_PATH)
    : path.resolve("storage");

const MATERIALS_STORAGE_DIR = path.resolve(configuredBase, "materials");

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export {
  MATERIAL_CATEGORIES,
  MATERIAL_ALLOWED_TYPES,
  MATERIAL_MAX_SIZE_BYTES,
} from "./material-storage-shared";

export async function saveMaterial(
  file: File,
  editionId: string
): Promise<{ absolutePath: string; relativePath: string }> {
  const safeEditionId = sanitizeFileName(editionId);
  const dir = path.resolve(MATERIALS_STORAGE_DIR, safeEditionId);
  await fs.mkdir(dir, { recursive: true });

  const safeName = sanitizeFileName(path.basename(file.name || "file"));
  const fileName = `${Date.now()}_${safeName}`;
  const absolutePath = path.resolve(dir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return {
    absolutePath,
    relativePath: path
      .relative(MATERIALS_STORAGE_DIR, absolutePath)
      .replace(/\\/g, "/"),
  };
}

export function resolveMaterialPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const absolutePath = path.resolve(MATERIALS_STORAGE_DIR, normalized);
  if (!absolutePath.startsWith(MATERIALS_STORAGE_DIR)) {
    throw new Error("Invalid material path");
  }
  return absolutePath;
}

export async function readMaterial(relativePath: string) {
  const absolutePath = resolveMaterialPath(relativePath);
  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(`File not found: ${absolutePath} (relative: ${relativePath})`);
  }
  const buffer = await fs.readFile(absolutePath);
  return { absolutePath, buffer };
}

export async function deleteMaterial(relativePath?: string | null) {
  if (!relativePath) return;
  const absolutePath = resolveMaterialPath(relativePath);
  try {
    await fs.unlink(absolutePath);
  } catch {
    // ignore missing files
  }
}
