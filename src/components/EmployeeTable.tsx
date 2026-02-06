"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { formatItalianDate } from "@/lib/date-utils";

type EmployeeRow = {
  id: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  email?: string | null;
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
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Cognome</th>
                <th className="px-4 py-3">Codice Fiscale</th>
                <th className="px-4 py-3">Email</th>
                {showClient ? <th className="px-4 py-3">Cliente</th> : null}
                <th className="px-4 py-3">Corsi</th>
                <th className="px-4 py-3">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={showClient ? 7 : 6}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    Caricamento dipendenti...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={showClient ? 7 : 6}
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
                    <td className="px-4 py-3">{employee.codiceFiscale}</td>
                    <td className="px-4 py-3">{employee.email || "-"}</td>
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
                            className="text-destructive"
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

      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="rounded-lg border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Caricamento dipendenti...
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
                      className="text-destructive"
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
