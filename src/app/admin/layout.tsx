import Sidebar from "@/components/Sidebar";
import MobileSidebar from "@/components/MobileSidebar";
import SearchCommand from "@/components/SearchCommand";
import SkipLink from "@/components/SkipLink";
import UserDropdown from "@/components/UserDropdown";
import NotificationBell from "@/components/NotificationBell";
import DisableDarkMode from "@/components/DisableDarkMode";
import LogoutSync from "@/components/LogoutSync";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LogoutSync />
      <DisableDarkMode />
      <div className="app-shell flex min-h-screen">
        <SkipLink />
        <div className="hidden md:block">
          <Sidebar role="ADMIN" />
        </div>
        <div className="min-w-0 flex-1 overflow-x-hidden md:ml-64">
          <header className="app-header relative z-40 flex items-center justify-between gap-3 px-4 py-3 md:flex-wrap md:gap-4 md:px-6 md:py-4">
            <div className="flex items-center gap-3">
              <MobileSidebar role="ADMIN" />
              <div>
                <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground md:block">
                  Pannello
                </p>
                <h2 className="text-base font-display font-semibold md:text-lg">Admin</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden md:block">
                <SearchCommand />
              </div>
              <NotificationBell />
              <UserDropdown />
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="app-main p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
