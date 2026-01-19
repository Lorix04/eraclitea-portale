"use client"
export default function CourseCard({ course, onManage }: { course: any; onManage: (id: string)=>void }) {
  const ratio = Math.min(100, Math.round(((course.clientData?.registrationCount||0) / (course.capacity || 100)) * 100))
  return (
    <div className="border rounded bg-white p-4 hover:shadow transition">
      <div className="flex justify-between items-start">
        <div className="font-semibold">{course.title}</div>
        {course.isNew && <span className="text-[10px] bg-accent text-white px-1 rounded animate-pulse">NUOVO</span>}
      </div>
      <div className="text-sm text-text-secondary line-clamp-3 my-2">{course.description || '—'}</div>
      <div className="text-xs text-text-secondary">📅 {course.dateStart?new Date(course.dateStart).toLocaleDateString('it-IT'):''} → {course.dateEnd?new Date(course.dateEnd).toLocaleDateString('it-IT'):''}</div>
      <div className="text-xs text-text-secondary">📍 {course.location || '—'} • 👥 {course.modalita || '—'}</div>
      <div className="h-2 bg-gray-200 rounded my-3"><div className={`h-2 rounded ${ratio===0?'bg-gray-300':ratio<100?'bg-yellow-400':'bg-green-500'}`} style={{ width: `${ratio}%` }}/></div>
      <div className="flex items-center justify-between text-sm">
        <div>{course.clientData?.registrationCount || 0} dipendenti iscritti</div>
        <button className="text-accent" onClick={()=>onManage(course.id)}>{course.status==='PUBLISHED'?'Gestisci Iscrizioni':'Visualizza'}</button>
      </div>
      {course.isDeadlineSoon && <div className="text-xs text-danger mt-2">URGENTE: scadenza entro 7 giorni</div>}
      {course.isDeadlinePassed && <div className="text-xs text-text-secondary mt-1">Deadline passata</div>}
    </div>
  )
}
