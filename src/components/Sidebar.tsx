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
  FileText,
  History,
  LayoutDashboard,
  LifeBuoy,
  Layers,
  LogOut,
  Tag,
  ShieldCheck,
  Settings,
  UploadCloud,
  Users,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CLIENT_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/corsi", label: "Corsi", icon: BookOpen },
  { href: "/dipendenti", label: "Dipendenti", icon: Users },
  { href: "/notifiche", label: "Notifiche", icon: Bell },
  { href: "/attestati", label: "Attestati", icon: Award },
  { href: "/supporto", label: "Supporto", icon: LifeBuoy },
  { href: "/storico", label: "Storico", icon: History },
  { href: "/profilo", label: "Profilo", icon: UserCircle },
];

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/corsi", label: "Corsi", icon: BookOpen },
  { href: "/admin/edizioni", label: "Edizioni", icon: Layers },
  { href: "/admin/ticket", label: "Ticket", icon: LifeBuoy },
  { href: "/admin/categorie", label: "Categorie", icon: Tag },
  { href: "/admin/clienti", label: "Clienti", icon: Users },
  { href: "/admin/dipendenti", label: "Dipendenti", icon: Users },
  { href: "/admin/attestati", label: "Attestati", icon: UploadCloud },
  { href: "/admin/export", label: "Export", icon: FileText },
  { href: "/admin/audit", label: "Audit", icon: ShieldCheck },
  { href: "/admin/status", label: "Status", icon: Activity },
  { href: "/admin/impostazioni/email", label: "Impostazioni", icon: Settings },
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
  const links = role === "ADMIN" ? ADMIN_LINKS : CLIENT_LINKS;
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
          Menu Admin
        </p>
      </div>
      <nav className="flex flex-col gap-2">
        {links.map((link) => {
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
