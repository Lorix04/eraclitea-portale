import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { classifyEmailType } from "@/lib/email-retry-policy";
import { getEmailLogById, regenerateSensitiveEmailFromLog, retryNonSensitiveEmailLog } from "@/lib/email-retry-service";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function POST(
  _request: Request,
  context: { params: { logId: string } }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const log = await getEmailLogById(context.params.logId);
  if (!log) {
    return NextResponse.json({ error: "Log email non trovato" }, { status: 404 });
  }

  if (!log.retryable) {
    return NextResponse.json(
      { error: "Email non ritentabile: le credenziali sono state aggiornate" },
      { status: 400 }
    );
  }

  const classification = classifyEmailType(log.emailType);
  if (classification.sensitive) {
    const result = await regenerateSensitiveEmailFromLog(log.id);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          action: "regenerated",
          error: result.error || result.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action: "regenerated",
      message: result.message,
    });
  }

  const result = await retryNonSensitiveEmailLog(log.id);
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        action: "retried",
        error: result.error || result.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    action: "retried",
    message: result.message,
  });
}
