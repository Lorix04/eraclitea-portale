"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { formatItalianDate } from "@/lib/date-utils";
import type { EmployeeFormRow } from "@/types";

type EmployeeItem = {
  id: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  sesso?: string | null;
  dataNascita?: string | Date | null;
  luogoNascita?: string | null;
  email?: string | null;
  telefono?: string | null;
  cellulare?: string | null;
  indirizzo?: string | null;
  comuneResidenza?: string | null;
  cap?: string | null;
  mansione?: string | null;
  note?: string | null;
};

type AddExistingEmployeesModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (employees: EmployeeFormRow[]) => void;
  clientId: string;
  courseEditionId: string;
  currentRows: EmployeeFormRow[];
};

function normalizeCF(value?: string | null) {
  return (value ?? "").trim().toUpperCase();
}

function mapToRow(employee: EmployeeItem): EmployeeFormRow {
  return {
    nome: employee.nome,
    cognome: employee.cognome,
    codiceFiscale: employee.codiceFiscale,
    sesso: employee.sesso ?? "",
    dataNascita: employee.dataNascita
      ? formatItalianDate(employee.dataNascita)
      : "",
    luogoNascita: employee.luogoNascita ?? "",
    email: employee.email ?? "",
    telefono: employee.telefono ?? "",
    cellulare: employee.cellulare ?? "",
    indirizzo: employee.indirizzo ?? "",
    comuneResidenza: employee.comuneResidenza ?? "",
    cap: employee.cap ?? "",
    mansione: employee.mansione ?? "",
    note: employee.note ?? "",
  };
}

export default function AddExistingEmployeesModal({
  open,
  onClose,
  onAdd,
  clientId,
  courseEditionId,
  currentRows,
}: AddExistingEmployeesModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const employeesQuery = useEmployees({
    clientId,
    excludeEditionId: courseEditionId,
    limit: 500,
    sortBy: "cognome",
    sortOrder: "asc",
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelectedIds(new Set());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const currentCFs = useMemo(
    () =>
      new Set(
        currentRows
          .map((row) => normalizeCF(row.codiceFiscale))
          .filter((value) => value.length > 0)
      ),
    [currentRows]
  );

  const employees = useMemo(
    () => (employeesQuery.data?.data ?? []) as EmployeeItem[],
    [employeesQuery.data]
  );

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((employee) => {
      const fullName = `${employee.nome} ${employee.cognome}`.toLowerCase();
      return (
        fullName.includes(q) ||
        employee.nome.toLowerCase().includes(q) ||
        employee.cognome.toLowerCase().includes(q) ||
        employee.codiceFiscale.toLowerCase().includes(q)
      );
    });
  }, [employees, search]);

  const selectableEmployees = useMemo(
    () =>
      filteredEmployees.filter(
        (employee) => !currentCFs.has(normalizeCF(employee.codiceFiscale))
      ),
    [filteredEmployees, currentCFs]
  );

  const alreadyInSheetEmployees = useMemo(
    () =>
      filteredEmployees.filter((employee) =>
        currentCFs.has(normalizeCF(employee.codiceFiscale))
      ),
    [filteredEmployees, currentCFs]
  );

  const allSelectableIds = useMemo(
    () => selectableEmployees.map((employee) => employee.id),
    [selectableEmployees]
  );

  const allSelected =
    allSelectableIds.length > 0 &&
    allSelectableIds.every((id) => selectedIds.has(id));

  const selectedCount = selectedIds.size;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(allSelectableIds));
  };

  const toggleSelect = (employeeId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };

  const handleAdd = () => {
    if (selectedIds.size === 0) return;
    const selectedRows = employees
      .filter((employee) => selectedIds.has(employee.id))
      .map(mapToRow);
    onAdd(selectedRows);
    setSelectedIds(new Set());
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 p-2 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="flex h-[92vh] w-full flex-col rounded-lg bg-card shadow-lg sm:h-auto sm:max-h-[85vh] sm:max-w-2xl"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-base font-semibold">
              Aggiungi dipendenti dall&apos;elenco
            </h2>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              onClick={onClose}
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cerca per nome, cognome o CF..."
                className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
              />
            </div>

            {!employeesQuery.isLoading ? (
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={allSelectableIds.length === 0}
                />
                <span>Seleziona tutti ({allSelectableIds.length} disponibili)</span>
              </label>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {employeesQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Caricamento dipendenti...
              </div>
            ) : employeesQuery.isError ? (
              <p className="text-sm text-destructive">
                Errore nel caricamento dei dipendenti.
              </p>
            ) : (
              <div className="space-y-3">
                {selectableEmployees.length === 0 &&
                alreadyInSheetEmployees.length === 0 ? (
                  employees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nessun dipendente disponibile. I dipendenti verranno creati
                      automaticamente quando salvi le anagrafiche.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nessun risultato per la ricerca corrente.
                    </p>
                  )
                ) : null}

                {selectableEmployees.map((employee) => (
                  <label
                    key={employee.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(employee.id)}
                      onChange={() => toggleSelect(employee.id)}
                    />
                    <div className="text-sm">
                      <p className="font-medium">
                        {employee.nome} {employee.cognome} - {employee.codiceFiscale}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Email: {employee.email || "-"}
                      </p>
                    </div>
                  </label>
                ))}

                {alreadyInSheetEmployees.length > 0 ? (
                  <div className="pt-2">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Gia nel foglio
                    </p>
                    <div className="space-y-2">
                      {alreadyInSheetEmployees.map((employee) => (
                        <div
                          key={employee.id}
                          className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
                        >
                          <p>
                            {employee.nome} {employee.cognome} - {employee.codiceFiscale}
                          </p>
                          <p className="text-xs">gia inserita</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(employeesQuery.data?.total ?? 0) > 500 ? (
                  <p className="text-xs text-muted-foreground">
                    Mostrati i primi 500 risultati. Usa la ricerca per trovare
                    dipendenti specifici.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm"
              onClick={onClose}
            >
              Annulla
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
              onClick={handleAdd}
              disabled={selectedCount === 0}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Aggiungi {selectedCount} selezionati
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
