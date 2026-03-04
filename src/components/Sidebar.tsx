"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Award,
  Bell,
  BookOpen,
  Building2,
  CalendarRange,
  Download,
  FolderTree,
  GraduationCap,
  History,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageCircle,
  ScrollText,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type SidebarSection = {
  label?: string;
  items: SidebarItem[];
};

const CLIENT_SECTIONS: SidebarSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/corsi", label: "Corsi", icon: BookOpen },
      { href: "/dipendenti", label: "Dipendenti", icon: Users },
      { href: "/attestati", label: "Attestati", icon: Award },
      { href: "/storico", label: "Storico", icon: History },
    ],
  },
  {
    items: [
      { href: "/notifiche", label: "Notifiche", icon: Bell },
      { href: "/supporto", label: "Supporto", icon: LifeBuoy },
      { href: "/profilo", label: "Profilo", icon: UserCircle },
    ],
  },
];

const ADMIN_SECTIONS: SidebarSection[] = [
  {
    label: "Gestione Formazione",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/corsi", label: "Corsi", icon: BookOpen },
      { href: "/admin/edizioni", label: "Edizioni", icon: CalendarRange },
      { href: "/admin/area-corsi", label: "Area Corsi", icon: FolderTree },
      { href: "/admin/attestati", label: "Attestati", icon: Award },
    ],
  },
  {
    label: "Anagrafiche",
    items: [
      { href: "/admin/clienti", label: "Clienti", icon: Building2 },
      { href: "/admin/dipendenti", label: "Dipendenti", icon: Users },
      { href: "/admin/docenti", label: "Docenti", icon: GraduationCap },
    ],
  },
  {
    label: "Comunicazione",
    items: [{ href: "/admin/ticket", label: "Ticket", icon: MessageCircle }],
  },
  {
    label: "Strumenti",
    items: [
      { href: "/admin/export", label: "Export", icon: Download },
      { href: "/admin/audit", label: "Audit", icon: ScrollText },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/status", label: "Status", icon: Activity },
      { href: "/admin/smtp", label: "SMTP", icon: Mail },
    ],
  },
];

type SidebarProps = {
  role?: "CLIENT" | "ADMIN";
  onNavigate?: () => void;
  className?: string;
};

export default function Sidebar({
  role = "CLIENT",
  onNavigate,
  className,
}: SidebarProps) {
  const sections = role === "ADMIN" ? ADMIN_SECTIONS : CLIENT_SECTIONS;
  const pathname = usePathname();
  const { data: adminTicketCount = 0 } = useQuery({
    queryKey: ["sidebar-admin-ticket-count"],
    enabled: role === "ADMIN",
    queryFn: async () => {
      const [openResponse, inProgressResponse] = await Promise.all([
        fetch("/api/tickets?status=OPEN"),
        fetch("/api/tickets?status=IN_PROGRESS"),
      ]);

      if (!openResponse.ok || !inProgressResponse.ok) {
        return 0;
      }

      const [openJson, inProgressJson] = await Promise.all([
        openResponse.json(),
        inProgressResponse.json(),
      ]);

      const openCount = Array.isArray(openJson)
        ? openJson.length
        : Array.isArray(openJson?.data)
          ? openJson.data.length
          : 0;
      const inProgressCount = Array.isArray(inProgressJson)
        ? inProgressJson.length
        : Array.isArray(inProgressJson?.data)
          ? inProgressJson.data.length
          : 0;

      return openCount + inProgressCount;
    },
    refetchInterval: 60_000,
  });

  const isActive = (href: string) => {
    if (href === "/" || href === "/admin") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      className={`side-panel flex h-full w-64 flex-col gap-6 border-r p-6 ${
        className ?? ""
      }`}
    >
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {role === "ADMIN" ? "Menu Admin" : "Menù"}
        </p>
      </div>
      <nav className="flex flex-col">
        {sections.map((section, sectionIndex) => (
          <div key={`${section.label ?? "section"}-${sectionIndex}`} className="flex flex-col gap-1">
            {sectionIndex > 0 ? (
              <div
                className={cn(
                  "mx-4 my-2 border-t",
                  role === "ADMIN" ? "border-gray-200/50" : "border-white/20"
                )}
              />
            ) : null}
            {role === "ADMIN" && section.label ? (
              <p className="px-4 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </p>
            ) : null}
            {section.items.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {link.label}
                  {role === "ADMIN" &&
                  link.href === "/admin/ticket" &&
                  adminTicketCount > 0 ? (
                    <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {adminTicketCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t pt-4">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Esci
        </button>
      </div>
    </aside>
  );
}
