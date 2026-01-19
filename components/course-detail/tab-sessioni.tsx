"use client"
import { useState } from 'react'
import { useAttendanceQuery } from '@/hooks/use-attendance'
import { useSessionsQuery, useCreateSessionMutation, useUpdateSessionMutation, useDeleteSessionMutation } from '@/hooks/use-sessions'
import SessionForm from './session-form'
import AttendanceTable from './attendance-table'

export default function TabSessioni({ courseId }: { courseId: string }) {
  const { data: sessions = [] } = useSessionsQuery(courseId)
  const [selected, setSelected] = useState<string | null>(sessions[0]?.id || null)
  const selectedSession = sessions.find((s:any)=>s.id===selected) || sessions[0]
  const { data: attendance = [] } = useAttendanceQuery(courseId, selectedSession?.id)

  const create = useCreateSessionMutation(courseId)
  const update = useUpdateSessionMutation(courseId, selectedSession?.id || '')
  const del = useDeleteSessionMutation(courseId, selectedSession?.id || '')

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-1 space-y-2">
        <button className="border rounded px-3 py-1 w-full" onClick={async()=>{ const now = new Date(); await create.mutateAsync({ date: now, startTime: '09:00', endTime: '13:00' }); }}>+ Nuova sessione</button>
        <div className="bg-white border rounded divide-y">
          {sessions.map((s:any)=> (
            <button key={s.id} onClick={()=>setSelected(s.id)} className={`w-full text-left px-3 py-2 ${selectedSession?.id===s.id?'bg-accent/10':''}`}>{new Date(s.date).toLocaleDateString('it-IT')} {s.isCompleted ? '(C)' : ''}</button>
          ))}
        </div>
      </div>
      <div className="md:col-span-2 bg-white border rounded p-4">
        {selectedSession ? (
          <div>
            <div className="mb-3">
              <div className="flex gap-3 border-b text-sm">
                <button className="px-2 py-1 border-b-2 border-accent">Sessione</button>
                <button className="px-2 py-1 text-text-secondary">Discenti</button>
              </div>
            </div>
            <SessionForm
              defaultValues={selectedSession}
              onSubmit={async (vals)=>{ await update.mutateAsync(vals) }}
              onDelete={async ()=>{ await del.mutateAsync(); }}
            />
            <div className="mt-6">
              <h4 className="font-semibold mb-2">Discenti</h4>
              <AttendanceTable courseId={courseId} sessionId={selectedSession.id} rows={attendance as any} />
            </div>
          </div>
        ) : <div>Seleziona o crea una sessione</div>}
      </div>
    </div>
  )
}
