import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export async function POST(request: Request) {
  try {
    const { token, password, confirmPassword } = await request.json();

    if (!token || !password || !confirmPassword) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Le password non coincidono" }, { status: 400 });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        { error: "La password deve avere almeno 8 caratteri, una maiuscola, un numero e un carattere speciale" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        adminInviteToken: token,
        adminInviteTokenExpiry: { gt: new Date() },
        adminInviteStatus: "pending",
        role: "ADMIN",
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Link non valido o scaduto" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        adminInviteToken: null,
        adminInviteTokenExpiry: null,
        adminInviteStatus: "completed",
      },
    });

    return NextResponse.json({
      success: true,
      email: user.email,
    });
  } catch (error) {
    console.error("[ADMIN_REGISTRATION_COMPLETE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
