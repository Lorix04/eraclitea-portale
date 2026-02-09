"use client";

import Link from "next/link";
import { formatItalianDate } from "@/lib/date-utils";

type RegistrationRow = {
  id: string;
  status: "INSERTED" | "CONFIRMED" | "TRAINED";
  insertedAt: string | Date;
  courseEdition: {
    id: string;
    editionNumber?: number | null;
    course: {
      id: string;
      title: string;
    };
  };
};

type EmployeeCoursesListProps = {
  registrations: RegistrationRow[];
  getEditionHref?: (registration: RegistrationRow) => string;
  useBranding?: boolean;
};

function statusBadge(status: RegistrationRow["status"]) {
  switch (status) {
    case "TRAINED":
      return { label: "Completato", className: "bg-emerald-100 text-emerald-700" };
    case "CONFIRMED":
      return { label: "Confermato", className: "bg-blue-100 text-blue-700" };
    default:
      return { label: "In compilazione", className: "bg-orange-100 text-orange-700" };
  }
}

export default function EmployeeCoursesList({
  registrations,
  getEditionHref,
  useBranding = false,
}: EmployeeCoursesListProps) {
  const linkClass = useBranding ? "link-brand" : "text-primary";
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3">Corso</th>
            <th className="px-4 py-3">Data iscrizione</th>
            <th className="px-4 py-3">Stato</th>
            <th className="px-4 py-3">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {registrations.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-6 text-center text-muted-foreground"
              >
                Nessun corso associato.
              </td>
            </tr>
          ) : (
            registrations.map((reg) => {
              const badge = statusBadge(reg.status);
              const courseTitle = reg.courseEdition.course?.title ?? "Corso";
              const editionLabel = reg.courseEdition.editionNumber
                ? `Ed. #${reg.courseEdition.editionNumber}`
                : "Edizione";
              const href =
                getEditionHref?.(reg) ?? `/corsi/${reg.courseEdition.id}`;
              return (
                <tr key={reg.id} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    {courseTitle} ({editionLabel})
                  </td>
                  <td className="px-4 py-3">
                    {formatItalianDate(reg.insertedAt) || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={href} className={linkClass}>
                      Vai al corso
                    </Link>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
