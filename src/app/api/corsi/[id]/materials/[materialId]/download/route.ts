import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readMaterial } from "@/lib/material-storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: { id: string; materialId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const material = await prisma.courseMaterial.findFirst({
    where: { id: context.params.materialId, courseId: context.params.id },
  });
  if (!material) {
    return NextResponse.json({ error: "Materiale non trovato" }, { status: 404 });
  }

  try {
    const { buffer } = await readMaterial(material.filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": material.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(material.fileName)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "File non trovato" }, { status: 404 });
  }
}
