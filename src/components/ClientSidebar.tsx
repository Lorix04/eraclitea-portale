"use client";

import Link from "next/link";
import { handleLogout } from "@/lib/logout";
import { usePathname } from "next/navigation";
import {
  Award,
  Bell,
  BookOpen,
  BookOpenCheck,
  History,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Users,
  UsersRound,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useBranding } from "@/components/BrandingProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import ClientLogo from "@/components/ui/ClientLogo";

const CLIENT_SECTIONS = [
  [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/corsi", label: "Corsi", icon: BookOpen },
    { href: "/dipendenti", label: "Dipendenti", icon: Users },
    { href: "/attestati", label: "Attestati", icon: Award },
    { href: "/storico", label: "Storico", icon: History },
  ],
  [
    { href: "/notifiche", label: "Notifiche", icon: Bell },
    { href: "/supporto", label: "Supporto", icon: LifeBuoy },
    { href: "/guida", label: "Guida", icon: BookOpenCheck },
    { href: "/profilo", label: "Profilo", icon: UserCircle },
  ],
] as const;

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
  const { data: sessionData } = useSession();
  const isOwner = sessionData?.user?.isClientOwner === true;
  const {
    clientName,
    logoUrl,
    logoLightUrl,
    sidebarBgColor,
    sidebarTextColor,
    primaryColor,
    isLoading,
  } = useBranding();

  const isDark = isLoading ? false : isColorDark(sidebarBgColor);
  const displayLogo = isLoading
    ? null
    : isDark
    ? logoLightUrl || logoUrl
    : logoUrl || logoLightUrl;

  const baseBg = isLoading ? "#F3F4F6" : sidebarBgColor;
  const baseText = isLoading ? "#4B5563" : sidebarTextColor;
  const activeBg = isLoading ? "#E5E7EB" : primaryColor;
  const activeText = isLoading ? "#111827" : "#FFFFFF";
  const hoverBg = isLoading ? "#E5E7EB" : `${sidebarTextColor}10`;
  const dividerColor = isLoading ? "#E5E7EB" : `${sidebarTextColor}20`;

  return (
    <aside
      className={cn("fixed inset-y-0 left-0 z-30 flex w-64 flex-col gap-6 overflow-y-auto border-r p-6", className)}
      style={{ backgroundColor: baseBg, color: baseText }}
    >
      <div className="flex flex-col items-center gap-3">
        {isLoading ? (
          <div className="w-full px-4">
            <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="h-16 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
          </div>
        ) : (
          <div className="w-full px-4">
            <ClientLogo
              src={displayLogo}
              alt={clientName}
              variant="sidebar"
              fallbackBgColor={primaryColor}
            />
          </div>
        )}
        <div className="text-center">
          {isLoading ? (
            <Skeleton className="h-3 w-12" />
          ) : (
            <p className="text-[11px] uppercase tracking-[0.2em] opacity-70">
              MENÙ
            </p>
          )}
        </div>
      </div>

      <nav className="flex flex-col">
        {CLIENT_SECTIONS.map((section, sectionIndex) => {
          // Add "Amministratori" to the first section for client owners
          const items = sectionIndex === 0 && isOwner
            ? [...section, { href: "/amministratori" as const, label: "Amministratori", icon: UsersRound }]
            : [...section];
          return (
          <div key={`section-${sectionIndex}`} className="flex flex-col gap-2">
            {sectionIndex > 0 ? (
              <div className="mx-4 my-2 border-t border-white/20" />
            ) : null}
            {items.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href ||
                pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition"
                  )}
                  style={{
                    color: isActive ? activeText : baseText,
                    backgroundColor: isActive ? activeBg : "transparent",
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
          </div>
        ); })}
      </nav>

      <div className="mt-auto border-t pt-4" style={{ borderColor: dividerColor }}>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition"
          style={{ color: baseText }}
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
