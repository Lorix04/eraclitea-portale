"use client"
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

export default function ClienteAttestatiPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const { data, isLoading, isError } = useQuery({ queryKey: ['client-certificates', { page, status }], queryFn: async()=>{ const r=await fetch(`/api/client/certificates?page=${page}&limit=10&status=${status}`); if(!r.ok) throw new Error('err'); return r.json() } })
  const stats = data?.stats || { total:0, valid:0, expiring:0, expired:0 }
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">I Miei Attestati</h2>
        <div className="flex gap-2 text-xs mt-1">
          <span className="px-2 py-1 bg-gray-100 rounded">Totali: {stats.total}</span>
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Validi: {stats.valid}</span>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">In Scadenza: {stats.expiring}</span>
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded">Scaduti: {stats.expired}</span>
        </div>
      </div>
      <div className="bg-white border rounded p-3 flex items-center gap-2">
        <select className="border rounded px-2 py-1 text-sm" value={status} onChange={(e)=>{ setStatus(e.target.value); setPage(1) }}>
          <option value="">Tutti</option>
          <option value="valid">Validi</option>
          <option value="expiring">In Scadenza</option>
          <option value="expired">Scaduti</option>
        </select>
      </div>
      {isLoading ? <div className="bg-white border rounded p-6">Caricamento…</div> : isError ? <div className="bg-white border rounded p-6 text-danger">Errore</div> : (
        <div className="bg-white border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Dipendente</th><th className="text-left px-3 py-2">CF</th><th className="text-left px-3 py-2">Corso</th><th className="text-left px-3 py-2">Data</th><th className="text-left px-3 py-2">Scadenza</th><th className="text-left px-3 py-2">Azioni</th></tr></thead>
            <tbody>
              {data?.data?.map((c:any)=>(
                <tr key={c.id} className="even:bg-gray-50">
                  <td className="px-3 py-2">{c.employee.cognome} {c.employee.nome}</td>
                  <td className="px-3 py-2 font-mono text-xs">{c.employee.codiceFiscale}</td>
                  <td className="px-3 py-2">{c.course.title}</td>
                  <td className="px-3 py-2">{c.achievedAt?new Date(c.achievedAt).toLocaleDateString('it-IT'):'—'}</td>
                  <td className="px-3 py-2">{c.expiresAt?new Date(c.expiresAt).toLocaleDateString('it-IT'):'—'}</td>
                  <td className="px-3 py-2"><a className="text-accent" href={`/api/client/certificates/${c.id}/download`} target="_blank" rel="noreferrer">Download</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button className="border rounded px-3 py-1" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</button>
        <div className="text-sm">Pagina {page}</div>
        <button className="border rounded px-3 py-1" onClick={()=>setPage(p=>p+1)} disabled={(data?.data?.length||0)<10}>Next</button>
      </div>
    </div>
  )
}
