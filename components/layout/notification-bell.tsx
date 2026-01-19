"use client"
import { Bell } from 'lucide-react'
import { useUnreadCountQuery, useClientNotificationsQuery, useMarkAsReadMutation } from '@/hooks/use-notifications'
import { useState } from 'react'

export default function NotificationBell() {
  const { data } = useUnreadCountQuery()
  const [open, setOpen] = useState(false)
  const { data: notifs = [] } = useClientNotificationsQuery({ limit: 5 })
  const mark = useMarkAsReadMutation('') // not used directly here

  return (
    <div className="relative">
      <button className="relative" onClick={()=>setOpen(o=>!o)} aria-label="Notifiche">
        <Bell size={20} />
        {data?.count ? <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] rounded-full px-1 animate-pulse">{data.count}</span> : null}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow z-50">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <div className="font-semibold text-sm">Notifiche</div>
            <a className="text-xs text-accent" href="/cliente/notifiche">Vedi tutte</a>
          </div>
          <div className="max-h-80 overflow-auto">
            {notifs.length === 0 ? (
              <div className="p-4 text-sm text-text-secondary">Nessuna notifica</div>
            ) : notifs.map((n:any)=> (
              <div key={n.id} className={`px-3 py-2 text-sm ${!n.isRead ? 'bg-accent/5' : ''}`}>
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-text-secondary">{new Date(n.createdAt).toLocaleString('it-IT')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
