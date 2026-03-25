import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveTeacherContext } from "@/lib/impersonate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const teacherId = ctx.teacherId;

    const [
      workExperiences,
      educations,
      languages,
      certifications,
      skills,
      trainingCourses,
      teachingExperiences,
      publications,
    ] = await Promise.all([
      prisma.teacherWorkExperience.findMany({
        where: { teacherId },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.teacherEducation.findMany({
        where: { teacherId },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.teacherLanguage.findMany({
        where: { teacherId },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.teacherCertification.findMany({
        where: { teacherId },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.teacherSkill.findMany({
        where: { teacherId },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.teacherTrainingCourse.findMany({
        where: { teacherId },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.teacherTeachingExperience.findMany({
        where: { teacherId },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.teacherPublication.findMany({
        where: { teacherId },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return NextResponse.json({
      workExperiences,
      educations,
      languages,
      certifications,
      skills,
      trainingCourses,
      teachingExperiences,
      publications,
      stats: {
        totalWorkExperiences: workExperiences.length,
        totalEducations: educations.length,
        totalLanguages: languages.length,
        totalCertifications: certifications.length,
        totalSkills: skills.length,
        totalTrainingCourses: trainingCourses.length,
        totalTeachingExperiences: teachingExperiences.length,
        totalPublications: publications.length,
        isComplete: workExperiences.length >= 1 && educations.length >= 1,
      },
    });
  } catch (error) {
    console.error("[TEACHER_CV_GET] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
