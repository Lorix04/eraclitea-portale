"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, GraduationCap, Building2, Bell, Award, History, Menu, ChevronDown, Users } from 'lucide-react'
import { useState } from 'react'
import { useUnreadCountQuery } from '@/hooks/use-notifications'

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  const pathname = usePathname()
  const active = pathname.startsWith(href)
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-md text-white hover:bg-[#2d4a6f] ${active ? 'bg-[#2d4a6f]' : ''}`}>
      <Icon size={20} />
      <span className="text-[14px] font-medium">{label}</span>
    </Link>
  )
}

interface SidebarProps { user: { role: string; email?: string } }

export function Sidebar({ user }: SidebarProps) {
  const [openTutor, setOpenTutor] = useState(true)
  const [openAzienda, setOpenAzienda] = useState(true)
  const { data: unread } = useUnreadCountQuery()
  const unreadCount = unread?.count ?? 0
  const role = user?.role
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[220px] bg-[#1e3a5f] text-white hidden lg:block">
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
        <div className="font-bold text-[12px] uppercase tracking-wide">POLICLINICO FORMAZIONE</div>
        <Menu size={18} />
      </div>
      <nav className="p-3 space-y-1">
        {role === 'CLIENT' ? (
          <>
            <NavItem href="/cliente" label="HOME" icon={Home} />
            <NavItem href="/cliente/corsi" label="CORSI" icon={GraduationCap} />
            <NavItem href="/cliente/attestati" label="ATTESTATI" icon={Award} />
            <NavItem href="/cliente/storico" label="STORICO" icon={History} />
            <div className="relative">
              <NavItem href="/cliente/notifiche" label="NOTIFICHE" icon={Bell} />
              {unreadCount > 0 && (
                <span className="absolute right-6 -top-2 bg-red-500 text-white text-[10px] rounded-full px-1">
                  {unreadCount}
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <NavItem href="/dashboard" label="HOME" icon={Home} />
            <div>
              <button className="w-full text-left flex items-center justify-between px-4 py-3 hover:bg-[#2d4a6f] rounded-md" onClick={()=>setOpenTutor(v=>!v)}>
                <span className="text-[14px] font-medium flex items-center gap-3"><GraduationCap size={20}/> TUTORAGGIO</span>
                <ChevronDown size={18} className={`${openTutor ? '' : 'rotate-180'} transition-transform`} />
              </button>
              {openTutor && (
                <div className="ml-8 space-y-1">
                  <NavItem href="/dashboard/admin/tutoraggio/edizioni" label="Edizioni" icon={GraduationCap} />
                  <NavItem href="/dashboard/admin/tutoraggio/importa-attestati" label="Importa attestati" icon={GraduationCap} />
                </div>
              )}
            </div>
            <div>
              <button className="w-full text-left flex items-center justify-between px-4 py-3 hover:bg-[#2d4a6f] rounded-md" onClick={()=>setOpenAzienda(v=>!v)}>
                <span className="text-[14px] font-medium flex items-center gap-3"><Building2 size={20}/> AZIENDA</span>
                <ChevronDown size={18} className={`${openAzienda ? '' : 'rotate-180'} transition-transform`} />
              </button>
              {openAzienda && (
                <div className="ml-8 space-y-1">
                  <NavItem href="/dashboard/admin/azienda/edizioni" label="Edizioni" icon={Users} />
                </div>
              )}
            </div>
          </>
        )}
      </nav>
    </aside>
  )
}
