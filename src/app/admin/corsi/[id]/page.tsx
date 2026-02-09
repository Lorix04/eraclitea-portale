import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CourseEditionsTable from "@/components/admin/CourseEditionsTable";
import VisibilityBadgeList from "@/components/admin/VisibilityBadgeList";

const VISIBILITY_LABELS: Record<string, string> = {
  ALL: "Tutti",
  SELECTED_CLIENTS: "Clienti selezionati",
  BY_CATEGORY: "Categoria per clienti",
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
  }));

  const selectedClients = course.visibility.map((entry) => ({
    id: entry.clientId,
    label: entry.client?.ragioneSociale ?? "Cliente",
  }));
  const selectedCategories = course.visibilityCategories.map((entry) => ({
    id: entry.categoryId,
    label: entry.category?.name ?? "Categoria",
    color: entry.category?.color ?? "#6B7280",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{course.title}</h1>
          <p className="text-sm text-muted-foreground">
            Dettaglio corso template e relative edizioni.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/corsi/${course.id}/edit`}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Modifica corso
          </Link>
          <Link
            href={`/admin/corsi/${course.id}/edizioni/nuova`}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
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

      <CourseEditionsTable
        courseId={course.id}
        courseName={course.title}
        editions={editionRows}
      />
    </div>
  );
}
