import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { getClientIP, logAudit } from "@/lib/audit";

const changePasswordSchema = z.object({
  newPassword: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validation = await validateBody(request, changePasswordSchema);
    if ("error" in validation) {
      return validation.error;
    }

    const newHash = await bcrypt.hash(validation.data.newPassword, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "PASSWORD_CHANGE",
      entityType: "User",
      entityId: session.user.id,
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PROFILE_CHANGE_PASSWORD] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
