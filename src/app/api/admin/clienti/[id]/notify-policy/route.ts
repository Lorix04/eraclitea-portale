import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkApiPermission(session, "clienti", "edit")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  let body: { defaultNotifyPolicy?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const validPolicies = ["REFERENT_ONLY", "REFERENT_PLUS", "ALL"];
  if (!body.defaultNotifyPolicy || !validPolicies.includes(body.defaultNotifyPolicy)) {
    return NextResponse.json({ error: "Policy non valida" }, { status: 400 });
  }

  await prisma.client.update({
    where: { id: context.params.id },
    data: { defaultNotifyPolicy: body.defaultNotifyPolicy as any },
  });

  return NextResponse.json({ success: true });
}
