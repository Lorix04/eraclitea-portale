"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import ExcelSheet from "@/components/ExcelSheet";
import EmployeeCardForm from "@/components/EmployeeCardForm";
import EmployeeExtraFieldsModal from "@/components/EmployeeExtraFieldsModal";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSaveRegistrations } from "@/hooks/useSaveRegistrations";
import { useCodiciCatastali } from "@/hooks/useCodiciCatastali";
import { BrandedButton } from "@/components/BrandedButton";
import AddExistingEmployeesModal from "@/components/AddExistingEmployeesModal";
import type { EmployeeFormRow } from "@/types";

const emptyRow: EmployeeFormRow = {
  nome: "",
  cognome: "",
  codiceFiscale: "",
  sesso: "",
  dataNascita: "",
  luogoNascita: "",
  email: "",
  telefono: "",
  cellulare: "",
  indirizzo: "",
  comuneResidenza: "",
  cap: "",
  provincia: "",
  regione: "",
  emailAziendale: "",
  partitaIva: "",
  iban: "",
  pec: "",
  mansione: "",
  note: "",
};

type AnagraficheResponsiveProps = {
  initialData: EmployeeFormRow[];
  courseEditionId?: string;
  clientId?: string;
  readOnly?: boolean;
};

function getRowEmployeeIds(rows: EmployeeFormRow[]) {
  return rows
    .map((row) =>
      typeof row.employeeId === "string" ? row.employeeId.trim() : ""
    )
    .filter((id): id is string => id.length > 0);
}

export default function AnagraficheResponsive({
  initialData,
  courseEditionId,
  clientId,
  readOnly,
}: AnagraficheResponsiveProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Fetch custom fields for this client
  const { data: customFieldsData } = useQuery({
    queryKey: ["custom-fields", clientId],
    queryFn: async () => {
      if (!clientId) return { enabled: false, fields: [] };
      const res = await fetch(`/api/custom-fields?clientId=${clientId}`);
      if (!res.ok) return { enabled: false, fields: [] };
      return res.json();
    },
    enabled: !!clientId,
  });
  const customFields = useMemo(
    () => (customFieldsData?.enabled ? customFieldsData.fields : []),
    [customFieldsData]
  );

  // Flatten customData into rows as custom_* keys for spreadsheet
  const flattenCustomData = useCallback((rows: EmployeeFormRow[]): EmployeeFormRow[] => {
    if (!customFields?.length) return rows;
    return rows.map((row) => {
      const flat = { ...row };
      if (row.customData) {
        for (const [k, v] of Object.entries(row.customData)) {
          (flat as any)[`custom_${k}`] = v ?? "";
        }
      }
      return flat;
    });
  }, [customFields]);

  const [rows, setRows] = useState<EmployeeFormRow[]>(flattenCustomData(initialData));
  const removedEmployeeIdsRef = useRef<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const { data: codiciCatastali } = useCodiciCatastali();
  const { debouncedSave, saveNow, isSaving } = useSaveRegistrations(
    courseEditionId,
    clientId
  );

  useEffect(() => {
    setRows(flattenCustomData(initialData));
    removedEmployeeIdsRef.current = [];
  }, [initialData, flattenCustomData]);

  const handleSave = () => {
    setStatus(null);
    const currentIds = new Set(getRowEmployeeIds(rows));
    const removedEmployeeIds = removedEmployeeIdsRef.current.filter(
      (employeeId) => !currentIds.has(employeeId)
    );
    saveNow(rows, removedEmployeeIds);
    setStatus("Salvato");
  };

  const updateRemovedEmployeeIds = (
    previousRows: EmployeeFormRow[],
    nextRows: EmployeeFormRow[]
  ) => {
    const nextIds = new Set(getRowEmployeeIds(nextRows));
    const removedFromCurrentRows = getRowEmployeeIds(previousRows).filter(
      (employeeId) => !nextIds.has(employeeId)
    );
    const carriedRemovedIds = removedEmployeeIdsRef.current.filter(
      (employeeId) => !nextIds.has(employeeId)
    );
    const mergedRemovedIds = Array.from(
      new Set([...carriedRemovedIds, ...removedFromCurrentRows])
    );
    removedEmployeeIdsRef.current = mergedRemovedIds;
    return mergedRemovedIds;
  };

  const handleChange = (nextRows: EmployeeFormRow[]) => {
    const removedEmployeeIds = updateRemovedEmployeeIds(rows, nextRows);
    setRows(nextRows);
    if (!readOnly) {
      debouncedSave(nextRows, removedEmployeeIds);
      setStatus("In compilazione");
    }
  };

  const handleAddFromList = (employees: EmployeeFormRow[]) => {
    const existingCFs = new Set(
      rows
        .map((row) => row.codiceFiscale?.trim().toUpperCase())
        .filter((value): value is string => Boolean(value))
    );

    const newEmployees = employees.filter(
      (employee) => !existingCFs.has(employee.codiceFiscale.trim().toUpperCase())
    );

    if (newEmployees.length === 0) {
      toast.info("Tutti i dipendenti selezionati sono gia presenti nel foglio");
      return;
    }

    const nextRows = [...rows, ...newEmployees];
    handleChange(nextRows);
    setShowAddModal(false);
    toast.success(`${newEmployees.length} dipendente/i aggiunto/i al foglio`);
  };

  const handleSaveExtra = (
    rowIndex: number,
    extraData: Partial<EmployeeFormRow>
  ) => {
    const nextRows = rows.map((row, idx) =>
      idx === rowIndex ? { ...row, ...extraData } : row
    );
    handleChange(nextRows);
    setEditingRowIndex(null);
    toast.success("Dati aggiuntivi salvati");
  };

  return (
    <div className="space-y-4">
      {!readOnly && courseEditionId ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition-colors hover:bg-blue-100"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Aggiungi da elenco
          </button>
        </div>
      ) : null}

      {isMobile ? (
        <div className="space-y-3">
          <EmployeeCardForm
            data={rows}
            onChange={handleChange}
            onSave={handleSave}
            saving={isSaving}
            readOnly={readOnly}
            clientId={clientId}
            codiciCatastali={codiciCatastali}
          />
          {status ? (
            <span className="text-sm text-muted-foreground">{status}</span>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <ExcelSheet
            data={rows}
            onChange={handleChange}
            readOnly={readOnly}
            clientId={clientId}
            enableAutocomplete={!readOnly}
            codiciCatastali={codiciCatastali}
            onOpenExtra={(rowIndex) => setEditingRowIndex(rowIndex)}
            customFields={customFields}
          />
          <div className="flex items-center gap-3">
            <BrandedButton
              onClick={handleSave}
              disabled={isSaving || readOnly}
            >
              {isSaving ? "Salvataggio..." : "Salva"}
            </BrandedButton>
            {status ? <span className="text-sm text-muted-foreground">{status}</span> : null}
          </div>
        </div>
      )}

      {showAddModal && courseEditionId ? (
        <AddExistingEmployeesModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddFromList}
          clientId={clientId ?? ""}
          courseEditionId={courseEditionId}
          currentRows={rows}
        />
      ) : null}

      {editingRowIndex !== null ? (
        <EmployeeExtraFieldsModal
          open={editingRowIndex !== null}
          onClose={() => setEditingRowIndex(null)}
          rowData={rows[editingRowIndex] ?? emptyRow}
          rowIndex={editingRowIndex}
          onSave={handleSaveExtra}
          readOnly={readOnly}
        />
      ) : null}
    </div>
  );
}
