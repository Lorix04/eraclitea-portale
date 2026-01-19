import { Timeline } from '@/components/ui/timeline'
import { Clock, Play, Activity, X } from 'lucide-react'

export default function TabEdizione({ course }: { course: any }) {
  const steps = [] as { icon: any; title: string; date?: string; status: 'completed'|'current'|'pending' }[]
  if (course.createdAt) steps.push({ icon: <Clock size={14}/>, title: 'CREAZIONE', date: new Date(course.createdAt).toLocaleString('it-IT'), status: course.status==='DRAFT'?'current':'completed' })
  if (course.status === 'PUBLISHED' || course.status === 'CLOSED') steps.push({ icon: <Play size={14}/>, title: 'PUBBLICATA', date: new Date(course.updatedAt).toLocaleString('it-IT'), status: course.status==='PUBLISHED'?'current':'completed' })
  if (course.dateStart) steps.push({ icon: <Activity size={14}/>, title: 'IN CORSO', date: new Date(course.dateStart).toLocaleString('it-IT'), status: course.status==='PUBLISHED'?'current': (course.status==='CLOSED'?'completed':'pending') })
  if (course.status === 'CLOSED') steps.push({ icon: <X size={14}/>, title: 'CONCLUSA', date: new Date(course.updatedAt).toLocaleString('it-IT'), status: 'current' })
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-2 bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Informazioni</h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div><div className="text-text-secondary">Corso</div><div className="font-medium">{course.title}</div></div>
          <div><div className="text-text-secondary">Modalità</div><div className="font-medium">{course.modalita || '—'}</div></div>
          <div><div className="text-text-secondary">Partecipanti previsti</div><div className="font-medium">{course.capacity ?? '—'}</div></div>
          <div><div className="text-text-secondary">Sede</div><div className="font-medium">{course.location || '—'}</div></div>
        </div>
      </div>
      <div className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Stato edizione</h3>
        <Timeline steps={steps} />
      </div>
    </div>
  )
}
