import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveClientContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";
import { resolveTicketAttachmentPath } from "@/lib/ticket-storage";

export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  context: { params: { path: string[] } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const effectiveClient = await getEffectiveClientContext();
  const isAdminView =
    session.user.role === "ADMIN" && !effectiveClient?.isImpersonating;

  const segments = context.params.path ?? [];
  if (!segments.length) {
    return NextResponse.json({ error: "Path non valido" }, { status: 400 });
  }

  const relativePath = segments
    .map((segment) => decodeURIComponent(segment))
    .join("/")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (!relativePath || relativePath.includes("..")) {
    return NextResponse.json({ error: "Path non valido" }, { status: 400 });
  }

  const message = await prisma.ticketMessage.findFirst({
    where: {
      attachments: {
        has: relativePath,
      },
    },
    select: {
      id: true,
      ticket: {
        select: {
          id: true,
          clientId: true,
        },
      },
    },
  });

  if (!message) {
    return NextResponse.json({ error: "Allegato non trovato" }, { status: 404 });
  }

  if (!isAdminView) {
    if (!effectiveClient || message.ticket.clientId !== effectiveClient.userId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
  }

  let absolutePath: string;
  try {
    absolutePath = resolveTicketAttachmentPath(relativePath);
  } catch {
    return NextResponse.json({ error: "Path non valido" }, { status: 400 });
  }

  try {
    const file = await fs.readFile(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[extension] ?? "application/octet-stream";
    const fileName = path.basename(absolutePath);

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File non trovato" }, { status: 404 });
  }
}
