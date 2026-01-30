import { notFound } from "next/navigation";
import CourseForm from "@/components/CourseForm";
import { prisma } from "@/lib/prisma";
import { formatItalianDate } from "@/lib/date-utils";

export default async function AdminEditCorsoPage({
  params,
}: {
  params: { id: string };
}) {
  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: { visibility: true, visibilityCategories: true, categories: true },
  });

  if (!course) {
    notFound();
  }

  const initialData = {
    title: course.title,
    description: course.description ?? "",
    categoryIds: course.categories.map((entry) => entry.categoryId),
    durationHours: course.durationHours ?? undefined,
    dateStart: course.dateStart ? formatItalianDate(course.dateStart) : "",
    dateEnd: course.dateEnd ? formatItalianDate(course.dateEnd) : "",
    deadlineRegistry: course.deadlineRegistry
      ? formatItalianDate(course.deadlineRegistry)
      : "",
    visibilityType: course.visibilityType,
    visibilityClientIds: course.visibility.map((entry) => entry.clientId),
    visibilityCategoryIds: course.visibilityCategories.map(
      (entry) => entry.categoryId
    ),
    status: course.status,
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <h1 className="text-xl font-semibold">Modifica corso</h1>
      <p className="mt-2 text-sm text-muted-foreground">Aggiorna corso.</p>
      <div className="mt-6">
        <CourseForm courseId={course.id} initialData={initialData} />
      </div>
    </div>
  );
}
