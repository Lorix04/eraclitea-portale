"use client";

import Link from "next/link";
import { formatItalianDate } from "@/lib/date-utils";

type RegistrationRow = {
  id: string;
  status: "INSERTED" | "CONFIRMED" | "TRAINED";
  insertedAt: string | Date;
  course: {
    id: string;
    title: string;
    dateStart?: string | Date | null;
    dateEnd?: string | Date | null;
  };
};

type EmployeeCoursesListProps = {
  registrations: RegistrationRow[];
  courseBasePath: string;
  detailSuffix?: string;
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
  courseBasePath,
  detailSuffix,
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
              return (
                <tr key={reg.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{reg.course.title}</td>
                  <td className="px-4 py-3">
                    {formatItalianDate(reg.insertedAt) || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={
                        detailSuffix
                          ? `${courseBasePath}/${reg.course.id}/${detailSuffix}`
                          : `${courseBasePath}/${reg.course.id}`
                      }
                      className={linkClass}
                    >
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
