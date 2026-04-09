import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-utils";
import { getClientIP, logAudit } from "@/lib/audit";
import { sendAutoEmail } from "@/lib/email-service";
import { buildEmailHtml, emailParagraph } from "@/lib/email-templates";

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

    // Send confirmation email
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, name: true } });
    if (user) {
      void sendAutoEmail({
        emailType: "PASSWORD_CHANGED",
        recipientEmail: user.email,
        recipientName: user.name ?? undefined,
        recipientId: session.user.id,
        subject: "Password modificata - Sapienta",
        html: buildEmailHtml({
          title: "Password Modificata",
          greeting: `Gentile ${user.name || user.email},`,
          bodyHtml: `
            ${emailParagraph("La tua password è stata modificata con successo.")}
            ${emailParagraph("Se non sei stato tu a effettuare questa modifica, contatta immediatamente l'amministratore.")}
          `,
          ctaText: "Accedi al Portale",
          ctaUrl: `${process.env.NEXTAUTH_URL || "https://sapienta.it"}/login`,
        }),
        ignorePreference: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PROFILE_CHANGE_PASSWORD] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
