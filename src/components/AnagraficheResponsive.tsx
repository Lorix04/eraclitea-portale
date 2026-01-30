"use client";

import { useEffect, useState } from "react";
import ExcelSheet from "@/components/ExcelSheet";
import EmployeeCardForm from "@/components/EmployeeCardForm";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSaveRegistrations } from "@/hooks/useSaveRegistrations";

type EmployeeRow = {
  nome: string;
  cognome: string;
  codiceFiscale: string;
  dataNascita?: string;
  luogoNascita?: string;
  email?: string;
  mansione?: string;
  note?: string;
};

type AnagraficheResponsiveProps = {
  initialData: EmployeeRow[];
  courseId?: string;
  readOnly?: boolean;
};

export default function AnagraficheResponsive({
  initialData,
  courseId,
  readOnly,
}: AnagraficheResponsiveProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [rows, setRows] = useState<EmployeeRow[]>(initialData);
  const [status, setStatus] = useState<string | null>(null);
  const { debouncedSave, saveNow, isSaving } = useSaveRegistrations(courseId);

  useEffect(() => {
    setRows(initialData);
  }, [initialData]);

  const handleSave = () => {
    setStatus(null);
    saveNow(rows);
    setStatus("Salvato");
  };

  const handleChange = (nextRows: EmployeeRow[]) => {
    setRows(nextRows);
    if (!readOnly) {
      debouncedSave(nextRows);
      setStatus("In compilazione");
    }
  };

  return (
    <div className="space-y-4">
      {isMobile ? (
        <div className="space-y-3">
          <EmployeeCardForm
            data={rows}
            onChange={handleChange}
            onSave={handleSave}
            saving={isSaving}
            readOnly={readOnly}
          />
          {status ? (
            <span className="text-sm text-muted-foreground">{status}</span>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <ExcelSheet data={rows} onChange={handleChange} readOnly={readOnly} />
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
              onClick={handleSave}
              disabled={isSaving || readOnly}
            >
              {isSaving ? "Salvataggio..." : "Salva"}
            </button>
            {status ? <span className="text-sm text-muted-foreground">{status}</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}
