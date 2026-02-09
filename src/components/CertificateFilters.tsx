"use client";

type Filters = {
  courseEditionId?: string;
  employeeId?: string;
  year?: number;
  status?: "valid" | "expiring" | "expired";
};

type FilterOptions = {
  editions?: Array<{ id: string; label: string }>;
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
        value={filters.courseEditionId ?? ""}
        onChange={(event) =>
          onChange({
            ...filters,
            courseEditionId: event.target.value || undefined,
          })
        }
      >
        <option value="">Tutte le edizioni</option>
        {options?.editions?.map((edition) => (
          <option key={edition.id} value={edition.id}>
            {edition.label}
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
