"use client"

import { useMemo, useState } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Eye, Filter, RefreshCw, FileSpreadsheet, FileText, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export interface Edizione {
  id: string
  corsoNome: string
  codice: string
  dal: string
  al: string
  oraInizio?: string
  oraFine?: string
  locazione: string
  partecipantiPrevisti: number
  iscrizioni: number
  fase: 'Conclusa' | 'Pubblicata' | 'In corso' | 'Bozza'
  allegati?: number
  note?: string
  azienda: string
  riservata?: boolean
}

interface EdizioniTableProps {
  data: Edizione[]
  variant: 'tutoraggio' | 'azienda'
}

function formatBool(value?: boolean) {
  if (value === undefined) return ''
  return value ? 'Si' : 'No'
}

export function EdizioniTable({ data, variant }: EdizioniTableProps) {
  const [globalFilter, setGlobalFilter] = useState('')

  const capienzaResiduaColumn: ColumnDef<Edizione> = useMemo(
    () => ({
      id: 'capienzaResidua',
      header: 'Capienza Residua',
      cell: ({ row }) => {
        const { iscrizioni, partecipantiPrevisti } = row.original
        const raw = partecipantiPrevisti > 0 ? (iscrizioni / partecipantiPrevisti) * 100 : 0
        const percentage = Math.min(Math.max(raw, 0), 100)

        let colorClass = 'bg-green-500'
        if (percentage >= 95) colorClass = 'bg-red-500'
        else if (percentage >= 70) colorClass = 'bg-orange-500'
        else if (percentage >= 30) colorClass = 'bg-[#1e3a5f]'

        return (
          <div className="w-24 bg-gray-200 h-4 rounded">
            <div className={`h-4 rounded ${colorClass}`} style={{ width: `${percentage}%` }} />
          </div>
        )
      },
    }),
    [],
  )

  const tutoraggioColumns: ColumnDef<Edizione>[] = useMemo(
    () => [
      {
        id: 'view',
        header: '',
        cell: ({ row }) => (
          <Link
            href={`/admin/corsi/${row.original.id}`}
            title="Apri edizione"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100"
          >
            <Eye className="h-4 w-4 text-blue-500" />
          </Link>
        ),
      },
      { accessorKey: 'corsoNome', header: 'Nome' },
      { accessorKey: 'codice', header: 'Codice' },
      { accessorKey: 'dal', header: 'Dal' },
      { accessorKey: 'al', header: 'Al' },
      { accessorKey: 'locazione', header: 'Locazione' },
      { accessorKey: 'partecipantiPrevisti', header: '# Partecipanti previsti' },
      { accessorKey: 'iscrizioni', header: '# Iscrizioni' },
      {
        accessorKey: 'fase',
        header: 'Fase',
        cell: ({ row }) => {
          const fase = row.getValue('fase') as string
          const badgeVariant =
            fase === 'Conclusa' ? 'secondary' : fase === 'Pubblicata' ? 'default' : 'outline'
          return <Badge variant={badgeVariant}>{fase}</Badge>
        },
      },
      { accessorKey: 'allegati', header: '# Allegati' },
      { accessorKey: 'note', header: 'Note' },
      { accessorKey: 'azienda', header: 'Azienda' },
    ],
    [],
  )

  const aziendaColumns: ColumnDef<Edizione>[] = useMemo(
    () => [
      {
        id: 'view',
        header: '',
        cell: ({ row }) => (
          <Link
            href={`/admin/corsi/${row.original.id}`}
            title="Apri edizione"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100"
          >
            <Eye className="h-4 w-4 text-blue-500" />
          </Link>
        ),
      },
      { accessorKey: 'corsoNome', header: 'Nome' },
      { accessorKey: 'codice', header: 'Codice' },
      { accessorKey: 'dal', header: 'Dal' },
      { accessorKey: 'al', header: 'Al' },
      { accessorKey: 'oraInizio', header: 'Ora inizio' },
      { accessorKey: 'oraFine', header: 'Ora Fine' },
      { accessorKey: 'locazione', header: 'Locazione' },
      { accessorKey: 'partecipantiPrevisti', header: '# Partecipanti previsti' },
      { accessorKey: 'iscrizioni', header: '# Iscrizioni' },
      capienzaResiduaColumn,
      {
        accessorKey: 'riservata',
        header: 'Riservata',
        cell: ({ row }) => formatBool(row.original.riservata),
      },
      {
        accessorKey: 'fase',
        header: 'Fase',
        cell: ({ row }) => <Badge variant="secondary">{row.getValue('fase') as string}</Badge>,
      },
      { accessorKey: 'azienda', header: 'Azienda' },
    ],
    [capienzaResiduaColumn],
  )

  const columns = variant === 'tutoraggio' ? tutoraggioColumns : aziendaColumns

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  })

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex items-center justify-between gap-4">
        {variant === 'azienda' && (
          <p className="text-sm text-gray-500">
            Trascina qui l'intestazione di una colonna per raggrupparla
          </p>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="icon" aria-label="Aggiorna">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Esporta Excel">
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Esporta PDF">
            <FileText className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cerca..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th colSpan={2} className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                Corso
              </th>
              <th
                colSpan={variant === 'azienda' ? 12 : 10}
                className="px-4 py-2 text-center text-xs font-semibold text-gray-600"
              >
                Edizione
              </th>
            </tr>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <Filter className="h-3 w-3 text-gray-400" />
                    </div>
                  </th>
                ))}
              </tr>
            ))}
            <tr className="border-b bg-gray-50">
              {table.getAllColumns().map((column) => (
                <th key={column.id} className="px-4 py-1">
                  <Input
                    placeholder="Q"
                    className="h-7 text-xs"
                    onChange={(e) => column.setFilterValue(e.target.value)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm whitespace-pre-line">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-sm text-gray-500 text-center">
                  Nessuna edizione trovata
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[5, 10, 15, 20].map((size) => (
            <Button
              key={size}
              variant={table.getState().pagination.pageSize === size ? 'default' : 'outline'}
              size="sm"
              onClick={() => table.setPageSize(size)}
            >
              {size}
            </Button>
          ))}
        </div>
        <div className="text-sm text-gray-500">
          Pagina {table.getState().pagination.pageIndex + 1} di {table.getPageCount()}
        </div>
      </div>
    </div>
  )
}
