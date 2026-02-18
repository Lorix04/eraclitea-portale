import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EMAIL_PREFERENCE_DEFAULTS } from "@/lib/email-preferences";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

async function ensureEmailPreferencesSeeded() {
  await Promise.all(
    EMAIL_PREFERENCE_DEFAULTS.map((pref) =>
      prisma.emailPreference.upsert({
        where: { emailType: pref.emailType },
        update: {},
        create: pref,
      })
    )
  );
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  await ensureEmailPreferencesSeeded();

  const preferences = await prisma.emailPreference.findMany({
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });

  return NextResponse.json(preferences);
}
