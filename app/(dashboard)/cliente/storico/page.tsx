"use client"
import { useQuery } from '@tanstack/react-query'

export default function ClienteStoricoPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['client-history'], queryFn: async()=>{ const r=await fetch('/api/client/history'); if(!r.ok) throw new Error('err'); return r.json() } })
  const s = data?.summary || { totalCourses:0, totalEmployeesTrained:0, totalCertificates:0, averageAttendance:0 }
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Storico Formazione</h2>
        <p className="text-sm text-text-secondary">Riepilogo dei corsi di formazione completati</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded p-4"><div className="text-sm text-text-secondary">Corsi completati</div><div className="text-2xl font-semibold">{s.totalCourses}</div></div>
        <div className="bg-white border rounded p-4"><div className="text-sm text-text-secondary">Dipendenti formati</div><div className="text-2xl font-semibold">{s.totalEmployeesTrained}</div></div>
        <div className="bg-white border rounded p-4"><div className="text-sm text-text-secondary">Attestati</div><div className="text-2xl font-semibold">{s.totalCertificates}</div></div>
        <div className="bg-white border rounded p-4"><div className="text-sm text-text-secondary">Tasso presenze medio</div><div className="text-2xl font-semibold">{s.averageAttendance}%</div></div>
      </div>
      {isLoading ? <div className="bg-white border rounded p-6">Caricamento…</div> : isError ? <div className="bg-white border rounded p-6 text-danger">Errore</div> : (
        <div className="space-y-2">
          {data?.courses?.map((c:any)=> (
            <details key={c.id} className="bg-white border rounded">
              <summary className="px-3 py-2 cursor-pointer flex justify-between items-center">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-text-secondary">{c.dateStart?new Date(c.dateStart).toLocaleDateString('it-IT'):''} → {c.dateEnd?new Date(c.dateEnd).toLocaleDateString('it-IT'):''}</div>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 bg-gray-100 rounded">{c.clientStats.employeesTrained} formati</span>
                  <span className="px-2 py-1 bg-gray-100 rounded">{c.clientStats.certificatesIssued} attestati</span>
                </div>
              </summary>
              <div className="p-3 text-sm">Tasso presenze: {c.clientStats.attendanceRate}%</div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
