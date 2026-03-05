import crypto from "crypto";
import bcrypt from "bcryptjs";
import { EmailLog } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendAutoEmail, deliverEmail } from "@/lib/email-service";
import { sendWelcomeEmail } from "@/lib/email-notifications";
import {
  adminResetPasswordTemplate,
  passwordResetRequestTemplate,
} from "@/lib/email-templates";
import { classifyEmailType } from "@/lib/email-retry-policy";

type RetryResult = {
  success: boolean;
  action: "retried" | "regenerated";
  message: string;
  error?: string;
};

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

async function getTargetUser(log: EmailLog) {
  if (log.recipientId) {
    const byId = await prisma.user.findUnique({
      where: { id: log.recipientId },
      include: { client: true },
    });
    if (byId) return byId;
  }

  return prisma.user.findUnique({
    where: { email: log.recipientEmail },
    include: { client: true },
  });
}

export async function getEmailLogById(logId: string) {
  return prisma.emailLog.findUnique({ where: { id: logId } });
}

export async function getFailedRetryableEmailLogs(ids?: string[]) {
  return prisma.emailLog.findMany({
    where: {
      status: "FAILED",
      retryable: true,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
    },
    orderBy: { sentAt: "asc" },
  });
}

export async function retryNonSensitiveEmailLog(
  logId: string,
  options?: {
    autoMode?: boolean;
    maxAutoRetries?: number;
  }
): Promise<RetryResult> {
  const autoMode = options?.autoMode ?? false;
  const maxAutoRetries = options?.maxAutoRetries ?? 3;

  const log = await prisma.emailLog.findUnique({ where: { id: logId } });
  if (!log) {
    return {
      success: false,
      action: "retried",
      message: "Log email non trovato",
      error: "Log email non trovato",
    };
  }

  if (!log.retryable) {
    return {
      success: false,
      action: "retried",
      message: "Email non ritentabile",
      error: "Email non ritentabile",
    };
  }

  const classification = classifyEmailType(log.emailType);
  if (classification.sensitive) {
    return {
      success: false,
      action: "retried",
      message: "Email sensibile: usare rigenerazione credenziali",
      error: "Email sensibile",
    };
  }

  if (!log.htmlBody || !log.subject || !log.recipientEmail) {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        errorMessage: "Payload email incompleto, impossibile ritentare",
      },
    });
    return {
      success: false,
      action: "retried",
      message: "Payload email incompleto",
      error: "Payload email incompleto",
    };
  }

  const retryingLog = await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      retryStatus: "retrying",
      lastRetryAt: new Date(),
      retryCount: {
        increment: 1,
      },
    },
    select: { retryCount: true },
  });

  const delivery = await deliverEmail({
    to: log.recipientEmail,
    subject: log.subject,
    html: log.htmlBody,
    text: log.textBody ?? undefined,
  });

  if (delivery.success) {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: "SENT",
        retryStatus: "success",
        errorMessage: null,
      },
    });
    return {
      success: true,
      action: "retried",
      message: "Email reinviata con successo",
    };
  }

  const exhausted = autoMode && retryingLog.retryCount >= maxAutoRetries;
  await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      status: "FAILED",
      retryStatus: exhausted ? "abandoned" : null,
      errorMessage: delivery.errorMessage ?? "Errore sconosciuto",
    },
  });

  return {
    success: false,
    action: "retried",
    message: exhausted
      ? "Retry automatici esauriti"
      : "Retry non riuscito",
    error: delivery.errorMessage ?? "Errore sconosciuto",
  };
}

export async function regenerateSensitiveEmailFromLog(
  logId: string
): Promise<RetryResult> {
  const log = await prisma.emailLog.findUnique({ where: { id: logId } });
  if (!log) {
    return {
      success: false,
      action: "regenerated",
      message: "Log email non trovato",
      error: "Log email non trovato",
    };
  }

  if (!log.retryable) {
    return {
      success: false,
      action: "regenerated",
      message: "Email non ritentabile: credenziali obsolete",
      error: "Email non ritentabile",
    };
  }

  const classification = classifyEmailType(log.emailType);
  if (!classification.sensitive) {
    return {
      success: false,
      action: "regenerated",
      message: "Email non sensibile: usare retry standard",
      error: "Email non sensibile",
    };
  }

  const user = await getTargetUser(log);
  if (!user) {
    return {
      success: false,
      action: "regenerated",
      message: "Utente destinatario non trovato",
      error: "Utente destinatario non trovato",
    };
  }

  if (classification.normalizedType === "WELCOME") {
    const newPassword = generatePassword();
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    const sent = await sendWelcomeEmail(
      {
        clientEmail: user.email,
        clientName:
          user.client?.referenteNome || user.client?.ragioneSociale || user.email,
        clientId: user.id,
        tempPassword: newPassword,
      },
      {
        ignorePreference: true,
        meta: {
          regeneratedFromLogId: log.id,
          userId: user.id,
        },
      }
    );

    if (!sent) {
      return {
        success: false,
        action: "regenerated",
        message: "Invio email rigenerata non riuscito",
        error: "Invio email rigenerata non riuscito",
      };
    }
  } else if (classification.normalizedType === "PASSWORD_RESET_ADMIN") {
    const newPassword = generatePassword();
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    const sent = await sendAutoEmail({
      emailType: "PASSWORD_RESET_ADMIN",
      recipientEmail: user.email,
      recipientName:
        user.client?.referenteNome || user.client?.ragioneSociale || user.email,
      recipientId: user.id,
      subject: "La tua password è stata reimpostata — Sapienta",
      html: adminResetPasswordTemplate({
        clientName:
          user.client?.referenteNome || user.client?.ragioneSociale || user.email,
        email: user.email,
        newPassword,
      }),
      meta: {
        regeneratedFromLogId: log.id,
        userId: user.id,
      },
      ignorePreference: true,
    });

    if (!sent) {
      return {
        success: false,
        action: "regenerated",
        message: "Invio email rigenerata non riuscito",
        error: "Invio email rigenerata non riuscito",
      };
    }
  } else if (classification.normalizedType === "PASSWORD_RESET_REQUEST") {
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${resetToken}`;
    const sent = await sendAutoEmail({
      emailType: "PASSWORD_RESET_REQUEST",
      recipientEmail: user.email,
      recipientName: user.email,
      recipientId: user.id,
      subject: "Reimposta la tua password — Sapienta",
      html: passwordResetRequestTemplate(resetUrl),
      meta: {
        regeneratedFromLogId: log.id,
        userId: user.id,
        resetToken,
      },
      ignorePreference: true,
    });

    if (!sent) {
      return {
        success: false,
        action: "regenerated",
        message: "Invio email rigenerata non riuscito",
        error: "Invio email rigenerata non riuscito",
      };
    }
  } else {
    return {
      success: false,
      action: "regenerated",
      message: "Tipo email sensibile non supportato",
      error: "Tipo email sensibile non supportato",
    };
  }

  await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      retryable: false,
      retryStatus: "abandoned",
    },
  });

  return {
    success: true,
    action: "regenerated",
    message: "Nuove credenziali generate e inviate",
  };
}
