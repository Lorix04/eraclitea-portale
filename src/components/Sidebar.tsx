"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import {
  Activity,
  Award,
  Bell,
  BookOpen,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Tag,
  ShieldCheck,
  UploadCloud,
  Users,
  UserCircle,
} from "lucide-react";

const CLIENT_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/corsi", label: "Corsi", icon: BookOpen },
  { href: "/dipendenti", label: "Dipendenti", icon: Users },
  { href: "/notifiche", label: "Notifiche", icon: Bell },
  { href: "/attestati", label: "Attestati", icon: Award },
  { href: "/storico", label: "Storico", icon: History },
  { href: "/profilo", label: "Profilo", icon: UserCircle },
];

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/corsi", label: "Corsi", icon: BookOpen },
  { href: "/admin/categorie", label: "Categorie", icon: Tag },
  { href: "/admin/clienti", label: "Clienti", icon: Users },
  { href: "/admin/dipendenti", label: "Dipendenti", icon: Users },
  { href: "/admin/attestati", label: "Attestati", icon: UploadCloud },
  { href: "/admin/export", label: "Export", icon: FileText },
  { href: "/admin/audit", label: "Audit", icon: ShieldCheck },
  { href: "/admin/status", label: "Status", icon: Activity },
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

  return (
    <aside
      className={`side-panel flex h-full w-64 flex-col gap-6 border-r p-6 ${
        className ?? ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white shadow-sm">
          <Image
            src="/brand/eraclitea-logo.svg"
            alt="Eraclitea"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Portale
          </p>
          <p className="text-lg font-display font-semibold">Clienti</p>
        </div>
      </div>
      <nav className="flex flex-col gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
            >
              <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              {link.label}
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
