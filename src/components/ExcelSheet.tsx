"use client";

import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { isValidCodiceFiscale } from "@/lib/validators";
import { isValidItalianDate } from "@/lib/date-utils";

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

type ExcelSheetProps = {
  data: EmployeeRow[];
  onChange?: (rows: EmployeeRow[]) => void;
  readOnly?: boolean;
};

type HotTableRef = { hotInstance: any };

type SelectionRange = {
  from: { row: number };
  to: { row: number };
};

export default function ExcelSheet({ data, onChange, readOnly }: ExcelSheetProps) {
  const hotRef = useRef<HotTableRef | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  const columns = useMemo(
    () => [
      { data: "nome", title: "Nome", type: "text" },
      { data: "cognome", title: "Cognome", type: "text" },
      {
        data: "codiceFiscale",
        title: "Codice Fiscale",
        type: "text",
        validator: (value: string, callback: (valid: boolean) => void) => {
          callback(!value || isValidCodiceFiscale(value));
        },
      },
      {
        data: "dataNascita",
        title: "Data Nascita",
        type: "text",
        placeholder: "GG/MM/AAAA",
        validator: (value: string, callback: (valid: boolean) => void) => {
          if (!value || String(value).trim() === "") {
            callback(true);
            return;
          }
          callback(isValidItalianDate(String(value)));
        },
      },
      { data: "luogoNascita", title: "Luogo Nascita", type: "text" },
      { data: "email", title: "Email", type: "text" },
      { data: "mansione", title: "Mansione", type: "text" },
      { data: "note", title: "Note", type: "text" },
    ],
    []
  );

  const emptyRow: EmployeeRow = {
    nome: "",
    cognome: "",
    codiceFiscale: "",
    dataNascita: "",
    luogoNascita: "",
    email: "",
    mansione: "",
    note: "",
  };

  const handleAddRow = () => {
    if (readOnly) return;
    const next = [...data, { ...emptyRow }];
    onChange?.(next);
  };

  const handleRemoveSelected = () => {
    if (readOnly) return;
    const hot = hotRef.current?.hotInstance;
    const ranges = hot?.getSelectedRange?.() as SelectionRange[] | undefined;
    if (!ranges || ranges.length === 0) return;

    const rowsToRemove = new Set<number>();
    ranges.forEach((range: SelectionRange) => {
      const start = Math.min(range.from.row, range.to.row);
      const end = Math.max(range.from.row, range.to.row);
      for (let i = start; i <= end; i += 1) {
        rowsToRemove.add(i);
      }
    });

    const next = data.filter((_, index) => !rowsToRemove.has(index));
    onChange?.(next);
    setHasSelection(false);
  };

  return (
    <div className="rounded-md border bg-card p-2">
      {!readOnly ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center rounded-md border px-3 py-1 text-xs"
            onClick={handleAddRow}
          >
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi riga
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-md border px-3 py-1 text-xs"
            onClick={handleRemoveSelected}
            disabled={!hasSelection}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Rimuovi selezionate
          </button>
          <span className="ml-auto text-xs text-muted-foreground">
            {data.length} dipendenti
          </span>
        </div>
      ) : null}
      <div className="mb-2 text-xs text-muted-foreground">
        Formato data: GG/MM/AAAA (es. 15/03/1990)
      </div>
      <HotTable
        ref={hotRef}
        data={data}
        colHeaders={columns.map((col) => col.title)}
        columns={columns}
        width="100%"
        height={420}
        stretchH="all"
        licenseKey="non-commercial-and-evaluation"
        readOnly={readOnly}
        minSpareRows={readOnly ? 0 : 1}
        contextMenu={readOnly ? false : ["row_above", "row_below", "remove_row"]}
        cells={(row: number, col: number) => {
          const cellProperties: Record<string, unknown> = {};
          if (col === 3) {
            const value = hotRef.current?.hotInstance?.getDataAtCell(row, col);
            if (value && !isValidItalianDate(String(value))) {
              cellProperties.className = "htInvalid";
            }
          }
          return cellProperties;
        }}
        afterChange={(changes: any, source: any) => {
          if (!changes || source === "loadData") return;
          if (readOnly) return;
          const hot = hotRef.current?.hotInstance;
          const next = hot?.getSourceData?.() as EmployeeRow[] | undefined;
          if (next) {
            onChange?.(next.map((row) => ({ ...row })));
          }
        }}
        afterSelectionEnd={() => setHasSelection(true)}
        afterDeselect={() => setHasSelection(false)}
      />
    </div>
  );
}
