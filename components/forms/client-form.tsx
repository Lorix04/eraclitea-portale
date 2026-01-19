"use client"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clientSchema } from '@/lib/validations/client'
import { z } from 'zod'

export type ClientFormValues = z.infer<typeof clientSchema>

export default function ClientForm({ onSubmit, defaultValues, mode = 'create' }: { onSubmit: (data: Partial<ClientFormValues>) => Promise<void> | void; defaultValues?: Partial<ClientFormValues>; mode?: 'create'|'edit' }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Partial<ClientFormValues>>({ resolver: zodResolver(clientSchema.partial()), defaultValues })

  return (
    <form onSubmit={handleSubmit(async (vals)=>{ await onSubmit(vals) })} className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Ragione Sociale*</label>
          <input className="w-full border rounded px-3 py-2" {...register('ragioneSociale', { required: true })} />
          {errors.ragioneSociale && <p className="text-danger text-xs">Obbligatorio</p>}
        </div>
        <div>
          <label className="block text-sm mb-1">P.IVA*</label>
          <input className="w-full border rounded px-3 py-2" {...register('piva', { required: true })} />
          {errors.piva && <p className="text-danger text-xs">P.IVA non valida (11 cifre)</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1">Indirizzo</label>
        <input className="w-full border rounded px-3 py-2" {...register('indirizzo')} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Referente Nome*</label>
          <input className="w-full border rounded px-3 py-2" {...register('referenteNome', { required: true })} />
          {errors.referenteNome && <p className="text-danger text-xs">Obbligatorio</p>}
        </div>
        <div>
          <label className="block text-sm mb-1">Referente Email*</label>
          <input className="w-full border rounded px-3 py-2" type="email" {...register('referenteEmail', { required: true })} />
          {errors.referenteEmail && <p className="text-danger text-xs">Email non valida</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1">Telefono</label>
        <input className="w-full border rounded px-3 py-2" {...register('telefono')} />
      </div>
      <div className="flex gap-2">
        <button disabled={isSubmitting} className="bg-primary text-white rounded px-4 py-2">{mode === 'create' ? 'Crea' : 'Salva'}</button>
      </div>
    </form>
  )
}
