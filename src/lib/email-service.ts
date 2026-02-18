import { prisma } from "@/lib/prisma";
import { getFromAddress, getTransporter } from "@/lib/email";

export type EmailLogStatus = "SENT" | "FAILED" | "PENDING";

export type SendAutoEmailOptions = {
  emailType: string;
  recipientEmail: string;
  recipientName?: string;
  recipientId?: string;
  subject: string;
  html: string;
  courseEditionId?: string;
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
    courseEditionId,
  } = options;

  try {
    const preference = await prisma.emailPreference.findUnique({
      where: { emailType },
      select: { isEnabled: true },
    });

    if (preference && !preference.isEnabled) {
      console.log(
        `[Email] Tipo "${emailType}" disabilitato, invio saltato verso ${recipientEmail}`
      );
      return false;
    }

    const transporter = await getTransporter();
    if (!transporter) {
      await logEmail({
        emailType,
        recipientEmail,
        recipientName,
        recipientId,
        subject,
        courseEditionId,
        status: "FAILED",
        errorMessage: "Nessun account SMTP configurato",
      });
      console.warn(
        `[Email] Nessun account SMTP configurato, invio "${emailType}" saltato`
      );
      return false;
    }

    const from = await getFromAddress();
    await transporter.sendMail({
      from,
      to: recipientEmail,
      subject,
      html,
    });

    await logEmail({
      emailType,
      recipientEmail,
      recipientName,
      recipientId,
      subject,
      courseEditionId,
      status: "SENT",
    });

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    console.error(
      `[Email] Errore invio "${emailType}" verso ${recipientEmail}:`,
      message
    );

    await logEmail({
      emailType,
      recipientEmail,
      recipientName,
      recipientId,
      subject,
      courseEditionId,
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
  status: EmailLogStatus;
  errorMessage?: string;
};

export async function logEmail(input: LogEmailInput) {
  try {
    await prisma.emailLog.create({
      data: {
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName || null,
        recipientId: input.recipientId || null,
        emailType: input.emailType,
        subject: input.subject,
        courseEditionId: input.courseEditionId || null,
        status: input.status,
        errorMessage: input.errorMessage || null,
      },
    });
  } catch (error) {
    console.error("[Email] Errore log email:", error);
  }
}
