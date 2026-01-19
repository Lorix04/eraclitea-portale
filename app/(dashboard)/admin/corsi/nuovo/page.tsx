"use client"
import { useRouter } from 'next/navigation'
import CourseForm from '@/components/forms/course-form'
import { useCreateCourseMutation } from '@/hooks/use-courses'

export default function AdminNuovoCorsoPage() {
  const router = useRouter()
  const create = useCreateCourseMutation()

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Nuovo corso</h2>
      <div className="bg-white border rounded p-4">
        <div className="flex gap-2 mb-3">
          <button className="border rounded px-3 py-1" onClick={()=>router.push('/admin/corsi')}>Annulla</button>
        </div>
        <div className="space-y-4">
          <CourseForm
            submitLabel="Salva come bozza"
            onSubmit={async (vals)=>{
              await create.mutateAsync({ ...vals, status: 'DRAFT' })
              router.push('/admin/corsi')
            }}
          />
          <CourseForm
            submitLabel="Pubblica"
            onSubmit={async (vals)=>{
              await create.mutateAsync({ ...vals, status: 'PUBLISHED' })
              router.push('/admin/corsi')
            }}
          />
        </div>
      </div>
    </div>
  )
}
