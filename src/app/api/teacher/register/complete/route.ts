import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const completeSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "La password deve avere almeno 8 caratteri")
    .regex(PASSWORD_REGEX, "La password deve contenere almeno una maiuscola, un numero e un carattere speciale"),
  confirmPassword: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = completeSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || "Dati non validi" },
        { status: 400 }
      );
    }

    const { token, password, confirmPassword } = parsed.data;

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Le password non coincidono" },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        inviteTokenExpiry: true,
        userId: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Token non valido" },
        { status: 400 }
      );
    }

    if (teacher.userId) {
      return NextResponse.json(
        { error: "Account gia creato per questo docente" },
        { status: 400 }
      );
    }

    if (
      teacher.inviteTokenExpiry &&
      new Date() > new Date(teacher.inviteTokenExpiry)
    ) {
      return NextResponse.json(
        { error: "Token scaduto. Contatta l'amministratore." },
        { status: 400 }
      );
    }

    if (!teacher.email) {
      return NextResponse.json(
        { error: "Email del docente mancante" },
        { status: 400 }
      );
    }

    // Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: teacher.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Esiste gia un account con questa email" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Check if document was already signed during registration
    const signedDoc = await prisma.teacherSignedDocument.findFirst({
      where: { teacherId: teacher.id, documentType: "ATTO_NOTORIETA" },
    });
    const newStatus = signedDoc ? "ACTIVE" : "ONBOARDING";

    // Create User and link to Teacher in a transaction
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: teacher.email!,
          passwordHash,
          role: "TEACHER",
          isActive: true,
        },
      });

      await tx.teacher.update({
        where: { id: teacher.id },
        data: {
          userId: user.id,
          status: newStatus,
          inviteToken: null,
          inviteTokenExpiry: null,
          active: true,
        },
      });
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("[TEACHER_REGISTER_COMPLETE] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
