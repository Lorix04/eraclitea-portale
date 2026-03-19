import TeacherSidebar from "@/components/teacher/TeacherSidebar";
import TeacherHeader from "@/components/teacher/TeacherHeader";
import MobileSidebar from "@/components/MobileSidebar";
import UserDropdown from "@/components/UserDropdown";
import NotificationBell from "@/components/NotificationBell";
import TeacherImpersonateBanner from "@/components/TeacherImpersonateBanner";
import DisableDarkMode from "@/components/DisableDarkMode";
import LogoutSync from "@/components/LogoutSync";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LogoutSync />
      <DisableDarkMode />
      <TeacherImpersonateBanner />
      <div className="app-shell flex min-h-screen">
        <div className="hidden md:flex">
          <TeacherSidebar />
        </div>
        <div className="min-w-0 flex-1 overflow-x-hidden">
          <TeacherHeader leftSlot={<MobileSidebar role="TEACHER" />}>
            <NotificationBell />
            <UserDropdown />
          </TeacherHeader>
          <main id="main-content" tabIndex={-1} className="app-main p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
