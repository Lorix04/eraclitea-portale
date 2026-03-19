import { timingSafeEqual } from "crypto";

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Returns false if strings have different lengths (without leaking length info timing).
 */
export function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against itself to maintain constant-time behavior
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Password policy regex: min 8 chars, 1 uppercase, 1 number, 1 special character.
 */
export const PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

/**
 * Validate file content by checking magic bytes against declared MIME type.
 * Returns true if the file's magic bytes match the expected type, or if
 * the type has no known magic bytes (permissive for unknown types).
 */
export async function validateFileContent(
  file: File,
  declaredMimeType: string
): Promise<boolean> {
  const header = Buffer.from(await file.slice(0, 8).arrayBuffer());

  const MAGIC_BYTES: Record<string, Buffer[]> = {
    "application/pdf": [Buffer.from("%PDF")],
    "image/png": [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
    "image/jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
    "image/gif": [Buffer.from("GIF87a"), Buffer.from("GIF89a")],
    "application/zip": [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
    // DOCX, PPTX, XLSX are ZIP files
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    ],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    ],
  };

  const expectedBytes = MAGIC_BYTES[declaredMimeType];
  if (!expectedBytes) return true; // No known magic bytes — allow

  return expectedBytes.some((magic) =>
    header.subarray(0, magic.length).equals(magic)
  );
}

/**
 * Mask an email address for display: a***@domain.com
 */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  return `${user[0]}***@${domain}`;
}
