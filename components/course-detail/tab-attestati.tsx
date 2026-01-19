"use client"
import { useCourseRegistrationsQuery } from '@/hooks/use-course-registrations'
import { useState } from 'react'
import UploadCertificateDialog from '@/components/dialogs/upload-certificate-dialog'

export default function TabAttestati({ courseId }: { courseId: string }) {
  const { data, refetch } = useCourseRegistrationsQuery(courseId, { page: 1, limit: 50 })
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  return (
    <div className="bg-white border rounded">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Cognome</th>
            <th className="px-3 py-2 text-left">Nome</th>
            <th className="px-3 py-2 text-left">Struttura</th>
            <th className="px-3 py-2 text-left">Attestato</th>
          </tr>
        </thead>
        <tbody>
          {data?.data?.map((r:any)=> (
            <tr key={r.id} className="even:bg-gray-50">
              <td className="px-3 py-2">{r.employee.cognome}</td>
              <td className="px-3 py-2">{r.employee.nome}</td>
              <td className="px-3 py-2">{r.client.ragioneSociale}</td>
              <td className="px-3 py-2">{r.hasCertificate ? <a className="text-accent" href="#">Download</a> : <button className="border rounded px-2 py-1" onClick={()=>{ setSelected(r); setOpen(true) }}>Carica attestato…</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected && <UploadCertificateDialog open={open} onOpenChange={setOpen} courseId={courseId} employeeId={selected.employee.id} clientId={selected.client.id} employeeName={`${selected.employee.nome} ${selected.employee.cognome}`} onSuccess={()=>{ refetch(); }} />}
    </div>
  )
}
