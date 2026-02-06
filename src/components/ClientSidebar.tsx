"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Award,
  Bell,
  BookOpen,
  History,
  LayoutDashboard,
  LogOut,
  Users,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranding } from "@/components/BrandingProvider";

const CLIENT_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/corsi", label: "Corsi", icon: BookOpen },
  { href: "/dipendenti", label: "Dipendenti", icon: Users },
  { href: "/notifiche", label: "Notifiche", icon: Bell },
  { href: "/attestati", label: "Attestati", icon: Award },
  { href: "/storico", label: "Storico", icon: History },
  { href: "/profilo", label: "Profilo", icon: UserCircle },
];

type ClientSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

function isColorDark(hexColor?: string | null): boolean {
  if (!hexColor || !hexColor.startsWith("#") || hexColor.length !== 7) {
    return false;
  }
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

export default function ClientSidebar({ onNavigate, className }: ClientSidebarProps) {
  const pathname = usePathname();
  const {
    clientName,
    logoUrl,
    logoLightUrl,
    sidebarBgColor,
    sidebarTextColor,
    primaryColor,
  } = useBranding();

  const isDark = isColorDark(sidebarBgColor);
  const displayLogo = isDark
    ? logoLightUrl || logoUrl
    : logoUrl || logoLightUrl;

  const hoverBg = `${sidebarTextColor}10`;

  return (
    <aside
      className={cn("flex h-full w-64 flex-col gap-6 border-r p-6", className)}
      style={{ backgroundColor: sidebarBgColor, color: sidebarTextColor }}
    >
      <div className="flex flex-col items-center gap-3">
        {displayLogo ? (
          <Image
            src={displayLogo}
            alt={clientName}
            width={160}
            height={64}
            unoptimized
            className="h-12 w-auto object-contain"
          />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${sidebarTextColor}20` }}
          >
            <span className="text-xl font-semibold" style={{ color: primaryColor }}>
              {clientName.charAt(0)}
            </span>
          </div>
        )}
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] opacity-70">
            Portale
          </p>
          <p className="text-lg font-display font-semibold truncate">
            {clientName}
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {CLIENT_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition"
              )}
              style={{
                color: isActive ? "#ffffff" : sidebarTextColor,
                backgroundColor: isActive ? primaryColor : "transparent",
              }}
              onMouseEnter={(event) => {
                if (!isActive) {
                  event.currentTarget.style.backgroundColor = hoverBg;
                }
              }}
              onMouseLeave={(event) => {
                if (!isActive) {
                  event.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t pt-4" style={{ borderColor: `${sidebarTextColor}20` }}>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition"
          style={{ color: sidebarTextColor }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = hoverBg;
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <LogOut className="h-4 w-4" />
          Esci
        </button>
      </div>
    </aside>
  );
}
