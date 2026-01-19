"use client"
import { useClientsQuery } from '@/hooks/use-clients'
import { DataTable } from '@/components/tables/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'

type Row = any
const columns: ColumnDef<Row>[] = [
  { header: 'Ragione Sociale', accessorKey: 'ragioneSociale' },
  { header: 'P.IVA', accessorKey: 'piva' },
  { header: 'Referente', cell: ({ row }) => <div><div>{row.original.referenteNome}</div><div className="text-xs text-text-secondary">{row.original.referenteEmail}</div></div> },
  { header: 'Dipendenti', cell: ({ row }) => row.original._count?.employees ?? 0 },
  { header: 'Stato', cell: ({ row }) => <span className={`px-2 py-1 text-xs rounded ${row.original.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{row.original.isActive ? 'Attivo' : 'Disattivo'}</span> },
  { header: 'Azioni', cell: ({ row }) => <a className="text-accent" href={`/admin/clienti/${row.original.id}`}>Dettaglio</a> },
]

export default function AdminClientiPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState('')
  const { data, isLoading, isError } = useClientsQuery({ page, limit: 10, search: search || undefined, isActive: active || undefined })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">CLIENTI</h2>
        <a className="bg-primary text-white px-3 py-2 rounded" href="#" onClick={(e)=>{ e.preventDefault(); alert('Usa il form nella pagina dettaglio per creare un cliente') }}>Nuovo Cliente</a>
      </div>
      <div className="bg-white border rounded p-3 flex gap-2 items-center">
        <input className="border rounded px-2 py-1 text-sm flex-1" placeholder="Cerca..." value={search} onChange={(e)=>{ setSearch(e.target.value); setPage(1) }} />
        <select className="border rounded px-2 py-1 text-sm" value={active} onChange={(e)=>{ setActive(e.target.value); setPage(1) }}>
          <option value="">Tutti</option>
          <option value="true">Attivi</option>
          <option value="false">Disattivi</option>
        </select>
      </div>
      {isLoading ? (
        <div className="bg-white border rounded p-6 text-sm text-text-secondary">Caricamento…</div>
      ) : isError ? (
        <div className="bg-white border rounded p-6 text-sm text-danger">Errore nel caricamento</div>
      ) : data && data.data.length > 0 ? (
        <DataTable columns={columns} data={data.data} serverSide pageCount={data.totalPages} />
      ) : (
        <div className="bg-white border rounded p-6 text-sm text-text-secondary">Nessun cliente trovato</div>
      )}
      <div className="flex justify-end gap-2">
        <button className="border rounded px-3 py-1" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</button>
        <div className="text-sm">Pagina {page} di {data?.totalPages || 1}</div>
        <button className="border rounded px-3 py-1" onClick={()=>setPage(p=>Math.min((data?.totalPages||1),p+1))} disabled={page>=(data?.totalPages||1)}>Next</button>
      </div>
    </div>
  )
}
