"use client";

import { HotTable } from "@handsontable/react";
import "handsontable/dist/handsontable.full.min.css";
import { registerAllModules } from "handsontable/registry";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatItalianDate, isValidItalianDate } from "@/lib/date-utils";
import { decodeCF } from "@/lib/codice-fiscale-decoder";
import { isValidCodiceFiscale } from "@/lib/validators";
import type { EmployeeFormRow } from "@/types";

registerAllModules();

type CodiciCatastaliMap = Record<string, { nome: string; provincia: string; cap: string }>;

type ExcelSheetProps = {
  data: EmployeeFormRow[];
  onChange?: (rows: EmployeeFormRow[]) => void;
  readOnly?: boolean;
  clientId?: string;
  enableAutocomplete?: boolean;
  codiciCatastali?: CodiciCatastaliMap | null;
  onOpenExtra?: (rowIndex: number) => void;
};

type HotTableRef = { hotInstance: any };

type LookupEmployee = {
  id: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  sesso?: string | null;
  dataNascita?: string | null;
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

type HandsontableChange = [
  row: number,
  prop: string | number,
  oldValue: unknown,
  newValue: unknown,
];

type PendingRemoval = {
  rowIndexes: number[];
  message: string;
};

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

function normalizeRow(input: Record<string, unknown> | EmployeeFormRow): EmployeeFormRow {
  const row = input as Partial<EmployeeFormRow>;
  return {
    nome: String(row.nome ?? ""),
    cognome: String(row.cognome ?? ""),
    codiceFiscale: String(row.codiceFiscale ?? ""),
    sesso: String(row.sesso ?? ""),
    dataNascita: String(row.dataNascita ?? ""),
    luogoNascita: String(row.luogoNascita ?? ""),
    email: String(row.email ?? ""),
    telefono: String(row.telefono ?? ""),
    cellulare: String(row.cellulare ?? ""),
    indirizzo: String(row.indirizzo ?? ""),
    comuneResidenza: String(row.comuneResidenza ?? ""),
    cap: String(row.cap ?? ""),
    mansione: String(row.mansione ?? ""),
    note: String(row.note ?? ""),
  };
}

function getExtraStatus(row: EmployeeFormRow | null | undefined) {
  if (!row) return "empty" as const;

  const hasAnyExtra = Boolean(
    String(row.telefono ?? "").trim() ||
      String(row.cellulare ?? "").trim() ||
      String(row.indirizzo ?? "").trim() ||
      String(row.mansione ?? "").trim() ||
      String(row.note ?? "").trim()
  );

  if (!hasAnyExtra) return "empty" as const;
  return "complete" as const;
}

export default function ExcelSheet({
  data,
  onChange,
  readOnly,
  clientId,
  enableAutocomplete = true,
  codiciCatastali,
  onOpenExtra,
}: ExcelSheetProps) {
  const hotRef = useRef<HotTableRef | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const lastLookupRef = useRef<string>("");
  const lookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeToastIdRef = useRef<string | number | null>(null);

  const selectedCount = selectedRows.size;

  const columns = useMemo(
    () => [
      {
        data: "__select",
        title: "",
        readOnly: true,
        editor: false,
        width: 42,
        renderer: (
          _instance: unknown,
          td: HTMLTableCellElement,
          rowIndex: number
        ) => {
          td.innerHTML = "";
          td.style.textAlign = "center";
          td.style.verticalAlign = "middle";
          td.style.cursor = readOnly ? "default" : "pointer";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = selectedRows.has(rowIndex);
          checkbox.disabled = !!readOnly;
          checkbox.tabIndex = -1;
          checkbox.style.cursor = readOnly ? "default" : "pointer";
          td.appendChild(checkbox);
          return td;
        },
      },
      {
        data: "nome",
        title: "Nome *",
        type: "text",
        validator: (value: string, callback: (valid: boolean) => void) => {
          callback(Boolean(String(value ?? "").trim()));
        },
      },
      {
        data: "cognome",
        title: "Cognome *",
        type: "text",
        validator: (value: string, callback: (valid: boolean) => void) => {
          callback(Boolean(String(value ?? "").trim()));
        },
      },
      {
        data: "codiceFiscale",
        title: "Codice Fiscale *",
        type: "text",
        validator: (value: string, callback: (valid: boolean) => void) => {
          const normalized = String(value ?? "").trim().toUpperCase();
          callback(Boolean(normalized) && isValidCodiceFiscale(normalized));
        },
      },
      {
        data: "sesso",
        title: "Sesso *",
        type: "dropdown",
        source: ["M", "F"],
        allowInvalid: false,
        validator: (value: string, callback: (valid: boolean) => void) => {
          const normalized = String(value ?? "").trim().toUpperCase();
          callback(normalized === "M" || normalized === "F");
        },
      },
      {
        data: "dataNascita",
        title: "Data Nascita *",
        type: "text",
        placeholder: "GG/MM/AAAA",
        validator: (value: string, callback: (valid: boolean) => void) => {
          if (!value || String(value).trim() === "") {
            callback(false);
            return;
          }
          callback(isValidItalianDate(String(value)));
        },
      },
      {
        data: "luogoNascita",
        title: "Comune Nascita *",
        type: "text",
        validator: (value: string, callback: (valid: boolean) => void) => {
          callback(Boolean(String(value ?? "").trim()));
        },
      },
      {
        data: "email",
        title: "Email *",
        type: "text",
        validator: (value: string, callback: (valid: boolean) => void) => {
          const trimmed = String(value ?? "").trim();
          callback(Boolean(trimmed) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed));
        },
      },
      {
        data: "comuneResidenza",
        title: "Comune Residenza *",
        type: "text",
        validator: (value: string, callback: (valid: boolean) => void) => {
          callback(Boolean(String(value ?? "").trim()));
        },
      },
      {
        data: "cap",
        title: "CAP *",
        type: "text",
        validator: (value: string, callback: (valid: boolean) => void) => {
          const trimmed = String(value ?? "").trim();
          callback(Boolean(trimmed) && trimmed.length <= 5);
        },
      },
      {
        data: "_altro",
        title: "Altro",
        readOnly: true,
        width: 90,
        renderer: (
          instance: any,
          td: HTMLTableCellElement,
          rowIndex: number
        ) => {
          const rowData = normalizeRow(instance.getSourceDataAtRow(rowIndex) ?? {});
          const extraStatus = getExtraStatus(rowData);

          td.innerHTML = "";
          td.style.textAlign = "center";
          td.style.verticalAlign = "middle";
          td.style.cursor = readOnly ? "default" : "pointer";

          const btn = document.createElement("span");
          btn.className = "altro-btn";
          let styleSuffix = "background:#f3f4f6;color:#6b7280;border:1px solid #d1d5db;";
          let textContent = "Altro";
          if (extraStatus === "complete") {
            styleSuffix = "background:#dcfce7;color:#166534;border:1px solid #bbf7d0;";
            textContent = "Altro ✓";
          }

          btn.style.cssText =
            "display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:12px;cursor:pointer;" +
            styleSuffix;
          btn.textContent = textContent;
          td.appendChild(btn);
          return td;
        },
      },
    ],
    [readOnly, selectedRows]
  );

  const getNormalizedSourceData = () => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return [] as EmployeeFormRow[];
    const sourceData = (hot.getSourceData?.() as Record<string, unknown>[]) ?? [];
    return sourceData.map((row) => normalizeRow(row));
  };

  const handleAddRow = () => {
    if (readOnly) return;
    onChange?.([...data, { ...emptyRow }]);
  };

  const buildSingleRowRemovalMessage = (rowIndex: number) => {
    const row = data[rowIndex];
    if (!row) return "Sei sicuro di voler rimuovere questa riga?";
    const fullName = `${String(row.nome ?? "").trim()} ${String(row.cognome ?? "").trim()}`.trim();
    if (!fullName) return "Sei sicuro di voler rimuovere questa riga?";
    return `Sei sicuro di voler rimuovere ${fullName} dalle anagrafiche di questa edizione?`;
  };

  const requestRowsRemoval = (rowIndexes: number[]) => {
    if (readOnly) return;
    const validRows = Array.from(
      new Set(rowIndexes.filter((rowIndex) => rowIndex >= 0 && rowIndex < data.length))
    ).sort((a, b) => a - b);

    if (validRows.length === 0) return;

    const message =
      validRows.length === 1
        ? buildSingleRowRemovalMessage(validRows[0])
        : `Sei sicuro di voler rimuovere ${validRows.length} dipendenti dalle anagrafiche di questa edizione?`;

    setPendingRemoval({
      rowIndexes: validRows,
      message,
    });
  };

  const confirmRowsRemoval = () => {
    if (!pendingRemoval) return;
    const rowSet = new Set(pendingRemoval.rowIndexes);
    const next = data.filter((_, index) => !rowSet.has(index));
    onChange?.(next);
    setSelectedRows(new Set());
    setPendingRemoval(null);
  };

  const toggleRowSelection = (rowIndex: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  const toggleAllRowsSelection = () => {
    setSelectedRows((prev) => {
      if (data.length === 0) return new Set();
      if (prev.size === data.length) return new Set();
      return new Set(data.map((_, index) => index));
    });
  };

  const handleRemoveSelected = () => {
    if (readOnly) return;
    if (selectedCount === 0) return;
    requestRowsRemoval(Array.from(selectedRows));
  };

  useEffect(() => {
    setSelectedRows((prev) => {
      if (prev.size === 0) return prev;
      const validIndexes = new Set(
        Array.from(prev).filter((rowIndex) => rowIndex >= 0 && rowIndex < data.length)
      );
      if (validIndexes.size === prev.size) return prev;
      return validIndexes;
    });
  }, [data.length]);

  useEffect(() => {
    if (!pendingRemoval) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [pendingRemoval]);

  useEffect(() => {
    return () => {
      if (lookupTimeoutRef.current) {
        clearTimeout(lookupTimeoutRef.current);
      }
      if (activeToastIdRef.current) {
        toast.dismiss(activeToastIdRef.current);
      }
    };
  }, []);

  const applyCFDecode = (rowIndex: number, rawCF: string) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    const decoded = decodeCF(rawCF);
    if (!decoded) return;

    const currentDate = String(hot.getDataAtRowProp(rowIndex, "dataNascita") ?? "").trim();
    const currentSesso = String(hot.getDataAtRowProp(rowIndex, "sesso") ?? "").trim();
    const currentComune = String(hot.getDataAtRowProp(rowIndex, "luogoNascita") ?? "").trim();

    if (!currentDate) {
      hot.setDataAtRowProp(rowIndex, "dataNascita", decoded.dataNascita, "cf-decode");
    }
    if (!currentSesso) {
      hot.setDataAtRowProp(rowIndex, "sesso", decoded.sesso, "cf-decode");
    }

    if (!currentComune && codiciCatastali) {
      const comune = codiciCatastali[decoded.codiceCatastale];
      if (comune) {
        const fullComune = comune.provincia
          ? `${comune.nome} (${comune.provincia})`
          : comune.nome;
        hot.setDataAtRowProp(rowIndex, "luogoNascita", fullComune, "cf-decode");
      }
    }
  };

  const triggerAutocompleteLookup = (rowIndex: number, codiceFiscaleValue: string) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || !enableAutocomplete || readOnly) return;

    const normalizedCF = codiceFiscaleValue.trim().toUpperCase();
    if (normalizedCF.length !== 16) return;

    const lookupKey = `${rowIndex}:${normalizedCF}`;
    if (lastLookupRef.current === lookupKey) return;
    lastLookupRef.current = lookupKey;

    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
    }

    lookupTimeoutRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("cf", normalizedCF);
        if (clientId) {
          params.set("clientId", clientId);
        }

        const response = await fetch(`/api/dipendenti/lookup?${params.toString()}`);
        if (!response.ok) return;
        const json = await response.json().catch(() => ({}));
        const employee = (json.data ?? null) as LookupEmployee | null;
        if (!employee) return;

        const currentNome = String(hot.getDataAtRowProp(rowIndex, "nome") ?? "").trim();
        if (currentNome) return;

        if (activeToastIdRef.current) {
          toast.dismiss(activeToastIdRef.current);
          activeToastIdRef.current = null;
        }

        const toastId = `autocomplete-${rowIndex}-${normalizedCF}`;
        activeToastIdRef.current = toastId;

        toast(
          <div className="flex flex-col gap-2">
            <span className="font-medium">
              Dipendente trovato: {employee.nome} {employee.cognome} ({employee.codiceFiscale})
            </span>
            <div className="flex items-center gap-3 text-sm">
              <button
                type="button"
                className="text-blue-600 underline hover:text-blue-800"
                onClick={() => {
                  hot.setDataAtRowProp(rowIndex, "nome", employee.nome, "autocomplete-fill");
                  hot.setDataAtRowProp(rowIndex, "cognome", employee.cognome, "autocomplete-fill");
                  if (employee.sesso) {
                    hot.setDataAtRowProp(rowIndex, "sesso", employee.sesso, "autocomplete-fill");
                  }
                  if (employee.dataNascita) {
                    hot.setDataAtRowProp(
                      rowIndex,
                      "dataNascita",
                      formatItalianDate(employee.dataNascita),
                      "autocomplete-fill"
                    );
                  }
                  hot.setDataAtRowProp(
                    rowIndex,
                    "luogoNascita",
                    employee.luogoNascita ?? "",
                    "autocomplete-fill"
                  );
                  hot.setDataAtRowProp(rowIndex, "email", employee.email ?? "", "autocomplete-fill");
                  hot.setDataAtRowProp(rowIndex, "telefono", employee.telefono ?? "", "autocomplete-fill");
                  hot.setDataAtRowProp(rowIndex, "cellulare", employee.cellulare ?? "", "autocomplete-fill");
                  hot.setDataAtRowProp(rowIndex, "indirizzo", employee.indirizzo ?? "", "autocomplete-fill");
                  hot.setDataAtRowProp(
                    rowIndex,
                    "comuneResidenza",
                    employee.comuneResidenza ?? "",
                    "autocomplete-fill"
                  );
                  hot.setDataAtRowProp(rowIndex, "cap", employee.cap ?? "", "autocomplete-fill");
                  hot.setDataAtRowProp(rowIndex, "mansione", employee.mansione ?? "", "autocomplete-fill");
                  hot.setDataAtRowProp(rowIndex, "note", employee.note ?? "", "autocomplete-fill");

                  onChange?.(getNormalizedSourceData());
                  toast.dismiss(toastId);
                  activeToastIdRef.current = null;
                  toast.success("Dati compilati automaticamente");
                }}
              >
                Compila automaticamente
              </button>
              <button
                type="button"
                className="text-muted-foreground underline hover:text-foreground"
                onClick={() => {
                  toast.dismiss(toastId);
                  activeToastIdRef.current = null;
                }}
              >
                Ignora
              </button>
            </div>
          </div>,
          { id: toastId, duration: 8000 }
        );
      } catch {
        // Silent fail
      }
    }, 500);
  };

  const extraColumnIndex = useMemo(
    () => columns.findIndex((column) => column.data === "_altro"),
    [columns]
  );

  return (
    <div className="anagrafiche-sheet rounded-md border bg-card p-2">
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
            className="inline-flex items-center rounded-md border px-3 py-1 text-xs disabled:cursor-not-allowed disabled:border-muted-foreground/20 disabled:bg-muted disabled:text-muted-foreground"
            onClick={handleRemoveSelected}
            disabled={selectedCount === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {selectedCount > 0
              ? `Rimuovi selezionate (${selectedCount})`
              : "Rimuovi selezionate"}
          </button>
          <span className="ml-auto text-xs text-muted-foreground">{data.length} dipendenti</span>
        </div>
      ) : null}

      <div className="mb-2 text-xs text-muted-foreground">Formato data: GG/MM/AAAA (es. 15/03/1990)</div>

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
          const classes: string[] = [];
          const prop = hotRef.current?.hotInstance?.colToProp(col);

          if (selectedRows.has(row)) {
            classes.push("anagrafiche-row-selected");
          }

          if (prop === "__select") {
            classes.push("anagrafiche-select-cell");
          }

          if (prop === "dataNascita") {
            const value = hotRef.current?.hotInstance?.getDataAtCell(row, col);
            if (value && !isValidItalianDate(String(value))) {
              classes.push("htInvalid");
            }
          }

          if (classes.length > 0) {
            cellProperties.className = classes.join(" ");
          }

          return cellProperties;
        }}
        afterChange={(changes: HandsontableChange[] | null, source: string) => {
          if (!changes || source === "loadData") return;
          if (readOnly) return;

          onChange?.(getNormalizedSourceData());

          if (source === "autocomplete-fill" || source === "cf-decode") {
            return;
          }

          changes.forEach((change) => {
            const [rowIndex, prop, oldValue, newValue] = change;
            if (prop !== "codiceFiscale") return;
            if (typeof newValue !== "string" || newValue === oldValue) return;

            const normalizedCF = newValue.trim().toUpperCase();
            if (normalizedCF.length < 16) {
              lastLookupRef.current = "";
              return;
            }

            applyCFDecode(rowIndex, normalizedCF);
            if (enableAutocomplete) {
              triggerAutocompleteLookup(rowIndex, normalizedCF);
            }
          });
        }}
        afterOnCellMouseDown={(
          _event: MouseEvent,
          coords: { row: number; col: number }
        ) => {
          if (readOnly) return;
          if (coords.row === -1 && coords.col === 0) {
            toggleAllRowsSelection();
            return;
          }
          if (coords.row < 0) return;
          if (coords.row >= data.length) return;
          if (coords.col === 0) {
            toggleRowSelection(coords.row);
            return;
          }
          if (coords.col === extraColumnIndex) {
            onOpenExtra?.(coords.row);
          }
        }}
        afterGetColHeader={(
          col: number,
          TH: HTMLTableCellElement
        ) => {
          if (col !== 0) return;
          const colHeader = TH.querySelector(".colHeader") as HTMLElement | null;
          if (!colHeader) return;

          colHeader.innerHTML = "";
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.disabled = !!readOnly || data.length === 0;
          checkbox.checked = data.length > 0 && selectedCount === data.length;
          checkbox.indeterminate = selectedCount > 0 && selectedCount < data.length;
          checkbox.tabIndex = -1;
          checkbox.style.cursor = readOnly ? "default" : "pointer";
          colHeader.appendChild(checkbox);
        }}
        beforeRemoveRow={(
          index: number,
          amount: number,
          physicalRows?: number[]
        ) => {
          if (readOnly) return false;

          const rowsToRemove =
            Array.isArray(physicalRows) && physicalRows.length > 0
              ? physicalRows
              : Array.from({ length: amount }, (_, offset) => index + offset);

          requestRowsRemoval(rowsToRemove);
          return false;
        }}
      />

      {pendingRemoval
        ? createPortal(
            <div className="fixed inset-0 z-[80]">
              <div
                className="fixed inset-0 bg-black/50"
                aria-hidden="true"
                onClick={() => setPendingRemoval(null)}
              />
              <div className="fixed inset-0 z-[81] flex items-center justify-center p-4">
                <div
                  className="w-full max-w-md rounded-lg border bg-card shadow-lg"
                  role="dialog"
                  aria-modal="true"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="border-b px-4 py-3">
                    <h3 className="text-base font-semibold">Conferma rimozione</h3>
                  </div>
                  <div className="px-4 py-4 text-sm text-muted-foreground">
                    {pendingRemoval.message}
                  </div>
                  <div className="flex justify-end gap-2 border-t px-4 py-3">
                    <button
                      type="button"
                      className="rounded-md border px-3 py-2 text-sm"
                      onClick={() => setPendingRemoval(null)}
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                      onClick={confirmRowsRemoval}
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <style jsx global>{`
        .anagrafiche-sheet .htCore td.anagrafiche-row-selected {
          background: #eef2ff !important;
        }
        .anagrafiche-sheet .htCore td.anagrafiche-select-cell {
          text-align: center;
          vertical-align: middle;
        }
      `}</style>
    </div>
  );
}
