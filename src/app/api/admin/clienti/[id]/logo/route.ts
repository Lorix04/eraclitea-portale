import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteClientLogo, saveClientLogo } from "@/lib/client-logo-storage";

export const runtime = "nodejs";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/webp",
  "image/gif",
]);

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("logo");
  const typeRaw = String(formData.get("type") || "main");
  const type = typeRaw === "light" ? "light" : "main";

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formato non supportato" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Il file supera la dimensione massima di 2MB" },
      { status: 400 }
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: context.params.id },
    select: { id: true, logoPath: true, logoLightPath: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
  }

  const saved = await saveClientLogo(file, client.id, type);

  if (type === "light" && client.logoLightPath) {
    if (client.logoLightPath !== saved.relativePath) {
      await deleteClientLogo(client.logoLightPath);
    }
  }
  if (type === "main" && client.logoPath) {
    if (client.logoPath !== saved.relativePath) {
      await deleteClientLogo(client.logoPath);
    }
  }

  const updated = await prisma.client.update({
    where: { id: client.id },
    data:
      type === "light"
        ? { logoLightPath: saved.relativePath, logoLightFileName: file.name }
        : { logoPath: saved.relativePath, logoFileName: file.name },
  });

  return NextResponse.json({
    success: true,
    path: type === "light" ? updated.logoLightPath : updated.logoPath,
  });
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const typeRaw = searchParams.get("type") || "main";
  const type = typeRaw === "light" ? "light" : "main";

  const client = await prisma.client.findUnique({
    where: { id: context.params.id },
    select: { id: true, logoPath: true, logoLightPath: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
  }

  if (type === "light") {
    await deleteClientLogo(client.logoLightPath);
    await prisma.client.update({
      where: { id: client.id },
      data: { logoLightPath: null, logoLightFileName: null },
    });
  } else {
    await deleteClientLogo(client.logoPath);
    await prisma.client.update({
      where: { id: client.id },
      data: { logoPath: null, logoFileName: null },
    });
  }

  return NextResponse.json({ success: true });
}
