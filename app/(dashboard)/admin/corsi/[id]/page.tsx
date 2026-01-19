"use client"
import { useCourseQuery } from '@/hooks/use-courses'
import { Tabs } from '@/components/ui/tabs-custom'
import TabEdizione from '@/components/course-detail/tab-edizione'
import TabIscritti from '@/components/course-detail/tab-iscritti'
import TabSessioni from '@/components/course-detail/tab-sessioni'
import TabAttestati from '@/components/course-detail/tab-attestati'
import TabAllegati from '@/components/course-detail/tab-allegati'

export default function AdminCorsoDettaglioPage({ params }: { params: { id: string } }) {
  const { data: course, isLoading } = useCourseQuery(params.id)
  if (isLoading) return <div className="bg-white border rounded p-6">Caricamento…</div>
  if (!course) return <div className="bg-white border rounded p-6 text-danger">Corso non trovato</div>
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{String(course.id).slice(0,6).toUpperCase()} - {course.title}</h2>
        <p className="text-sm text-text-secondary">Dettaglio edizione</p>
      </div>
      <Tabs
        tabs={[
          { key: 'edizione', label: 'Edizione', content: <TabEdizione course={course} /> },
          { key: 'iscritti', label: 'Iscritti', content: <TabIscritti courseId={params.id} /> },
          { key: 'sessioni', label: 'Sessioni', content: <TabSessioni courseId={params.id} /> },
          { key: 'attestati', label: 'Attestati', content: <TabAttestati courseId={params.id} /> },
          { key: 'allegati', label: 'Allegati', content: <TabAllegati courseId={params.id} /> },
        ]}
      />
    </div>
  )
}
