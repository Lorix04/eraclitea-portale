"use client"
import { useState } from 'react'

export default function UploadCertificateDialog({ open, onOpenChange, courseId, employeeId, employeeName, clientId, onSuccess }: { open: boolean; onOpenChange: (o:boolean)=>void; courseId: string; employeeId: string; employeeName: string; clientId: string; onSuccess: ()=>void }) {
  const [file, setFile] = useState<File|null>(null)
  const [achievedAt, setAchievedAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [tipo, setTipo] = useState('Attestato Frequenza')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  const onDrop = (f: File) => {
    if (f.type !== 'application/pdf' || f.size > 10*1024*1024) { setError('Solo PDF max 10MB'); return }
    setError(null); setFile(f)
  }

  const onUpload = async () => {
    if (!file || !achievedAt) { setError('Completa i campi obbligatori'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('courseId', courseId)
      fd.set('employeeId', employeeId)
      fd.set('clientId', clientId)
      fd.set('achievedAt', achievedAt)
      if (expiresAt) fd.set('expiresAt', expiresAt)
      fd.set('tipo', tipo)
      const res = await fetch('/api/admin/certificates/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload fallito')
      onOpenChange(false)
      onSuccess()
    } catch (e:any) { setError(e.message) } finally { setLoading(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <div className="bg-white rounded shadow w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Carica Attestato per {employeeName}</h3>
          <button onClick={()=>onOpenChange(false)}>✕</button>
        </div>
        <div className="space-y-3">
          <div className="border-2 border-dashed rounded p-6 text-center text-sm text-text-secondary" onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{ e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(f) onDrop(f) }}>
            Trascina qui il PDF o <button className="underline" onClick={()=>document.getElementById('ucd-file')?.click()}>seleziona</button>
            <input id="ucd-file" type="file" accept="application/pdf" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) onDrop(f) }} />
          </div>
          {file && <div className="text-sm">Selezionato: <strong>{file.name}</strong> ({(file.size/1024/1024).toFixed(2)} MB)</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Data conseguimento*</label>
              <input type="date" className="w-full border rounded px-2 py-1" value={achievedAt} onChange={(e)=>setAchievedAt(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Data scadenza</label>
              <input type="date" className="w-full border rounded px-2 py-1" value={expiresAt} onChange={(e)=>setExpiresAt(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Tipo attestato</label>
            <select className="w-full border rounded px-2 py-1" value={tipo} onChange={(e)=>setTipo(e.target.value)}>
              <option>Attestato Frequenza</option>
              <option>Attestato ECM</option>
              <option>Certificato</option>
              <option>Altro</option>
            </select>
          </div>
          {error && <div className="text-danger text-sm">{error}</div>}
          {loading && <div className="h-2 bg-gray-200 rounded"><div className="h-2 bg-accent rounded animate-pulse" style={{width:'80%'}}/></div>}
          <div className="flex justify-end gap-2">
            <button className="border rounded px-3 py-1" onClick={()=>onOpenChange(false)} disabled={loading}>Annulla</button>
            <button className="bg-primary text-white rounded px-3 py-1" onClick={onUpload} disabled={loading}>Carica</button>
          </div>
        </div>
      </div>
    </div>
  )
}
