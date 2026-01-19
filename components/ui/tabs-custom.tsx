"use client"
import { ReactNode, useState } from 'react'

export function Tabs({ tabs, initial }: { tabs: { key: string; label: string; content: ReactNode }[]; initial?: string }) {
  const [active, setActive] = useState(initial || tabs[0]?.key)
  return (
    <div>
      <div className="flex border-b border-border">
        {tabs.map(t => (
          <button key={t.key} onClick={()=>setActive(t.key)} className={`px-4 py-2 text-sm -mb-px border-b-2 ${active === t.key ? 'border-accent text-accent' : 'border-transparent text-text-secondary'}`}>{t.label}</button>
        ))}
      </div>
      <div className="pt-4">
        {tabs.find(t => t.key === active)?.content}
      </div>
    </div>
  )
}
