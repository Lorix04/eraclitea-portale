"use client"
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import CourseCard from '@/components/client/course-card'
import { DataTable } from '@/components/tables/data-table'
import { ColumnDef } from '@tanstack/react-table'

export default function ClienteCorsiPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'cards'|'table'>('cards')
  const { data, isLoading, isError } = useQuery({ queryKey: ['client-courses', { page, search }], queryFn: async ()=>{ const r=await fetch(`/api/client/courses?page=${page}&limit=9&search=${encodeURIComponent(search)}`); if(!r.ok) throw new Error('err'); return r.json() } })

  const cols: ColumnDef<any>[] = [
    { header: 'Corso', accessorKey: 'title' },
    { header: 'Periodo', cell: ({ row }) => { const c = row.original; return `${c.dateStart?new Date(c.dateStart).toLocaleDateString('it-IT'):''} → ${c.dateEnd?new Date(c.dateEnd).toLocaleDateString('it-IT'):''}` } },
    { header: 'Deadline', cell: ({ row }) => row.original.deadlineRegistry ? new Date(row.original.deadlineRegistry).toLocaleDateString('it-IT') : '—' },
    { header: 'Iscritti', cell: ({ row }) => row.original.clientData?.registrationCount || 0 },
    { header: 'Azioni', cell: ({ row }) => <a className="text-accent" href={`/cliente/corsi/${row.original.id}`}>{row.original.status==='PUBLISHED'?'Gestisci':'Visualizza'}</a> },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">I Miei Corsi</h2>
          <p className="text-sm text-text-secondary">Corsi di formazione disponibili</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="border rounded px-2 py-1 text-sm" placeholder="Cerca..." value={search} onChange={(e)=>{ setSearch(e.target.value); setPage(1) }} />
          <button className={`border rounded px-2 py-1 text-sm ${view==='cards'?'bg-accent text-white':''}`} onClick={()=>setView('cards')}>Cards</button>
          <button className={`border rounded px-2 py-1 text-sm ${view==='table'?'bg-accent text-white':''}`} onClick={()=>setView('table')}>Tabella</button>
        </div>
      </div>
      {isLoading ? <div className="bg-white border rounded p-6">Caricamento…</div> : isError ? <div className="bg-white border rounded p-6 text-danger">Errore</div> : (
        view==='cards' ? (
          data?.data?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.data.map((c:any)=>(<CourseCard key={c.id} course={c} onManage={(id)=>{ window.location.href=`/cliente/corsi/${id}` }} />))}
            </div>
          ) : <div className="bg-white border rounded p-6 text-sm text-text-secondary">Nessun corso disponibile al momento</div>
        ) : (
          <DataTable columns={cols} data={data?.data || []} serverSide pageCount={data?.totalPages || 1} />
        )
      )}
      <div className="flex justify-end gap-2">
        <button className="border rounded px-3 py-1" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</button>
        <div className="text-sm">Pagina {page} di {data?.totalPages || 1}</div>
        <button className="border rounded px-3 py-1" onClick={()=>setPage(p=>Math.min((data?.totalPages||1),p+1))} disabled={page>=(data?.totalPages||1)}>Next</button>
      </div>
    </div>
  )
}
