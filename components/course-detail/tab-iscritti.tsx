"use client"
import { useState } from 'react'
import { useCourseRegistrationsQuery } from '@/hooks/use-course-registrations'

export default function TabIscritti({ courseId }: { courseId: string }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useCourseRegistrationsQuery(courseId, { page, limit: 10 })
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button className="border rounded px-3 py-1">Aggiungi iscritti</button>
          <a className="border rounded px-3 py-1" href={`/api/admin/registrations/export?courseId=${courseId}`} target="_blank">Export CSV</a>
        </div>
      </div>
      {isLoading ? <div className="bg-white border rounded p-6">Caricamento…</div> : isError ? <div className="bg-white border rounded p-6 text-danger">Errore</div> : (
        <div className="bg-white border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">CID</th>
                <th className="px-3 py-2 text-left">Cognome</th>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">CF</th>
                <th className="px-3 py-2 text-left">Azienda</th>
                <th className="px-3 py-2 text-left">Iscritto</th>
                <th className="px-3 py-2 text-left">Presenze</th>
                <th className="px-3 py-2 text-left">Attestato</th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((r:any)=> (
                <tr key={r.id} className="even:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{String(r.id).slice(0,8)}…</td>
                  <td className="px-3 py-2">{r.employee.cognome}</td>
                  <td className="px-3 py-2">{r.employee.nome}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.employee.codiceFiscale}</td>
                  <td className="px-3 py-2">{r.client.ragioneSociale}</td>
                  <td className="px-3 py-2">{new Date(r.insertedAt).toLocaleDateString('it-IT')}</td>
                  <td className="px-3 py-2">{r.presenceSummary}</td>
                  <td className="px-3 py-2">{r.hasCertificate ? 'Sì' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button className="border rounded px-3 py-1" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</button>
        <div className="text-sm">Pagina {page} di {data?.totalPages || 1}</div>
        <button className="border rounded px-3 py-1" onClick={()=>setPage(p=>Math.min((data?.totalPages||1),p+1))} disabled={page>=(data?.totalPages||1)}>Next</button>
      </div>
    </div>
  )
}
