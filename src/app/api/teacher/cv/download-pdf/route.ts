import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";
import { generateEuropassCvPdf } from "@/lib/teacher-cv-pdf";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const teacherId = ctx.teacherId;

    // Fetch teacher data + all CV sections in parallel
    const [
      teacher,
      workExperiences,
      educations,
      languages,
      certifications,
      skills,
      trainingCourses,
      teachingExperiences,
      publications,
    ] = await Promise.all([
      prisma.teacher.findUnique({
        where: { id: teacherId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          mobile: true,
          address: true,
          city: true,
          postalCode: true,
          province: true,
          birthDate: true,
          birthPlace: true,
          fiscalCode: true,
        },
      }),
      prisma.teacherWorkExperience.findMany({ where: { teacherId }, orderBy: { sortOrder: "asc" } }),
      prisma.teacherEducation.findMany({ where: { teacherId }, orderBy: { sortOrder: "asc" } }),
      prisma.teacherLanguage.findMany({ where: { teacherId }, orderBy: { sortOrder: "asc" } }),
      prisma.teacherCertification.findMany({ where: { teacherId }, orderBy: { sortOrder: "asc" } }),
      prisma.teacherSkill.findMany({ where: { teacherId }, orderBy: { sortOrder: "asc" } }),
      prisma.teacherTrainingCourse.findMany({ where: { teacherId }, orderBy: { sortOrder: "asc" } }),
      prisma.teacherTeachingExperience.findMany({ where: { teacherId }, orderBy: { sortOrder: "asc" } }),
      prisma.teacherPublication.findMany({ where: { teacherId }, orderBy: { sortOrder: "asc" } }),
    ]);

    if (!teacher) {
      return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
    }

    const pdfBytes = await generateEuropassCvPdf({
      teacher,
      workExperiences,
      educations,
      languages,
      certifications,
      skills,
      trainingCourses,
      teachingExperiences,
      publications,
    });

    const fileName = `CV-Europass-${teacher.lastName ?? "Docente"}-${teacher.firstName ?? ""}.pdf`
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_.\-]/g, "");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (error) {
    console.error("[CV_DOWNLOAD_PDF] Error:", error);
    return NextResponse.json(
      { error: "Errore nella generazione del PDF" },
      { status: 500 }
    );
  }
}
