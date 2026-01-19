import { BarChart3, CheckCircle, UserX, Users, Building2 } from 'lucide-react'
import { StatsCard } from './stats-card'

interface StatsGridProps {
  data: {
    tassoAssenze: number
    tassoConseguimento: number
    tassoRiempimento: number
    postiTotali: number
    postiDisponibili: number
    postiOccupati: number
    pubblicate: number
    inCorso: number
    concluse: number
  }
}

export function StatsGrid({ data }: StatsGridProps) {
  const occupancy = data.postiTotali > 0 ? (data.postiOccupati / data.postiTotali) * 100 : 0
  const availability = data.postiTotali > 0 ? (data.postiDisponibili / data.postiTotali) * 100 : 0
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <StatsCard title="TASSO ASSENZE" value={`${data.tassoAssenze.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`} icon={UserX} iconBgColor="bg-[#dbeafe]" iconColor="text-[#3b82f6]" />
        <StatsCard title="TASSO CONSEGUIMENTO" value={`${data.tassoConseguimento.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`} icon={CheckCircle} iconBgColor="bg-[#d1fae5]" iconColor="text-[#22c55e]" />
        <StatsCard title="TASSO RIEMPIMENTO" value={`${data.tassoRiempimento.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`} icon={BarChart3} iconBgColor="bg-[#fef3c7]" iconColor="text-[#f59e0b]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="POSTI TOTALI" value={data.postiTotali} subtitle="(EDIZIONI PUBBLICATE)" icon={Users} iconBgColor="bg-[#dbeafe]" iconColor="text-[#3b82f6]" progress={{ value: 100, color: 'bg-[#3b82f6]' }} />
        <StatsCard title="POSTI DISPONIBILI" value={data.postiDisponibili} subtitle="(EDIZIONI PUBBLICATE)" icon={Users} iconBgColor="bg-[#fee2e2]" iconColor="text-[#ef4444]" belowLabel={`${Math.round(availability)}%`} belowLabelClassName="text-[#ef4444]" progressSegments={[{ value: occupancy, color: 'bg-[#3b82f6]' }, { value: 100 - occupancy, color: 'bg-gray-300' }]} />
        <StatsCard title="POSTI OCCUPATI" value={data.postiOccupati} subtitle="(EDIZIONI PUBBLICATE)" icon={Users} iconBgColor="bg-[#dbeafe]" iconColor="text-[#3b82f6]" belowLabel={`${Math.round(occupancy)}%`} belowLabelClassName="text-[#3b82f6]" progress={{ value: occupancy, color: 'bg-[#3b82f6]' }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="PUBBLICATE" value={data.pubblicate} icon={Building2} iconBgColor="bg-[#eff6ff]" iconColor="text-[#93c5fd]" belowLabel={`${data.pubblicate === 0 ? 0 : Math.round((data.pubblicate/(data.pubblicate+data.inCorso+data.concluse))*100)}%`} belowLabelClassName="text-[#22c55e]" progress={{ value: 0, color: 'bg-gray-300' }} />
        <StatsCard title="IN CORSO" value={data.inCorso} icon={Building2} iconBgColor="bg-[#eff6ff]" iconColor="text-[#93c5fd]" belowLabel={`${data.inCorso === 0 ? 0 : Math.round((data.inCorso/(data.pubblicate+data.inCorso+data.concluse))*100)}%`} belowLabelClassName="text-[#22c55e]" progress={{ value: 0, color: 'bg-gray-300' }} />
        <StatsCard title="CONCLUSE" value={data.concluse} icon={Building2} iconBgColor="bg-[#eff6ff]" iconColor="text-[#93c5fd]" belowLabel={`100%`} belowLabelClassName="text-[#22c55e]" progress={{ value: 100, color: 'bg-[#22c55e]' }} />
      </div>
    </div>
  )
}
