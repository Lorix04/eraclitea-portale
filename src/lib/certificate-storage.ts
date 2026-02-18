import fs from "fs/promises";
import path from "path";

const configuredBase = process.env.FILE_STORAGE_PATH
  ? path.resolve(process.env.FILE_STORAGE_PATH)
  : null;
const BASE_DIR = configuredBase
  ? path.basename(configuredBase) === "certificates"
    ? configuredBase
    : path.join(configuredBase, "certificates")
  : path.resolve("storage", "certificates");

export async function saveCertificateFile(
  file: File,
  clientId: string,
  employeeId: string
): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Solo file PDF sono accettati");
  }

  const safeName = path.basename(file.name);
  const dir = path.resolve(BASE_DIR, clientId, employeeId);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${Date.now()}_${safeName}`;
  const filepath = path.join(dir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  return filepath;
}

export async function deleteCertificateFile(filepath: string): Promise<void> {
  await fs.unlink(filepath);
}

export function getCertificatePath(
  clientId: string,
  employeeId: string,
  fileName: string
): string {
  return path.resolve(BASE_DIR, clientId, employeeId, path.basename(fileName));
}
