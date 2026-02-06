import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ClipboardCheck, Settings } from "lucide-react";
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
    include: {
      visibility: true,
      visibilityCategories: true,
      categories: true,
      _count: { select: { registrations: true, lessons: true } },
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

  const baseTabClasses =
    "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200";
  const activeTabClasses = "bg-white text-foreground shadow-sm";
  const inactiveTabClasses =
    "text-muted-foreground hover:text-foreground hover:bg-white/60";

  return (
    <div className="space-y-6 rounded-lg border bg-card p-6">
      <div>
        <h1 className="text-xl font-semibold">Modifica corso</h1>
        <p className="mt-2 text-sm text-muted-foreground">Aggiorna corso.</p>
      </div>

      <div className="flex w-fit gap-1 rounded-lg bg-muted/70 p-1">
        <Link
          href={`/admin/corsi/${params.id}/edit`}
          className={`${baseTabClasses} ${activeTabClasses}`}
          aria-current="page"
        >
          <Settings className="h-4 w-4" />
          Dettagli
        </Link>
        <Link
          href={`/admin/corsi/${params.id}/lezioni`}
          className={`${baseTabClasses} ${inactiveTabClasses}`}
        >
          <BookOpen className="h-4 w-4" />
          Lezioni
        </Link>
        <Link
          href={`/admin/corsi/${params.id}/presenze`}
          className={`${baseTabClasses} ${inactiveTabClasses}`}
        >
          <ClipboardCheck className="h-4 w-4" />
          Presenze
        </Link>
      </div>

      <div>
        <CourseForm
          courseId={course.id}
          initialData={initialData}
          deleteStats={{
            registrationsCount: course._count.registrations,
            lessonsCount: course._count.lessons,
          }}
        />
      </div>
    </div>
  );
}
