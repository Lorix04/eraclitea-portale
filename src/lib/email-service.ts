import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFromAddress, getTransporter } from "@/lib/email";
import { classifyEmailType } from "@/lib/email-retry-policy";

export type EmailLogStatus = "SENT" | "FAILED" | "PENDING";

export type SendAutoEmailOptions = {
  emailType: string;
  recipientEmail: string;
  recipientName?: string;
  recipientId?: string;
  subject: string;
  html: string;
  text?: string;
  courseEditionId?: string;
  meta?: Record<string, unknown>;
  ignorePreference?: boolean;
  persistSensitivePayload?: boolean;
};

type SendDeliveryInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type DeliveryResult = {
  success: boolean;
  errorMessage?: string;
};

export async function sendAutoEmail(
  options: SendAutoEmailOptions
): Promise<boolean> {
  const {
    emailType,
    recipientEmail,
    recipientName,
    recipientId,
    subject,
    html,
    text,
    courseEditionId,
    meta,
    ignorePreference = false,
    persistSensitivePayload = false,
  } = options;
  const classification = classifyEmailType(emailType);
  const normalizedEmailType = classification.normalizedType;
  const shouldPersistPayload =
    !classification.sensitive || persistSensitivePayload;

  try {
    if (!ignorePreference) {
      const preference = await prisma.emailPreference.findUnique({
        where: { emailType: normalizedEmailType },
        select: { isEnabled: true },
      });

      if (preference && !preference.isEnabled) {
        console.log(
          `[Email] Tipo "${normalizedEmailType}" disabilitato, invio saltato verso ${recipientEmail}`
        );
        return false;
      }
    }

    const delivery = await deliverEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });
    if (!delivery.success) {
      await logEmail({
        emailType: normalizedEmailType,
        recipientEmail,
        recipientName,
        recipientId,
        subject,
        courseEditionId,
        sensitive: classification.sensitive,
        retryable: classification.retryable,
        htmlBody: shouldPersistPayload ? html : null,
        textBody: shouldPersistPayload ? text || null : null,
        meta: meta ?? null,
        status: "FAILED",
        errorMessage:
          delivery.errorMessage || "Nessun account SMTP configurato",
      });
      return false;
    }

    await logEmail({
      emailType: normalizedEmailType,
      recipientEmail,
      recipientName,
      recipientId,
      subject,
      courseEditionId,
      sensitive: classification.sensitive,
      retryable: classification.retryable,
      htmlBody: shouldPersistPayload ? html : null,
      textBody: shouldPersistPayload ? text || null : null,
      meta: meta ?? null,
      status: "SENT",
    });

    if (classification.sensitive) {
      await markSensitiveFailedEmailLogsAsAbandoned(
        normalizedEmailType,
        recipientEmail
      );
    }

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    console.error(
      `[Email] Errore invio "${normalizedEmailType}" verso ${recipientEmail}:`,
      message
    );

    await logEmail({
      emailType: normalizedEmailType,
      recipientEmail,
      recipientName,
      recipientId,
      subject,
      courseEditionId,
      sensitive: classification.sensitive,
      retryable: classification.retryable,
      htmlBody: shouldPersistPayload ? html : null,
      textBody: shouldPersistPayload ? text || null : null,
      meta: meta ?? null,
      status: "FAILED",
      errorMessage: message,
    });

    return false;
  }
}

type LogEmailInput = {
  emailType: string;
  recipientEmail: string;
  recipientName?: string;
  recipientId?: string;
  subject: string;
  courseEditionId?: string;
  sensitive?: boolean;
  retryable?: boolean;
  htmlBody?: string | null;
  textBody?: string | null;
  meta?: Record<string, unknown> | null;
  retryCount?: number;
  lastRetryAt?: Date | null;
  retryStatus?: string | null;
  status: EmailLogStatus;
  errorMessage?: string;
};

export async function logEmail(input: LogEmailInput) {
  try {
    const classification = classifyEmailType(input.emailType);
    const metaValue =
      input.meta === null || typeof input.meta === "undefined"
        ? undefined
        : (input.meta as Prisma.InputJsonValue);
    await prisma.emailLog.create({
      data: {
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName || null,
        recipientId: input.recipientId || null,
        emailType: classification.normalizedType,
        subject: input.subject,
        courseEditionId: input.courseEditionId || null,
        sensitive: input.sensitive ?? classification.sensitive,
        retryable: input.retryable ?? classification.retryable,
        retryCount: input.retryCount ?? 0,
        lastRetryAt: input.lastRetryAt ?? null,
        retryStatus: input.retryStatus ?? null,
        htmlBody: input.htmlBody ?? null,
        textBody: input.textBody ?? null,
        meta: metaValue,
        status: input.status,
        errorMessage: input.errorMessage || null,
      },
    });
  } catch (error) {
    console.error("[Email] Errore log email:", error);
  }
}

export async function deliverEmail(
  input: SendDeliveryInput
): Promise<DeliveryResult> {
  try {
    const transporter = await getTransporter();
    if (!transporter) {
      console.warn("[Email] Nessun account SMTP configurato");
      return {
        success: false,
        errorMessage: "Nessun account SMTP configurato",
      };
    }

    const from = await getFromAddress();
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    console.error("[Email] Errore invio email:", message);
    return { success: false, errorMessage: message };
  }
}

export async function markSensitiveFailedEmailLogsAsAbandoned(
  emailType: string,
  recipientEmail: string
) {
  const normalized = classifyEmailType(emailType).normalizedType;
  await prisma.emailLog.updateMany({
    where: {
      recipientEmail,
      emailType: normalized,
      status: "FAILED",
      retryable: true,
    },
    data: {
      retryable: false,
      retryStatus: "abandoned",
    },
  });
}
