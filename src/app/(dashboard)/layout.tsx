import ClientHeader from "@/components/ClientHeader";
import ClientSidebar from "@/components/ClientSidebar";
import { BrandingProvider } from "@/components/BrandingProvider";
import MobileSidebar from "@/components/MobileSidebar";
import NotificationBell from "@/components/NotificationBell";
import SearchCommand from "@/components/SearchCommand";
import SkipLink from "@/components/SkipLink";
import UserDropdown from "@/components/UserDropdown";

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
