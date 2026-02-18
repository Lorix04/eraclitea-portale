import fs from "fs/promises";
import path from "path";

const configuredBase = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : process.env.FILE_STORAGE_PATH
    ? path.resolve(process.env.FILE_STORAGE_PATH)
    : path.resolve("storage");

const TICKET_STORAGE_DIR = path.resolve(configuredBase, "tickets");

export function getTicketStorageDir() {
  return TICKET_STORAGE_DIR;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function saveTicketAttachment(file: File, userId: string): Promise<string> {
  const safeUserId = sanitizeFileName(userId);
  const dir = path.resolve(TICKET_STORAGE_DIR, safeUserId);
  await fs.mkdir(dir, { recursive: true });

  const safeName = sanitizeFileName(path.basename(file.name || "allegato"));
  const fileName = `${Date.now()}_${safeName}`;
  const absolutePath = path.resolve(dir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return path.relative(TICKET_STORAGE_DIR, absolutePath).replace(/\\/g, "/");
}

export function resolveTicketAttachmentPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const absolutePath = path.resolve(TICKET_STORAGE_DIR, normalized);
  if (!absolutePath.startsWith(TICKET_STORAGE_DIR)) {
    throw new Error("Invalid attachment path");
  }
  return absolutePath;
}

export async function deleteTicketAttachment(relativePath: string) {
  const absolutePath = resolveTicketAttachmentPath(relativePath);
  await fs.unlink(absolutePath);
}

