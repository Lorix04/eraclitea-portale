import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveUserContext } from "@/lib/impersonate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ isImpersonating: false });
    }

    const context = await getEffectiveUserContext();
    if (
      !context ||
      !context.isImpersonating ||
      context.role !== "TEACHER" ||
      context.originalAdminId !== session.user.id
    ) {
      return NextResponse.json({ isImpersonating: false });
    }

    return NextResponse.json({
      isImpersonating: true,
      teacherName: context.impersonatedTeacherName ?? "Docente",
    });
  } catch (error) {
    console.error("[IMPERSONATE_TEACHER_STATUS_GET] Error:", error);
    return NextResponse.json({ isImpersonating: false });
  }
}
