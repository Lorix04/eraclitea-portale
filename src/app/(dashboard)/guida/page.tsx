import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import GuidePageClient from "@/components/GuidePageClient";
import { authOptions } from "@/lib/auth";

export default async function GuidaPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/guida");
  }

  if (session.user.role !== "CLIENT") {
    redirect("/");
  }

  return (
    <GuidePageClient
      role="CLIENT"
      userName={session.user.name ?? session.user.email ?? null}
    />
  );
}
