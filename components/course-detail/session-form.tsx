"use client"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sessionPartialSchema } from '@/lib/validations/session'
import { z } from 'zod'
import { DatePicker } from '@/components/ui/date-picker'
import { TimeInput } from '@/components/ui/time-input'

export type SessionFormValues = z.infer<typeof sessionPartialSchema>

export default function SessionForm({ defaultValues, onSubmit, onDelete }: { defaultValues?: Partial<SessionFormValues>; onSubmit: (v: Partial<SessionFormValues>) => Promise<void>|void; onDelete?: () => Promise<void>|void }) {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Partial<SessionFormValues>>({ resolver: zodResolver(sessionPartialSchema), defaultValues })

  return (
    <form onSubmit={handleSubmit(async (vals)=>{ await onSubmit(vals) })} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Data</label>
          <DatePicker value={defaultValues?.date ? new Date(defaultValues.date).toISOString().slice(0,10) : undefined} onChange={(e:any)=>setValue('date' as any, new Date(e.target.value) as any)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Aula</label>
          <input className="w-full border rounded px-3 py-2" {...register('aula')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Inizio</label>
          <TimeInput defaultValue={defaultValues?.startTime} onChange={(e:any)=>setValue('startTime' as any, e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Fine</label>
          <TimeInput defaultValue={defaultValues?.endTime} onChange={(e:any)=>setValue('endTime' as any, e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Pausa inizio</label>
          <TimeInput defaultValue={defaultValues?.pauseStart} onChange={(e:any)=>setValue('pauseStart' as any, e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Pausa fine</label>
          <TimeInput defaultValue={defaultValues?.pauseEnd} onChange={(e:any)=>setValue('pauseEnd' as any, e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Docente</label>
          <input className="w-full border rounded px-3 py-2" {...register('docente')} />
        </div>
        <div>
          <label className="block text-sm mb-1">Tutor</label>
          <input className="w-full border rounded px-3 py-2" {...register('tutor')} />
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1">Modalità presenza</label>
        <select className="w-full border rounded px-3 py-2" {...register('modalita')}>
          <option value="">Seleziona</option>
          <option>In presenza</option>
          <option>FAD sincrona</option>
          <option>FAD asincrona</option>
          <option>Blended</option>
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">Note</label>
        <textarea className="w-full border rounded px-3 py-2" rows={4} {...register('note')} />
      </div>
      <div className="flex gap-2">
        <button disabled={isSubmitting} className="bg-primary text-white rounded px-4 py-2">Salva</button>
        {onDelete && <button type="button" onClick={()=>onDelete()} className="border rounded px-4 py-2">Elimina</button>}
      </div>
    </form>
  )
}
