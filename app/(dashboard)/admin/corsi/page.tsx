"use client"
import { useEffect, useState } from 'react'
import { useCoursesQuery } from '@/hooks/use-courses'
import { DataTable } from '@/components/tables/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { BadgeCheck, CalendarDays, Eye, MoreVertical, Pencil, Upload, Archive, Rocket } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

type Row = any

const columns: ColumnDef<Row>[] = [
  { header: 'Nome', accessorKey: 'title', cell: ({ row }) => <a href={`/admin/corsi/${row.original.id}`} className="text-accent hover:underline">{row.original.title}</a> },
  { header: 'Codice', accessorKey: 'id', cell: ({ row }) => <span className="font-mono text-xs">{String(row.original.id).slice(0,8)}…</span> },
  { header: 'Periodo', cell: ({ row }) => {
      const s = row.original.dateStart ? new Date(row.original.dateStart) : null
      const e = row.original.dateEnd ? new Date(row.original.dateEnd) : null
      const fmt = (d: Date) => d.toLocaleDateString('it-IT')
      return <span>{s ? fmt(s) : '—'} {s || e ? '→' : ''} {e ? fmt(e) : '—'}</span>
    }
  },
  { header: 'Iscrizioni', cell: ({ row }) => row.original._count?.registrations ?? 0 },
  { header: 'Fase', cell: ({ row }) => <span className={`px-2 py-1 rounded text-xs ${
      row.original.status === 'PUBLISHED' ? 'bg-blue-100 text-blue-700' :
      row.original.status === 'CLOSED' ? 'bg-green-100 text-green-700' :
      row.original.status === 'ARCHIVED' ? 'bg-gray-200 text-gray-600' : 'bg-yellow-100 text-yellow-700'
    }`}>{row.original.status}</span> },
  { header: 'Azioni', cell: ({ row }) => (
      <div className="flex gap-2 text-sm">
        <a className="text-accent" title="Visualizza" href={`/admin/corsi/${row.original.id}`}><Eye size={16}/></a>
        <a className="text-text-secondary" title="Modifica" href={`/admin/corsi/${row.original.id}`}><Pencil size={16}/></a>
        {row.original.status === 'DRAFT' && <a className="text-success" title="Pubblica" href={`/admin/corsi/${row.original.id}?action=publish`}><Rocket size={16}/></a>}
        {row.original.status !== 'ARCHIVED' && <a className="text-text-secondary" title="Archivia" href={`/admin/corsi/${row.original.id}?action=archive`}><Archive size={16}/></a>}
      </div>
    ) },
]

export default function AdminCorsiPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')
  const searchParams = useSearchParams()
  const packageId = searchParams.get('package') || undefined

  useEffect(() => {
    setPage(1)
  }, [packageId])

  const { data, isLoading, isError } = useCoursesQuery({
    page,
    limit: 10,
    search: search || undefined,
    status: status || undefined,
    packageId,
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><CalendarDays size={18}/> EDIZIONI</h2>
          <p className="text-sm text-text-secondary">Elenco delle edizioni dei corsi offerti per la formazione</p>
        </div>
        <a className="bg-primary text-white px-3 py-2 rounded" href="/admin/corsi/nuovo">Nuovo Corso</a>
      </div>
      <div className="bg-white border rounded p-3 flex gap-2 items-center">
        <input className="border rounded px-2 py-1 text-sm flex-1" placeholder="Cerca..." value={search} onChange={(e)=>{ setSearch(e.target.value); setPage(1) }} />
        <select className="border rounded px-2 py-1 text-sm" value={status} onChange={(e)=>{ setStatus(e.target.value); setPage(1) }}>
          <option value="">Tutti gli stati</option>
          <option value="DRAFT">Bozza</option>
          <option value="PUBLISHED">Pubblicato</option>
          <option value="CLOSED">Chiuso</option>
          <option value="ARCHIVED">Archiviato</option>
        </select>
      </div>
      {isLoading ? (
        <div className="bg-white border rounded p-6 text-sm text-text-secondary">Caricamento…</div>
      ) : isError ? (
        <div className="bg-white border rounded p-6 text-sm text-danger">Errore nel caricamento</div>
      ) : data && data.data.length > 0 ? (
        <DataTable columns={columns} data={data.data} serverSide pageCount={data.totalPages} />
      ) : (
        <div className="bg-white border rounded p-6 text-sm text-text-secondary">Nessun corso trovato</div>
      )}
      <div className="flex justify-end gap-2">
        <button className="border rounded px-3 py-1" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</button>
        <div className="text-sm">Pagina {page} di {data?.totalPages || 1}</div>
        <button className="border rounded px-3 py-1" onClick={()=>setPage(p=>Math.min((data?.totalPages||1),p+1))} disabled={page>=(data?.totalPages||1)}>Next</button>
      </div>
    </div>
  )
}
