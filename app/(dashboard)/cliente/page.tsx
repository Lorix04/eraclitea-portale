"use client"
import { useQuery } from '@tanstack/react-query'
import { Users, GraduationCap, Award, AlertTriangle } from 'lucide-react'
import StatsCard from '@/components/dashboard/stats-card'

export default function ClienteDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['client-dashboard'], queryFn: async()=>{ const r=await fetch('/api/client/dashboard'); if(!r.ok) throw new Error('err'); return r.json() } })

  const stats = data?.stats || { totalEmployees: 0, coursesCompleted: 0, certificatesTotal: 0, certificatesExpiring: 0 }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Dipendenti" value={stats.totalEmployees} icon={Users} iconColor="#3b82f6" />
        <StatsCard title="Corsi Completati" value={stats.coursesCompleted} icon={GraduationCap} iconColor="#22c55e" />
        <StatsCard title="Attestati" value={stats.certificatesTotal} icon={Award} iconColor="#7c3aed" />
        <StatsCard title="In Scadenza" value={stats.certificatesExpiring} icon={AlertTriangle} iconColor="#eab308" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border rounded p-4">
          <h3 className="font-semibold mb-2">Corsi Nuovi</h3>
          <div className="space-y-2">
            {data?.newCourses?.length ? data.newCourses.map((c:any)=>(
              <div key={c.id} className="border rounded p-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.title} <span className="text-xs bg-accent text-white px-1 rounded animate-pulse">NUOVO</span></div>
                  <div className="text-xs text-text-secondary">{c.dateStart?new Date(c.dateStart).toLocaleDateString('it-IT'):''} → {c.dateEnd?new Date(c.dateEnd).toLocaleDateString('it-IT'):''}</div>
                </div>
                <a className="text-accent text-sm" href={`/cliente/corsi/${c.id}`}>Vai al corso →</a>
              </div>
            )) : <div className="text-sm text-text-secondary">Nessun nuovo corso disponibile</div>}
          </div>
          <div className="text-right mt-2"><a className="text-accent text-sm" href="/cliente/corsi">Vedi tutti i corsi →</a></div>
        </div>
        <div className="bg-white border rounded p-4">
          <h3 className="font-semibold mb-2">Da Completare</h3>
          <div className="space-y-2">
            {data?.pendingRegistrations?.length ? data.pendingRegistrations.map((p:any)=>(
              <div key={p.courseId} className="border rounded p-2">
                <div className="font-medium">{p.courseTitle}</div>
                <div className="h-2 bg-gray-200 rounded mt-2"><div className="h-2 bg-accent rounded" style={{width: `${Math.min(100,p.registeredCount)}%`}}/></div>
                <div className="text-xs text-text-secondary mt-1">Iscritti: {p.registeredCount} • Scadenza: {p.deadline?new Date(p.deadline).toLocaleDateString('it-IT'):'—'}</div>
                <div className="text-right"><a className="text-accent text-sm" href={`/cliente/corsi/${p.courseId}`}>Compila →</a></div>
              </div>
            )) : <div className="text-sm text-text-secondary">Tutto in regola! ✓</div>}
          </div>
        </div>
      </div>
      <div className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Attestati Recenti</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Dipendente</th><th className="text-left px-3 py-2">Corso</th><th className="text-left px-3 py-2">Data</th><th className="text-left px-3 py-2">Scadenza</th></tr></thead>
          <tbody>
            {data?.recentCertificates?.map((r:any)=>(
              <tr key={r.id} className="even:bg-gray-50"><td className="px-3 py-2">{r.employeeName}</td><td className="px-3 py-2">{r.courseName}</td><td className="px-3 py-2">{new Date(r.achievedAt).toLocaleDateString('it-IT')}</td><td className="px-3 py-2">{r.expiresAt?new Date(r.expiresAt).toLocaleDateString('it-IT'):'—'}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="text-right mt-2"><a className="text-accent text-sm" href="/cliente/attestati">Vedi tutti gli attestati →</a></div>
      </div>
      {data?.unreadNotifications>0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-3">Hai {data.unreadNotifications} notifiche non lette. <a className="underline" href="/cliente/notifiche">Visualizza →</a></div>
      )}
    </div>
  )
}
