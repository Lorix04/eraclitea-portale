import TeacherSidebar from "@/components/teacher/TeacherSidebar";
import TeacherHeader from "@/components/teacher/TeacherHeader";
import MobileSidebar from "@/components/MobileSidebar";
import UserDropdown from "@/components/UserDropdown";
import NotificationBell from "@/components/NotificationBell";
import TeacherImpersonateBanner from "@/components/TeacherImpersonateBanner";
import DisableDarkMode from "@/components/DisableDarkMode";
import LogoutSync from "@/components/LogoutSync";
import { getEffectiveTeacherContext } from "@/lib/impersonate";
import { prisma } from "@/lib/prisma";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  let teacherName: string | null = null;
  try {
    const ctx = await getEffectiveTeacherContext();
    if (ctx?.teacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: ctx.teacherId },
        select: { firstName: true, lastName: true },
      });
      if (teacher) {
        teacherName = `${teacher.firstName} ${teacher.lastName}`;
      }
    }
  } catch {
    // fallback: show header without name
  }
  return (
    <>
      <LogoutSync />
      <DisableDarkMode />
      <TeacherImpersonateBanner />
      <div className="app-shell flex min-h-screen">
        <div className="hidden md:block">
          <TeacherSidebar />
        </div>
        <div className="min-w-0 flex-1 overflow-x-hidden md:ml-64">
          <TeacherHeader teacherName={teacherName} leftSlot={<MobileSidebar role="TEACHER" />}>
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
