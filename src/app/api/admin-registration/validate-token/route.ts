import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ valid: false });
    }

    const user = await prisma.user.findFirst({
      where: {
        adminInviteToken: token,
        adminInviteTokenExpiry: { gt: new Date() },
        adminInviteStatus: "pending",
        role: "ADMIN",
      },
      select: {
        id: true,
        email: true,
        adminRole: { select: { name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ valid: false });
    }

    // Mask email for privacy
    const [localPart, domain] = user.email.split("@");
    const maskedEmail = `${localPart.slice(0, 2)}***@${domain}`;

    return NextResponse.json({
      valid: true,
      email: maskedEmail,
      roleName: user.adminRole?.name ?? "Amministratore",
    });
  } catch (error) {
    console.error("[ADMIN_VALIDATE_TOKEN] Error:", error);
    return NextResponse.json({ valid: false });
  }
}
