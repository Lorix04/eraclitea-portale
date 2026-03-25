import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkApiPermission } from "@/lib/permissions";
import { syncPortalExperience } from "@/lib/sync-portal-experience";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    if (!checkApiPermission(session, "docenti", "edit")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
    }

    const result = await syncPortalExperience(context.params.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ADMIN_SYNC_PORTAL_EXP] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
