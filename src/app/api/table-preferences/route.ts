import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Opaque key list — keys are validated against the CLIENT-side registry,
// never against a server allow-list. We just bound size to avoid abuse.
const keyArray = z.array(z.string().max(64)).max(50);

const putSchema = z.object({
  tableKey: z.string().min(1).max(64),
  config: z.object({
    order: keyArray,
    hidden: keyArray,
  }),
});

// GET ?tableKey=... → { config } | { config: null }
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const tableKey = new URL(request.url).searchParams.get("tableKey")?.trim();
  if (!tableKey) {
    return NextResponse.json({ error: "tableKey mancante" }, { status: 400 });
  }

  const pref = await prisma.userTablePreference.findUnique({
    where: { userId_tableKey: { userId: session.user.id, tableKey } },
    select: { config: true },
  });

  return NextResponse.json({ config: pref?.config ?? null });
}

// PUT { tableKey, config } → upsert on (userId, tableKey)
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let body: z.infer<typeof putSchema>;
  try {
    body = putSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dati non validi", details: err.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const config = { order: body.config.order, hidden: body.config.hidden };

  await prisma.userTablePreference.upsert({
    where: {
      userId_tableKey: { userId: session.user.id, tableKey: body.tableKey },
    },
    create: { userId: session.user.id, tableKey: body.tableKey, config },
    update: { config },
  });

  return NextResponse.json({ success: true, config });
}

// DELETE ?tableKey=... → reset (back to default)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const tableKey = new URL(request.url).searchParams.get("tableKey")?.trim();
  if (!tableKey) {
    return NextResponse.json({ error: "tableKey mancante" }, { status: 400 });
  }

  await prisma.userTablePreference.deleteMany({
    where: { userId: session.user.id, tableKey },
  });

  return NextResponse.json({ success: true });
}
