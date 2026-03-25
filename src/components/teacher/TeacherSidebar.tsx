"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { handleLogout } from "@/lib/logout";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  BookOpen,
  BookOpenCheck,
  CalendarOff,
  FileText,
  UserCircle,
  Bell,
  LifeBuoy,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarItem = { href: string; label: string; icon: LucideIcon };
type SidebarSection = { label?: string; items: SidebarItem[] };

const TEACHER_SECTIONS: SidebarSection[] = [
  {
    label: "Formazione",
    items: [
      { href: "/docente", label: "Dashboard", icon: LayoutDashboard },
      { href: "/docente/lezioni", label: "Le mie Lezioni", icon: BookOpen },
      { href: "/docente/disponibilita", label: "Disponibilita", icon: CalendarOff },
    ],
  },
  {
    label: "Personale",
    items: [
      { href: "/docente/documenti", label: "Documenti", icon: FileText },
      { href: "/docente/profilo", label: "Profilo", icon: UserCircle },
      { href: "/docente/guida", label: "Guida", icon: BookOpenCheck },
    ],
  },
  {
    label: "Comunicazione",
    items: [
      { href: "/docente/notifiche", label: "Notifiche", icon: Bell },
      { href: "/docente/supporto", label: "Supporto", icon: LifeBuoy },
    ],
  },
];

type TeacherSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export default function TeacherSidebar({ onNavigate, className }: TeacherSidebarProps) {
  const pathname = usePathname();

  const { data: notifCount = 0 } = useQuery({
    queryKey: ["teacher-notif-unread"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/notifications/unread-count");
      if (!res.ok) return 0;
      return ((await res.json()) as { count: number }).count;
    },
    refetchInterval: 60_000,
  });

  const { data: ticketCount = 0 } = useQuery({
    queryKey: ["teacher-ticket-open"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/tickets?status=OPEN");
      if (!res.ok) return 0;
      const data = await res.json();
      return Array.isArray(data) ? data.length : 0;
    },
    refetchInterval: 60_000,
  });

  const isActive = (href: string) => {
    if (href === "/docente") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className={`side-panel flex h-full w-64 flex-col gap-6 border-r p-6 ${className ?? ""}`}>
      <div className="text-center">
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Portale Docente
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {TEACHER_SECTIONS.map((section, sectionIdx) => (
          <div key={section.label ?? sectionIdx}>
            {sectionIdx > 0 && (
              <div className="my-3 border-t border-gray-200/50" />
            )}
            {section.label && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4",
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.label}
                  {item.href === "/docente/notifiche" && notifCount > 0 && (
                    <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{notifCount}</span>
                  )}
                  {item.href === "/docente/supporto" && ticketCount > 0 && (
                    <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{ticketCount}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="mt-auto border-t pt-4">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 text-red-500" />
            Esci
          </button>
        </div>
      </nav>
    </aside>
  );
}
