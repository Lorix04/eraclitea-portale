"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Trash2 } from "lucide-react";
import { formatItalianDate } from "@/lib/date-utils";
import { useDebounce } from "@/hooks/useDebounce";
import DeleteEditionModal from "@/components/admin/DeleteEditionModal";
import EditionStatusBadge from "@/components/EditionStatusBadge";

type EditionRow = {
  id: string;
  editionNumber: number;
  startDate?: string | null;
  endDate?: string | null;
  deadlineRegistry?: string | null;
  status: string;
  clientId?: string | null;
  clientName?: string | null;
  registrationsCount: number;
};

type CourseEditionsTableProps = {
  courseId: string;
  courseName: string;
  editions: EditionRow[];
};

export default function CourseEditionsTable({
  courseId,
  courseName,
  editions,
}: CourseEditionsTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "all");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status && status !== "all") params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [debouncedSearch, status, dateFrom, dateTo, router, pathname]);

  const [rows, setRows] = useState<EditionRow[]>(editions);
  const [deleteTarget, setDeleteTarget] = useState<EditionRow | null>(null);

  useEffect(() => {
    setRows(editions);
  }, [editions]);

  const filteredEditions = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const dateFromValue = dateFrom ? new Date(dateFrom) : null;
    const dateToValue = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;

    return rows.filter((edition) => {
      if (status !== "all" && edition.status !== status) return false;

      if (term) {
        const clientName = edition.clientName?.toLowerCase() ?? "";
        if (!clientName.includes(term)) return false;
      }

      if (dateFromValue || dateToValue) {
        if (!edition.startDate) return false;
        const start = new Date(edition.startDate);
        if (dateFromValue && start < dateFromValue) return false;
        if (dateToValue && start > dateToValue) return false;
      }

      return true;
    });
  }, [rows, debouncedSearch, status, dateFrom, dateTo]);

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="space-y-3 border-b px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Edizioni</h2>
          <span className="text-xs text-muted-foreground">
            {filteredEditions.length} edizioni trovate
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Cerca per cliente..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-[200px] rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
              aria-label="Cerca per cliente"
            />
          </div>
          <select
            className="w-[180px] rounded-md border bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Tutti gli stati</option>
            <option value="DRAFT">Bozza</option>
            <option value="PUBLISHED">Aperto</option>
            <option value="CLOSED">Chiuso</option>
            <option value="ARCHIVED">Archiviato</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Da:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-[150px] rounded-md border bg-background px-3 py-2 text-sm"
              aria-label="Data inizio da"
            />
            <span className="text-sm text-muted-foreground">A:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-[150px] rounded-md border bg-background px-3 py-2 text-sm"
              aria-label="Data inizio a"
            />
          </div>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Edizione</th>
            <th className="px-4 py-3">Inizio</th>
            <th className="px-4 py-3">Fine</th>
            <th className="px-4 py-3">Deadline</th>
            <th className="px-4 py-3">Stato</th>
            <th className="px-4 py-3">Partecipanti</th>
            <th className="px-4 py-3">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {filteredEditions.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="px-4 py-6 text-center text-muted-foreground"
              >
                Nessuna edizione presente.
              </td>
            </tr>
          ) : (
            filteredEditions.map((edition) => (
              <tr key={edition.id} className="border-t">
                <td className="px-4 py-3">{edition.clientName ?? "-"}</td>
                <td className="px-4 py-3">#{edition.editionNumber}</td>
                <td className="px-4 py-3">
                  {edition.startDate
                    ? formatItalianDate(edition.startDate)
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  {edition.endDate ? formatItalianDate(edition.endDate) : "-"}
                </td>
                <td className="px-4 py-3">
                  {edition.deadlineRegistry
                    ? formatItalianDate(edition.deadlineRegistry)
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  <EditionStatusBadge status={edition.status} />
                </td>
                <td className="px-4 py-3">{edition.registrationsCount}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/corsi/${courseId}/edizioni/${edition.id}`}
                    className="text-xs text-primary"
                  >
                    Apri
                  </Link>
                  <button
                    type="button"
                    className="ml-3 inline-flex items-center gap-1 text-xs text-destructive"
                    onClick={() => setDeleteTarget(edition)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Elimina
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {deleteTarget ? (
        <DeleteEditionModal
          editionId={deleteTarget.id}
          courseId={courseId}
          courseName={courseName}
          editionNumber={deleteTarget.editionNumber}
          clientName={deleteTarget.clientName ?? "Cliente"}
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setRows((prev) =>
              prev.filter((edition) => edition.id !== deleteTarget.id)
            );
          }}
        />
      ) : null}
    </div>
  );
}
