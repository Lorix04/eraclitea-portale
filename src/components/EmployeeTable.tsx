"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { formatItalianDate } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/Skeleton";

type EmployeeRow = {
  id: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  email?: string | null;
  telefono?: string | null;
  dataNascita?: string | Date | null;
  client?: { id: string; ragioneSociale: string };
  _count?: { registrations?: number; certificates?: number };
  coursesCompleted?: number;
};

type EmployeeTableProps = {
  employees: EmployeeRow[];
  showClient?: boolean;
  basePath: string;
  isLoading?: boolean;
  useBranding?: boolean;
  onDelete?: (employee: EmployeeRow) => void;
};

function formatDate(value?: string | Date | null) {
  return formatItalianDate(value) || "-";
}

export default function EmployeeTable({
  employees,
  showClient = false,
  basePath,
  isLoading,
  useBranding = false,
  onDelete,
}: EmployeeTableProps) {
  const router = useRouter();
  const linkClass = useBranding ? "link-brand" : "text-primary";
  const hasDelete = Boolean(onDelete);

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Cognome</th>
                <th className="px-4 py-3">Codice Fiscale</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Telefono</th>
                {showClient ? <th className="px-4 py-3">Cliente</th> : null}
                <th className="px-4 py-3">Corsi</th>
                <th className="px-4 py-3">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, row) => (
                  <tr key={`emp-skel-${row}`} className="border-t">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    {showClient ? (
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-32" />
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-10" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-6 w-16" />
                    </td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={showClient ? 8 : 7}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    Nessun dipendente trovato.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-t cursor-pointer hover:bg-muted/30"
                    onClick={() => router.push(`${basePath}/${employee.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{employee.nome}</td>
                    <td className="px-4 py-3">{employee.cognome}</td>
                    <td className="max-w-[180px] truncate px-4 py-3" title={employee.codiceFiscale}>
                      {employee.codiceFiscale}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3" title={employee.email ?? "-"}>
                      {employee.email || "-"}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3" title={employee.telefono ?? "-"}>
                      {employee.telefono || "-"}
                    </td>
                    {showClient ? (
                      <td className="px-4 py-3">
                        {employee.client?.ragioneSociale || "-"}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      {employee._count?.registrations ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`${basePath}/${employee.id}`}
                          className={linkClass}
                          onClick={(event) => event.stopPropagation()}
                        >
                          Dettaglio
                        </Link>
                        {hasDelete ? (
                          <button
                            type="button"
                            className="inline-flex min-h-[44px] items-center text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDelete?.(employee);
                            }}
                            title="Elimina"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`emp-mobile-skel-${index}`}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-40" />
                <Skeleton className="mt-2 h-3 w-36" />
                <div className="mt-3 flex items-center justify-between">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="rounded-lg border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Nessun dipendente trovato.
          </div>
        ) : (
          employees.map((employee) => (
            <article
              key={employee.id}
              className="space-y-2 rounded-lg border bg-card p-4"
            >
              <div>
                <p className="text-sm font-semibold">
                  {employee.cognome} {employee.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  CF: {employee.codiceFiscale}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Email: {employee.email || "-"}
              </div>
              <div className="text-xs text-muted-foreground">
                Telefono: {employee.telefono || "-"}
              </div>
              {showClient ? (
                <div className="text-xs text-muted-foreground">
                  Cliente: {employee.client?.ragioneSociale || "-"}
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground">
                Data nascita: {formatDate(employee.dataNascita)}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="rounded-full bg-muted px-2 py-1">
                  Corsi: {employee._count?.registrations ?? 0}
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`${basePath}/${employee.id}`}
                    className={linkClass}
                  >
                    Dettaglio
                  </Link>
                  {hasDelete ? (
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] items-center text-destructive"
                      onClick={() => onDelete?.(employee)}
                      title="Elimina"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
