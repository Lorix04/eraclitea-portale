"use client";

type Filters = {
  courseId?: string;
  employeeId?: string;
  year?: number;
  status?: "valid" | "expiring" | "expired";
};

type FilterOptions = {
  courses?: Array<{ id: string; title: string }>;
  employees?: Array<{ id: string; nome: string; cognome: string }>;
};

type CertificateFiltersProps = {
  filters: Filters;
  options?: FilterOptions;
  onChange: (filters: Filters) => void;
};

export default function CertificateFilters({
  filters,
  options,
  onChange,
}: CertificateFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <select
        className="rounded-md border bg-background px-3 py-2 text-sm"
        value={filters.courseId ?? ""}
        onChange={(event) =>
          onChange({ ...filters, courseId: event.target.value || undefined })
        }
      >
        <option value="">Tutti i corsi</option>
        {options?.courses?.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
          </option>
        ))}
      </select>

      <select
        className="rounded-md border bg-background px-3 py-2 text-sm"
        value={filters.employeeId ?? ""}
        onChange={(event) =>
          onChange({ ...filters, employeeId: event.target.value || undefined })
        }
      >
        <option value="">Tutti i dipendenti</option>
        {options?.employees?.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.cognome} {employee.nome}
          </option>
        ))}
      </select>

      <input
        type="number"
        className="rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="Anno"
        value={filters.year ?? ""}
        onChange={(event) =>
          onChange({
            ...filters,
            year: event.target.value ? Number(event.target.value) : undefined,
          })
        }
      />

      <select
        className="rounded-md border bg-background px-3 py-2 text-sm"
        value={filters.status ?? ""}
        onChange={(event) =>
          onChange({
            ...filters,
            status: (event.target.value as Filters["status"]) || undefined,
          })
        }
      >
        <option value="">Tutti gli stati</option>
        <option value="valid">Valido</option>
        <option value="expiring">In scadenza</option>
        <option value="expired">Scaduto</option>
      </select>
    </div>
  );
}
