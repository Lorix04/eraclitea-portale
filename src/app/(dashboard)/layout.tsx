import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import ClientHeader from "@/components/ClientHeader";
import ClientSidebar from "@/components/ClientSidebar";
import { BrandingProvider } from "@/components/BrandingProvider";
import MobileSidebar from "@/components/MobileSidebar";
import NotificationBell from "@/components/NotificationBell";
import ClientSearchCommand from "@/components/ClientSearchCommand";
import SkipLink from "@/components/SkipLink";
import ClientUserDropdown from "@/components/ClientUserDropdown";
import ImpersonateBanner from "@/components/ImpersonateBanner";
import { authOptions } from "@/lib/auth";
import {
  IMPERSONATE_ADMIN_COOKIE,
  IMPERSONATE_CLIENT_COOKIE,
} from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";

function buildIconUrl(pathValue?: string | null) {
  if (!pathValue) return null;
  const normalized = pathValue.replace(/\\/g, "/").replace(/^\/+/, "");
  const withoutPrefix = normalized.replace(/^clients\//, "");
  return `/api/storage/clients/${withoutPrefix}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return {
      title: "Portale Formazione",
      icons: { icon: "/favicon.ico" },
    };
  }

  let targetClientId: string | null = null;

  if (session.user.role === "CLIENT" && session.user.clientId) {
    targetClientId = session.user.clientId;
  }

  if (session.user.role === "ADMIN") {
    const cookieStore = cookies();
    const impersonateAdminId = cookieStore.get(IMPERSONATE_ADMIN_COOKIE)?.value;
    const impersonateClientId = cookieStore.get(IMPERSONATE_CLIENT_COOKIE)?.value;

    if (
      impersonateAdminId &&
      impersonateClientId &&
      impersonateAdminId === session.user.id
    ) {
      const impersonatedUser = await prisma.user.findUnique({
        where: { id: impersonateClientId },
        select: {
          role: true,
          isActive: true,
          clientId: true,
          client: { select: { isActive: true } },
        },
      });

      if (
        impersonatedUser?.role === "CLIENT" &&
        impersonatedUser.isActive &&
        impersonatedUser.client?.isActive !== false &&
        impersonatedUser.clientId
      ) {
        targetClientId = impersonatedUser.clientId;
      }
    }
  }

  if (!targetClientId) {
    return {
      title: "Portale Formazione",
      icons: { icon: "/favicon.ico" },
    };
  }

  const client = await prisma.client.findUnique({
    where: { id: targetClientId },
    select: { ragioneSociale: true, faviconPath: true },
  });

  const icon = buildIconUrl(client?.faviconPath) || "/favicon.ico";
  const title = client?.ragioneSociale
    ? `Portale ${client.ragioneSociale}`
    : "Portale Formazione";

  return {
    title,
    icons: {
      icon,
      shortcut: icon,
      apple: icon,
    },
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BrandingProvider>
      <ImpersonateBanner />
      <div className="app-shell flex min-h-screen">
        <SkipLink />
        <div className="hidden md:flex">
          <ClientSidebar />
        </div>
        <div className="flex flex-1 flex-col">
          <ClientHeader leftSlot={<MobileSidebar role="CLIENT" />}>
            <ClientSearchCommand />
            <NotificationBell />
            <ClientUserDropdown />
          </ClientHeader>
          <main id="main-content" tabIndex={-1} className="app-main flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </BrandingProvider>
  );
}
