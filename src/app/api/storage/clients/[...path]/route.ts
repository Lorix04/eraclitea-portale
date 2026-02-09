import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import path from "path";
import fs from "fs/promises";
import { authOptions } from "@/lib/auth";
import { getClientsBaseDir } from "@/lib/client-logo-storage";

export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

export async function GET(
  _request: Request,
  context: { params: { path: string[] } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const segments = context.params.path || [];
  if (segments.length < 2) {
    return NextResponse.json({ error: "Path non valido" }, { status: 400 });
  }

  const clientId = segments[0];
  if (session.user.role !== "ADMIN" && session.user.clientId !== clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseDir = getClientsBaseDir();
  const targetPath = path.resolve(baseDir, ...segments);
  if (!targetPath.startsWith(baseDir)) {
    return NextResponse.json({ error: "Path non valido" }, { status: 400 });
  }

  try {
    const file = await fs.readFile(targetPath);
    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    return new Response(file, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return NextResponse.json({ error: "File non trovato" }, { status: 404 });
  }
}
