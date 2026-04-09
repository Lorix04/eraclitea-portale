import { redirect } from "next/navigation";
import GuidePageClient from "@/components/GuidePageClient";
import { getEffectiveClientContext } from "@/lib/impersonate";

export default async function GuidaPage() {
  const context = await getEffectiveClientContext();

  if (!context) {
    redirect("/");
  }

  const userName =
    context.session.user.name ?? context.session.user.email ?? null;

  return <GuidePageClient role="CLIENT" userName={userName} />;
}
