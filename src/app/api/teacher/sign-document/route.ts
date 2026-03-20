import { NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { generateAttoNotorietaPdf } from "@/lib/teacher-document-pdf";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

const signDocumentSchema = z.object({
  token: z.string().optional(),
  declaration1: z.boolean(),
  declaration2: z.boolean(),
  declaration3: z.boolean(),
  declaration4: z.boolean(),
  declaration5: z.boolean(),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: "Privacy obbligatoria" }),
  }),
  signatureImage: z.string().min(1, "Firma obbligatoria"),
  declarationPlace: z.string().trim().min(1, "Luogo obbligatorio"),
  declarationDate: z.string().min(1, "Data obbligatoria"),
});

const configuredBase = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : process.env.FILE_STORAGE_PATH
    ? path.resolve(process.env.FILE_STORAGE_PATH)
    : path.resolve("storage");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signDocumentSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || "Dati non validi" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // At least one declaration must be checked
    if (
      !data.declaration1 &&
      !data.declaration2 &&
      !data.declaration3 &&
      !data.declaration4 &&
      !data.declaration5
    ) {
      return NextResponse.json(
        { error: "Selezionare almeno una dichiarazione" },
        { status: 400 }
      );
    }

    // Identify teacher: by token (registration) or by session (onboarding)
    let teacherId: string;

    if (data.token) {
      const teacher = await prisma.teacher.findUnique({
        where: { inviteToken: data.token },
        select: { id: true, inviteTokenExpiry: true },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: "Token non valido" },
          { status: 400 }
        );
      }

      if (
        teacher.inviteTokenExpiry &&
        new Date() > new Date(teacher.inviteTokenExpiry)
      ) {
        return NextResponse.json(
          { error: "Token scaduto" },
          { status: 400 }
        );
      }

      teacherId = teacher.id;
    } else {
      const ctx = await getEffectiveTeacherContext();
      if (!ctx) {
        return NextResponse.json(
          { error: "Non autorizzato" },
          { status: 403 }
        );
      }

      teacherId = ctx.teacherId;
    }

    // Load teacher data for PDF
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        birthPlace: true,
        city: true,
        address: true,
        postalCode: true,
        province: true,
        status: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Docente non trovato" },
        { status: 404 }
      );
    }

    // Get IP for audit
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";

    // Generate PDF
    const pdfBuffer = await generateAttoNotorietaPdf({
      teacher: {
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        birthDate: teacher.birthDate?.toISOString() ?? "",
        birthPlace: teacher.birthPlace ?? "",
        city: teacher.city ?? "",
        address: teacher.address ?? "",
        postalCode: teacher.postalCode ?? "",
        province: teacher.province ?? "",
      },
      declarations: [
        data.declaration1,
        data.declaration2,
        data.declaration3,
        data.declaration4,
        data.declaration5,
      ],
      privacyAccepted: data.privacyAccepted,
      signatureImage: data.signatureImage,
      place: data.declarationPlace,
      date: data.declarationDate,
    });

    // Save PDF to storage
    const sanitizedId = teacher.id.replace(/[^a-zA-Z0-9._-]/g, "_");
    const docsDir = path.resolve(
      configuredBase,
      "teachers",
      sanitizedId,
      "documents"
    );
    await fs.mkdir(docsDir, { recursive: true });

    const pdfFileName = `atto-notorieta-${sanitizedId}-${Date.now()}.pdf`;
    const pdfAbsolutePath = path.resolve(docsDir, pdfFileName);
    await fs.writeFile(pdfAbsolutePath, pdfBuffer);

    const pdfRelativePath = path
      .relative(path.resolve(configuredBase, "teachers"), pdfAbsolutePath)
      .replace(/\\/g, "/");

    // Create signed document record
    const signedDoc = await prisma.teacherSignedDocument.create({
      data: {
        teacherId: teacher.id,
        documentType: "ATTO_NOTORIETA",
        declaration1: data.declaration1,
        declaration2: data.declaration2,
        declaration3: data.declaration3,
        declaration4: data.declaration4,
        declaration5: data.declaration5,
        privacyAccepted: data.privacyAccepted,
        signatureImage: data.signatureImage,
        signedAt: new Date(),
        signedFromIp: ip,
        pdfPath: pdfRelativePath,
        pdfOriginalName: pdfFileName,
        declarationPlace: data.declarationPlace,
        declarationDate: new Date(data.declarationDate),
      },
    });

    // Update teacher status to ACTIVE
    await prisma.teacher.update({
      where: { id: teacher.id },
      data: { status: "ACTIVE", active: true },
    });

    return NextResponse.json({
      success: true,
      documentId: signedDoc.id,
    });
  } catch (error) {
    console.error("[TEACHER_SIGN_DOCUMENT] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
