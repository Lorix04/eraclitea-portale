import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CourseEditionsTable from "@/components/admin/CourseEditionsTable";
import VisibilityBadgeList from "@/components/admin/VisibilityBadgeList";
import CourseDetailTabs from "@/components/admin/CourseDetailTabs";

const VISIBILITY_LABELS: Record<string, string> = {
  ALL: "Tutti",
  SELECTED_CLIENTS: "Clienti selezionati",
  BY_CATEGORY: "Area per clienti",
};

export default async function AdminCourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      categories: { include: { category: true } },
      visibility: { include: { client: true } },
      visibilityCategories: { include: { category: true } },
    },
  });

  if (!course) {
    notFound();
  }

  const editions = await prisma.courseEdition.findMany({
    where: { courseId: course.id },
    include: {
      client: { select: { id: true, ragioneSociale: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: [
      { client: { ragioneSociale: "asc" } },
      { editionNumber: "desc" },
    ],
  });

  const editionRows = editions.map((edition) => ({
    id: edition.id,
    editionNumber: edition.editionNumber,
    startDate: edition.startDate?.toISOString() ?? null,
    endDate: edition.endDate?.toISOString() ?? null,
    deadlineRegistry: edition.deadlineRegistry?.toISOString() ?? null,
    status: edition.status,
    clientId: edition.client?.id ?? null,
    clientName: edition.client?.ragioneSociale ?? null,
    registrationsCount: edition._count?.registrations ?? 0,
    notifyPolicy: edition.notifyPolicy,
    notifyExtraUserIds: edition.notifyExtraUserIds,
  }));

  const selectedClients = course.visibility.map((entry) => ({
    id: entry.clientId,
    label: entry.client?.ragioneSociale ?? "Cliente",
  }));
  const selectedCategories = course.visibilityCategories.map((entry) => ({
    id: entry.categoryId,
    label: entry.category?.name ?? "Area",
    color: entry.category?.color ?? "#6B7280",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-lg font-semibold md:text-xl">{course.title}</h1>
          <p className="text-xs text-muted-foreground md:text-sm">
            Dettaglio corso template e relative edizioni.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/corsi/${course.id}/edit`}
            className="rounded-md border px-2 py-1.5 text-xs md:px-4 md:py-2 md:text-sm"
          >
            Modifica corso
          </Link>
          <Link
            href={`/admin/corsi/${course.id}/edizioni/nuova`}
            className="rounded-md bg-primary px-2 py-1.5 text-xs text-primary-foreground md:px-4 md:py-2 md:text-sm"
          >
            Nuova edizione
          </Link>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="font-medium text-foreground">Ore:</span>{" "}
            {course.durationHours ?? "-"}
          </div>
          <div>
            <span className="font-medium text-foreground">Visibilita:</span>{" "}
            {VISIBILITY_LABELS[course.visibilityType] ?? course.visibilityType}
          </div>
        </div>
        {course.visibilityType === "ALL" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Tutti i clienti
          </p>
        ) : null}
        {course.visibilityType === "SELECTED_CLIENTS" &&
        selectedClients.length > 0 ? (
          <div className="mt-2">
            <VisibilityBadgeList items={selectedClients} defaultColor="#2563EB" />
          </div>
        ) : null}
        {course.visibilityType === "BY_CATEGORY" &&
        selectedCategories.length > 0 ? (
          <div className="mt-2">
            <VisibilityBadgeList items={selectedCategories} />
          </div>
        ) : null}
        {course.categories.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {course.categories.map((entry) => (
              <span
                key={entry.categoryId}
                className="rounded-full px-2 py-0.5 text-xs text-white"
                style={{ backgroundColor: entry.category.color ?? "#6B7280" }}
              >
                {entry.category.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <CourseDetailTabs
        courseId={course.id}
        editionsContent={
          <CourseEditionsTable
            courseId={course.id}
            courseName={course.title}
            editions={editionRows}
          />
        }
      />
    </div>
  );
}
