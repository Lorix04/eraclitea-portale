"use client"
import { useState } from 'react'
import { useAttachmentsQuery, useUploadAttachmentMutation } from '@/hooks/use-attachments'

export default function TabAllegati({ courseId }: { courseId: string }) {
  const [filters, setFilters] = useState<Record<string,string>>({})
  const { data: items = [] } = useAttachmentsQuery(courseId, filters)
  const upload = useUploadAttachmentMutation(courseId)

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    for (const f of files) {
      const fd = new FormData()
      fd.set('file', f)
      fd.set('ambito', 'Edizione')
      fd.set('tipo', 'Documento')
      await upload.mutateAsync(fd)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button className="border rounded px-3 py-1" onClick={()=>document.getElementById('file-input')?.click()}>Carica file</button>
        <input id="file-input" type="file" multiple className="hidden" onChange={async (e)=>{
          const files = Array.from(e.target.files || [])
          for (const f of files) { const fd = new FormData(); fd.set('file', f); fd.set('ambito','Edizione'); fd.set('tipo','Documento'); await upload.mutateAsync(fd) }
        }} />
        <button className="border rounded px-3 py-1" onClick={()=>{ /* refresh auto via React Query */ }}>Refresh</button>
      </div>
      <div onDragOver={(e)=>e.preventDefault()} onDrop={onDrop} className="border-2 border-dashed rounded p-6 text-center text-sm text-text-secondary">Trascina qui i file da caricare</div>
      <div className="bg-white border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Ambito</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Nome file</th>
              <th className="px-3 py-2 text-left">Dimensioni</th>
              <th className="px-3 py-2 text-left">Interno</th>
              <th className="px-3 py-2 text-left">Caricato</th>
              <th className="px-3 py-2 text-left">Ultimo scarico</th>
              <th className="px-3 py-2 text-left"># Scaricato</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a:any)=> (
              <tr key={a.id} className="even:bg-gray-50">
                <td className="px-3 py-2">{a.ambito}</td>
                <td className="px-3 py-2">{a.tipo}</td>
                <td className="px-3 py-2">{a.fileName}</td>
                <td className="px-3 py-2">{(a.fileSize/1024/1024).toFixed(2)} MB</td>
                <td className="px-3 py-2">{a.isInternal ? 'Sì' : 'No'}</td>
                <td className="px-3 py-2">{new Date(a.uploadedAt).toLocaleString('it-IT')}</td>
                <td className="px-3 py-2">{a.downloadedAt ? new Date(a.downloadedAt).toLocaleString('it-IT') : '—'}</td>
                <td className="px-3 py-2">{a.downloadCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
