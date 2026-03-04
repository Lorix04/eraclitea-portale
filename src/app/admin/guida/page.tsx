import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import GuidePageClient from "@/components/GuidePageClient";
import { authOptions } from "@/lib/auth";

export default async function AdminGuidaPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <GuidePageClient
      role="ADMIN"
      userName={session.user.name ?? session.user.email ?? null}
    />
  );
}
