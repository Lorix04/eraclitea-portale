"use client"
import { useClientCourse } from '@/hooks/use-client-course'
import SpreadsheetEditor from '@/components/excel/spreadsheet-editor'
import { useMemo, useState } from 'react'

export default function ClienteCorsoDettaglioPage({ params }: { params: { id: string } }) {
  const { course, employees, isLoading, save, isSaving, submit, isSubmitting } = useClientCourse(params.id)
  const [dirty, setDirty] = useState(false)
  const cols = useMemo(()=>[
    { field: 'nome', headerName: 'Nome', editable: true },
    { field: 'cognome', headerName: 'Cognome', editable: true },
    { field: 'codiceFiscale', headerName: 'Codice Fiscale', editable: true },
    { field: 'dataNascita', headerName: 'Data Nascita', editable: true },
    { field: 'luogoNascita', headerName: 'Luogo Nascita', editable: true },
    { field: 'email', headerName: 'Email', editable: true },
    { field: 'mansione', headerName: 'Mansione', editable: true },
    { field: 'note', headerName: 'Note', editable: true },
  ],[])

  if (isLoading) return <div className="bg-white border rounded p-6">Caricamento…</div>
  if (!course) return <div className="bg-white border rounded p-6 text-danger">Corso non trovato</div>

  const readOnly = course.status !== 'PUBLISHED' || (course.deadlineRegistry && new Date(course.deadlineRegistry) < new Date())
  const rows = (employees || []).map((r:any)=>({ id: r.employee.id, ...r.employee }))

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm text-text-secondary"><a className="text-accent" href="/cliente/corsi">Corsi</a> / {course.title}</div>
        <h2 className="text-lg font-semibold">{course.title}</h2>
        <div className="text-sm text-text-secondary">{course.dateStart?new Date(course.dateStart).toLocaleDateString('it-IT'):''} → {course.dateEnd?new Date(course.dateEnd).toLocaleDateString('it-IT'):''} • Scadenza iscrizioni: {course.deadlineRegistry?new Date(course.deadlineRegistry).toLocaleDateString('it-IT'):'—'} • {course.modalita || '—'}</div>
      </div>
      {!readOnly ? (
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">Inserisci i dati dei dipendenti da iscrivere. Puoi copiare e incollare da Excel.</p>
          <SpreadsheetEditor
            columns={cols as any}
            data={rows}
            onChange={()=>setDirty(true)}
            onAutoSave={(d)=>{ if (dirty) save(d as any) }}
            autoSaveInterval={5000}
            showValidationSummary
            maxRows={course.capacity || undefined}
          />
          <div className="flex items-center gap-2">
            <button className="border rounded px-3 py-1" disabled={!dirty || isSaving} onClick={()=>save(rows as any)}>{isSaving?'Salvataggio…':'Salva'}</button>
            <button className="bg-accent text-white rounded px-3 py-1" disabled={isSubmitting} onClick={()=>{ if(confirm('Sei sicuro di inviare le iscrizioni?')) submit() }}>{isSubmitting?'Invio…':'Invia Iscrizioni'}</button>
            <div className="text-xs text-text-secondary">{dirty ? 'Modifiche non salvate' : 'Salvato'}</div>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded p-4">
          <h3 className="font-semibold mb-2">Dipendenti Iscritti</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Nome</th><th className="text-left px-3 py-2">Cognome</th><th className="text-left px-3 py-2">CF</th></tr></thead>
            <tbody>
              {rows.map((r:any)=>(<tr key={r.id} className="even:bg-gray-50"><td className="px-3 py-2">{r.nome}</td><td className="px-3 py-2">{r.cognome}</td><td className="px-3 py-2 font-mono text-xs">{r.codiceFiscale}</td></tr>))}
            </tbody>
          </table>
          <div className="text-sm text-text-secondary mt-2">Le iscrizioni per questo corso sono chiuse.</div>
        </div>
      )}
    </div>
  )
}
