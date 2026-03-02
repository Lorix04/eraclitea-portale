import fs from "fs/promises";
import path from "path";

const configuredBase = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : process.env.FILE_STORAGE_PATH
    ? path.resolve(process.env.FILE_STORAGE_PATH)
    : path.resolve("storage");

const TEACHERS_STORAGE_DIR = path.resolve(configuredBase, "teachers");

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function getTeachersStorageDir() {
  return TEACHERS_STORAGE_DIR;
}

export async function saveTeacherCv(file: File, teacherId: string) {
  const safeTeacherId = sanitizeFileName(teacherId);
  const dir = path.resolve(TEACHERS_STORAGE_DIR, safeTeacherId);
  await fs.mkdir(dir, { recursive: true });

  const safeName = sanitizeFileName(path.basename(file.name || "cv"));
  const fileName = `${Date.now()}_${safeName}`;
  const absolutePath = path.resolve(dir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return {
    absolutePath,
    relativePath: path
      .relative(TEACHERS_STORAGE_DIR, absolutePath)
      .replace(/\\/g, "/"),
  };
}

export function resolveTeacherCvPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const absolutePath = path.resolve(TEACHERS_STORAGE_DIR, normalized);
  if (!absolutePath.startsWith(TEACHERS_STORAGE_DIR)) {
    throw new Error("Invalid CV path");
  }
  return absolutePath;
}

export async function readTeacherCv(relativePath: string) {
  const absolutePath = resolveTeacherCvPath(relativePath);
  const buffer = await fs.readFile(absolutePath);
  return { absolutePath, buffer };
}

export async function deleteTeacherCv(relativePath?: string | null) {
  if (!relativePath) return;
  const absolutePath = resolveTeacherCvPath(relativePath);
  try {
    await fs.unlink(absolutePath);
  } catch {
    // ignore missing files
  }
}

