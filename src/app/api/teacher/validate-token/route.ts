import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { maskEmail } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { valid: false, reason: "Token mancante" },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        inviteTokenExpiry: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { valid: false, reason: "Token non valido" },
        { status: 404 }
      );
    }

    if (teacher.status === "ACTIVE") {
      return NextResponse.json(
        { valid: false, reason: "Account gia attivo. Accedi dal login." },
        { status: 400 }
      );
    }

    if (
      teacher.inviteTokenExpiry &&
      new Date() > new Date(teacher.inviteTokenExpiry)
    ) {
      return NextResponse.json(
        { valid: false, reason: "Token scaduto. Contatta l'amministratore." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      teacherId: teacher.id,
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      teacherEmail: teacher.email,
    });
  } catch {
    return NextResponse.json(
      { valid: false, reason: "Errore interno" },
      { status: 500 }
    );
  }
}
