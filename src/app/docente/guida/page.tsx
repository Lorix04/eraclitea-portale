import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import GuidePageClient from "@/components/GuidePageClient";

export default async function TeacherGuidePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") redirect("/login");
  return <GuidePageClient role="TEACHER" userName={session.user.name} />;
}
