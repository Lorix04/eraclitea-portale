"use client"
import { useState } from 'react'
import { useClientsQuery } from '@/hooks/use-clients'
import { useCoursesQuery } from '@/hooks/use-courses'

export default function AdminAttestatiUploadPage() {
  const [clientId, setClientId] = useState('')
  const [courseId, setCourseId] = useState('')
  const { data: clients } = useClientsQuery({ page: 1, limit: 100, isActive: 'true' })
  const { data: courses } = useCoursesQuery({ page: 1, limit: 100 })
  const [files, setFiles] = useState<File[]>([])
  const [mappings, setMappings] = useState<any[]>([])
  const [result, setResult] = useState<any>(null)

  const onDrop = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles)
    const next = [...files, ...arr]
    setFiles(next)
    // naive matching by CF regex
    const CF = /[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]/i
    const maps = arr.map(f => {
      const m = f.name.match(CF)
      return { fileName: f.name, employeeId: '', cf: m?.[0]?.toUpperCase() || '' }
    })
    setMappings(prev => [...prev, ...maps])
  }

  const uploadAll = async () => {
    if (!clientId || !courseId || files.length === 0) return
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    fd.set('courseId', courseId)
    fd.set('clientId', clientId)
    fd.set('mappings', JSON.stringify(mappings))
    fd.set('sendNotification', 'true')
    const res = await fetch('/api/admin/certificates/upload-batch', { method: 'POST', body: fd })
    const data = await res.json()
    setResult(data)
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Importa Attestati</h2>
      <p className="text-sm text-text-secondary">Importa gli attestati</p>
      <div className="bg-white border rounded p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Cliente</label>
            <select className="w-full border rounded px-2 py-1" value={clientId} onChange={(e)=>setClientId(e.target.value)}>
              <option value="">Seleziona</option>
              {clients?.data?.map((c:any)=>(<option key={c.id} value={c.id}>{c.ragioneSociale}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Corso</label>
            <select className="w-full border rounded px-2 py-1" value={courseId} onChange={(e)=>setCourseId(e.target.value)}>
              <option value="">Seleziona</option>
              {courses?.data?.map((c:any)=>(<option key={c.id} value={c.id}>{c.title}</option>))}
            </select>
          </div>
        </div>
        <div className="border-2 border-dashed rounded p-6 text-center text-sm text-text-secondary" onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{ e.preventDefault(); onDrop(e.dataTransfer.files) }}>
          Trascina qui i PDF o <button className="underline" onClick={()=>document.getElementById('batch-files')?.click()}>seleziona</button>
          <input id="batch-files" className="hidden" type="file" accept="application/pdf" multiple onChange={(e)=>{ if (e.target.files) onDrop(e.target.files) }} />
        </div>
        {files.length>0 && (
          <div className="text-sm">
            <div className="font-medium mb-2">File selezionati</div>
            <ul className="list-disc ml-6">
              {files.map(f => (<li key={f.name}>{f.name} ({(f.size/1024/1024).toFixed(2)} MB)</li>))}
            </ul>
          </div>
        )}
        <div className="flex justify-end">
          <button className="bg-primary text-white rounded px-3 py-1" onClick={uploadAll} disabled={!clientId || !courseId || files.length===0}>Carica {files.length} attestati</button>
        </div>
        {result && <div className="text-sm">Caricati: {result.uploaded} • Errori: {result.errors?.length || 0}</div>}
      </div>
    </div>
  )
}
