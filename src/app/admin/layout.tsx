import Sidebar from "@/components/Sidebar";
import MobileSidebar from "@/components/MobileSidebar";
import SearchCommand from "@/components/SearchCommand";
import SkipLink from "@/components/SkipLink";
import UserDropdown from "@/components/UserDropdown";
import NotificationBell from "@/components/NotificationBell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell flex min-h-screen">
      <SkipLink />
      <div className="hidden md:flex">
        <Sidebar role="ADMIN" />
      </div>
      <div className="flex-1">
        <header className="app-header relative z-40 flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <MobileSidebar role="ADMIN" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Pannello
              </p>
              <h2 className="text-lg font-display font-semibold">Admin</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SearchCommand />
            <NotificationBell />
            <UserDropdown />
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="app-main p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
