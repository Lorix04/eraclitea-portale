import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import ClientHeader from "@/components/ClientHeader";
import ClientSidebar from "@/components/ClientSidebar";
import { BrandingProvider } from "@/components/BrandingProvider";
import MobileSidebar from "@/components/MobileSidebar";
import NotificationBell from "@/components/NotificationBell";
import SearchCommand from "@/components/SearchCommand";
import SkipLink from "@/components/SkipLink";
import UserDropdown from "@/components/UserDropdown";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function buildIconUrl(pathValue?: string | null) {
  if (!pathValue) return null;
  const normalized = pathValue.replace(/\\/g, "/");
  return `/api/storage/clients/${normalized}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "ADMIN" || !session.user.clientId) {
    return {
      title: "Portale Formazione",
      icons: { icon: "/favicon.ico" },
    };
  }

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
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
      <div className="app-shell flex min-h-screen">
        <SkipLink />
        <div className="hidden md:flex">
          <ClientSidebar />
        </div>
        <div className="flex flex-1 flex-col">
          <ClientHeader leftSlot={<MobileSidebar role="CLIENT" />}>
            <SearchCommand />
            <NotificationBell />
            <UserDropdown />
          </ClientHeader>
          <main id="main-content" tabIndex={-1} className="app-main flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </BrandingProvider>
  );
}
