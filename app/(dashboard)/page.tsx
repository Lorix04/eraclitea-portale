import { StatsGrid } from '@/components/dashboard/stats-grid'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Home as HomeIcon } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if ((session.user as any).role === 'CLIENT') redirect('/cliente')

  const stats = { tassoAssenze: 0.2, tassoConseguimento: 97.9, tassoRiempimento: 57.6, postiTotali: 0, postiDisponibili: 0, postiOccupati: 0, pubblicate: 0, inCorso: 0, concluse: 228 }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-md bg-[#e0f2fe]"><HomeIcon className="h-6 w-6 text-[#3b82f6]" /></div>
          <div>
            <h1 className="text-[24px] font-bold text-[#1e3a5f] leading-none">HOME</h1>
            <p className="text-[14px] text-gray-500">Panoramica sullo stato del sistema</p>
          </div>
        </div>
      </div>
      <div className="mb-4"><h2 className="text-[16px] font-semibold text-[#1e3a5f]">EDIZIONI</h2></div>
      <StatsGrid data={stats} />
    </div>
  )
}
