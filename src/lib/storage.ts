import fs from "fs/promises";
import path from "path";

const BASE_DIR = process.env.FILE_STORAGE_PATH || "/app/uploads";

export async function saveFile(
  file: File,
  clientId: string,
  courseId: string
): Promise<string> {
  const dir = path.resolve(BASE_DIR, clientId, courseId);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${Date.now()}_${file.name}`;
  const filepath = path.join(dir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  return filepath;
}

export async function getFile(filepath: string): Promise<Buffer> {
  return fs.readFile(filepath);
}
