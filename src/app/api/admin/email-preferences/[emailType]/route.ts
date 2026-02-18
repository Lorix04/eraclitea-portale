import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EMAIL_PREFERENCE_DEFAULTS } from "@/lib/email-preferences";

const updateSchema = z.object({
  isEnabled: z.boolean(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function PUT(
  request: Request,
  { params }: { params: { emailType: string } }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const emailType = params.emailType;
  const fallback = EMAIL_PREFERENCE_DEFAULTS.find(
    (item) => item.emailType === emailType
  );

  if (!fallback) {
    return NextResponse.json(
      { error: "Tipo email non riconosciuto" },
      { status: 404 }
    );
  }

  const updated = await prisma.emailPreference.upsert({
    where: { emailType },
    update: { isEnabled: parsed.data.isEnabled },
    create: {
      ...fallback,
      isEnabled: parsed.data.isEnabled,
    },
  });

  return NextResponse.json(updated);
}
