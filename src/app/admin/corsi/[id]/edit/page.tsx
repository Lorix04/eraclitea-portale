import Link from "next/link";
import { notFound } from "next/navigation";
import CourseForm from "@/components/CourseForm";
import { prisma } from "@/lib/prisma";

export default async function AdminEditCorsoPage({
  params,
}: {
  params: { id: string };
}) {
  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      visibility: true,
      visibilityCategories: true,
      categories: true,
      _count: { select: { editions: true } },
    },
  });

  if (!course) {
    notFound();
  }

  const initialData = {
    title: course.title,
    description: course.description ?? "",
    categoryIds: course.categories.map((entry) => entry.categoryId),
    durationHours: course.durationHours ?? undefined,
    visibilityType: course.visibilityType,
    visibilityClientIds: course.visibility.map((entry) => entry.clientId),
    visibilityCategoryIds: course.visibilityCategories.map(
      (entry) => entry.categoryId
    ),
  };

  return (
    <div className="space-y-6 rounded-lg border bg-card p-6">
      <div>
        <h1 className="text-xl font-semibold">Modifica corso</h1>
        <p className="mt-2 text-sm text-muted-foreground">Aggiorna corso.</p>
      </div>

      <Link
        href={`/admin/corsi/${params.id}`}
        className="text-sm text-primary underline"
      >
        Torna al dettaglio corso
      </Link>

      <div>
        <CourseForm
          courseId={course.id}
          initialData={initialData}
          deleteStats={{
            editionsCount: course._count.editions,
          }}
        />
      </div>
    </div>
  );
}
