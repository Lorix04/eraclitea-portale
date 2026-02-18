"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
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
  mansione: "",
  note: "",
};

type AnagraficheResponsiveProps = {
  initialData: EmployeeFormRow[];
  courseEditionId?: string;
  clientId?: string;
  readOnly?: boolean;
};

export default function AnagraficheResponsive({
  initialData,
  courseEditionId,
  clientId,
  readOnly,
}: AnagraficheResponsiveProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [rows, setRows] = useState<EmployeeFormRow[]>(initialData);
  const [status, setStatus] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const { data: codiciCatastali } = useCodiciCatastali();
  const { debouncedSave, saveNow, isSaving } = useSaveRegistrations(
    courseEditionId,
    clientId
  );

  useEffect(() => {
    setRows(initialData);
  }, [initialData]);

  const handleSave = () => {
    setStatus(null);
    saveNow(rows);
    setStatus("Salvato");
  };

  const handleChange = (nextRows: EmployeeFormRow[]) => {
    setRows(nextRows);
    if (!readOnly) {
      debouncedSave(nextRows);
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
    setRows(nextRows);
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
    setRows(nextRows);
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
