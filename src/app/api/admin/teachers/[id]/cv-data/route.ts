import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkApiPermission(session, "docenti", "view")) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const teacherId = context.params.id;

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true },
  });

  if (!teacher) {
    return NextResponse.json({ error: "Docente non trovato" }, { status: 404 });
  }

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
}
