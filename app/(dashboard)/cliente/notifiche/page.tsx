"use client"
import { useClientNotificationsQuery, useMarkAllAsReadMutation, useMarkAsReadMutation } from '@/hooks/use-notifications'
import { useMemo } from 'react'

export default function ClienteNotifichePage() {
  const { data: notifs = [] } = useClientNotificationsQuery({})
  const markAll = useMarkAllAsReadMutation(notifs.map((n:any)=>n.id))
  const markOne = useMarkAsReadMutation('')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Le mie Notifiche</h2>
        <button className="border rounded px-3 py-1" onClick={()=>markAll.mutate()}>Segna tutte come lette</button>
      </div>
      <div className="space-y-2">
        {notifs.length === 0 ? (
          <div className="bg-white border rounded p-6 text-sm text-text-secondary">Nessuna notifica</div>
        ) : notifs.map((n:any)=>(
          <div key={n.id} className={`bg-white border rounded p-3 ${!n.isRead ? 'bg-accent/5' : ''}`}>
            <div className="font-medium">{n.title}</div>
            <div className="text-sm text-text-secondary">{n.message}</div>
            <div className="text-xs text-text-secondary mt-1">{new Date(n.createdAt).toLocaleString('it-IT')}</div>
            {!n.isRead && <button className="text-xs text-accent mt-1" onClick={()=>fetch(`/api/client/notifications/${n.id}/read`, { method: 'POST' }).then(()=>location.reload())}>Segna come letta</button>}
            {n.courseId && <a className="text-xs text-accent ml-2" href={`/cliente/corsi/${n.courseId}`}>Vai al corso →</a>}
          </div>
        ))}
      </div>
    </div>
  )
}
