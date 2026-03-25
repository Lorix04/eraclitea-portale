import { NextResponse } from "next/server";
import { getEffectiveTeacherContext } from "@/lib/impersonate";
import { syncPortalExperience } from "@/lib/sync-portal-experience";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const ctx = await getEffectiveTeacherContext();
    if (!ctx) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const result = await syncPortalExperience(ctx.teacherId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[SYNC_PORTAL_EXP] Error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
