import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { countActiveClientUsers, countClientUsers } from "@/lib/client-users";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const check = await requirePermission("clienti", "edit");
  if (check instanceof NextResponse) return check;

  let body: { maxUsers?: number | null } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const rawMaxUsers = body.maxUsers;
  const maxUsers =
    rawMaxUsers === null || rawMaxUsers === undefined
      ? null
      : Number.isInteger(rawMaxUsers) && rawMaxUsers > 0
        ? rawMaxUsers
        : null;

  if (rawMaxUsers !== null && rawMaxUsers !== undefined && maxUsers === null) {
    return NextResponse.json(
      { error: "Inserisci un limite valido oppure lascia vuoto per illimitato" },
      { status: 400 }
    );
  }

  const usedCount = await countClientUsers(context.params.id);
  const activeCount = await countActiveClientUsers(context.params.id);

  await prisma.client.update({
    where: { id: context.params.id },
    data: { maxUsers },
  });

  const warning =
    maxUsers !== null && usedCount > maxUsers
      ? `Limite salvato sotto gli amministratori associati (${usedCount}/${maxUsers}). I disattivati contano comunque nel limite e bloccheranno solo i nuovi aggiunti.`
      : null;

  return NextResponse.json({
    success: true,
    maxUsers,
    usedCount,
    activeCount,
    warning,
  });
}
