"use client"
import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table'

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageCount?: number
  serverSide?: boolean
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onGlobalSearch?: (value: string) => void
}

export function DataTable<TData, TValue>({ columns, data, pageCount, serverSide, onPaginationChange, onGlobalSearch }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
    enableMultiSort: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: (val)=>{ setGlobalFilter(String(val)); onGlobalSearch?.(String(val)) },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: !!serverSide,
    pageCount,
  })

  return (
    <div className="rounded-md border bg-white">
      <div className="p-2 flex items-center gap-2">
        <input className="border rounded px-2 py-1 text-sm" placeholder="Cerca…" value={globalFilter ?? ''} onChange={(e)=>table.setGlobalFilter(e.target.value)} />
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="text-left px-3 py-2 border-b">
                  {header.isPlaceholder ? null : (
                    <div className="cursor-pointer select-none" onClick={header.column.getToggleSortingHandler()}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="even:bg-gray-50">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-3 py-2 border-b">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between p-2 text-sm">
        <div>Pagina {table.getState().pagination.pageIndex + 1} di {table.getPageCount() || 1} ({data.length} elementi)</div>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1"
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
          >
            {[5, 10, 15, 20].map(size => (
              <option key={size} value={size}>{size} / pagina</option>
            ))}
          </select>
          <div className="space-x-1">
            <button className="px-2 py-1 border rounded" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>{'<'} Prev</button>
            <button className="px-2 py-1 border rounded" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next {'>'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
