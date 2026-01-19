"use client"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { courseSchema } from '@/lib/validations/course'
import { z } from 'zod'

export type CourseFormValues = z.infer<typeof courseSchema>

export default function CourseForm({ onSubmit, defaultValues, submitLabel = 'Salva' }: { onSubmit: (data: Partial<CourseFormValues>) => Promise<void> | void; defaultValues?: Partial<CourseFormValues>; submitLabel?: string }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Partial<CourseFormValues>>({ resolver: zodResolver(courseSchema.partial()), defaultValues })
  const dateStart = watch('dateStart') as Date | undefined
  const dateEnd = watch('dateEnd') as Date | undefined

  return (
    <form onSubmit={handleSubmit(async (vals)=>{
      // Cross-field validation
      if (vals.dateStart && vals.dateEnd && new Date(vals.dateEnd) < new Date(vals.dateStart)) throw new Error('Data fine < Data inizio')
      if (vals.deadlineRegistry && vals.dateStart && new Date(vals.deadlineRegistry) > new Date(vals.dateStart)) throw new Error('Deadline > Data inizio')
      await onSubmit(vals)
    })} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Titolo*</label>
        <input className="w-full border rounded px-3 py-2" {...register('title', { required: true })} />
        {errors.title && <p className="text-danger text-xs">Titolo obbligatorio</p>}
      </div>
      <div>
        <label className="block text-sm mb-1">Descrizione</label>
        <textarea className="w-full border rounded px-3 py-2" rows={4} {...register('description')} />
      </div>
      <div>
        <label className="block text-sm mb-1">Categoria</label>
        <select className="w-full border rounded px-3 py-2" {...register('category')}>
          <option value="">Seleziona</option>
          <option value="Sicurezza">Sicurezza</option>
          <option value="Privacy">Privacy</option>
          <option value="Antincendio">Antincendio</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1">Data inizio</label>
          <input type="date" className="w-full border rounded px-3 py-2" {...register('dateStart' as any)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Data fine</label>
          <input type="date" className="w-full border rounded px-3 py-2" {...register('dateEnd' as any)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Deadline iscrizioni</label>
          <input type="date" className="w-full border rounded px-3 py-2" {...register('deadlineRegistry' as any)} />
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={isSubmitting} className="bg-primary text-white rounded px-4 py-2">{submitLabel}</button>
      </div>
    </form>
  )
}
