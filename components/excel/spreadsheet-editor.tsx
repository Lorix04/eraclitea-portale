"use client"
import { useCallback, useMemo, useRef, useState } from 'react'
import { AgGridReact } from '@ag-grid-community/react'
import { ColDef, GridApi, GridOptions, RowSelectedEvent } from '@ag-grid-community/core'
import '@ag-grid-community/styles/ag-grid.css'
import '@ag-grid-community/styles/ag-theme-quartz.css'

export type SpreadsheetColumn = ColDef

type Props<T> = {
  columns: SpreadsheetColumn[]
  data: T[]
  onChange?: (rows: T[]) => void
  onSave?: (rows: T[]) => Promise<void> | void
  validationRules?: Record<string, (value: any, row: any) => string | null>
  readOnly?: boolean
  showValidationSummary?: boolean
  onAutoSave?: (rows: T[], hasChanges: boolean) => void
  autoSaveInterval?: number
  maxRows?: number
}

export default function SpreadsheetEditor<T extends { id?: string }>({ columns, data, onChange, onSave, validationRules, readOnly, showValidationSummary, onAutoSave, autoSaveInterval = 5000, maxRows }: Props<T>) {
  const gridRef = useRef<AgGridReact<T>>(null)
  const apiRef = useRef<GridApi<T> | null>(null)
  const [rows, setRows] = useState<T[]>(data)
  const [saving, setSaving] = useState(false)

  const gridOptions: GridOptions<T> = useMemo(
    () => ({
      defaultColDef: {
        editable: !readOnly,
        filter: true,
        floatingFilter: true,
        resizable: true,
      },
      undoRedoCellEditing: true,
      rowSelection: readOnly ? 'single' : 'multiple',
      onGridReady: (params) => {
        apiRef.current = params.api
      },
      onCellValueChanged: () => {
        const updated = apiRef.current?.getRenderedNodes().map((n) => n.data!) || []
        setRows(updated)
        onChange?.(updated)
      },
    }),
    [onChange, readOnly],
  )

  const addRow = useCallback(() => {
    apiRef.current?.applyTransaction({ add: [{} as T] })
  }, [])

  const removeSelected = useCallback(() => {
    const sel = apiRef.current?.getSelectedRows() || []
    apiRef.current?.applyTransaction({ remove: sel })
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await onSave?.(rows)
    } finally {
      setSaving(false)
    }
  }, [rows, onSave])

  // Auto-save timer
  useMemo(() => {
    if (!onAutoSave || readOnly) return
    const id = setInterval(() => { onAutoSave(rows, true) }, autoSaveInterval)
    return () => clearInterval(id)
  }, [rows, onAutoSave, autoSaveInterval, readOnly])

  const warnings: string[] = []
  if (maxRows && rows.length > maxRows) warnings.push(`Attenzione: il corso ha un limite di ${maxRows} partecipanti`)

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex gap-2">
          <button className="px-3 py-1 border rounded" onClick={addRow}>Aggiungi riga</button>
          <button className="px-3 py-1 border rounded" onClick={removeSelected}>Rimuovi selezionate</button>
          <button className="px-3 py-1 border rounded bg-accent text-white" onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</button>
        </div>
      )}
      {warnings.map((w,i)=>(<div key={i} className="text-warning text-sm">{w}</div>))}
      <div className="ag-theme-quartz" style={{ height: 500, width: '100%' }}>
        <AgGridReact<T>
          ref={gridRef}
          columnDefs={columns}
          rowData={rows}
          gridOptions={gridOptions}
          suppressContextMenu={false}
        />
      </div>
      {showValidationSummary && (
        <div className="text-xs text-text-secondary">Le celle rosse indicano errori di validazione.</div>
      )}
    </div>
  )
}
