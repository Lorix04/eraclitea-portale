import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

type EmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
};

function parseFromAddress(from: string): { fromName: string; fromEmail: string } {
  const raw = from.trim();
  const match = raw.match(/^\s*"?([^"]+?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    return {
      fromName: match[1].trim(),
      fromEmail: match[2].trim(),
    };
  }
  return { fromName: "", fromEmail: raw };
}

function formatFromAddress(config: SmtpConfig): string {
  if (!config.fromName) return config.fromEmail;
  return `"${config.fromName}" <${config.fromEmail}>`;
}

function getEnvSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    typeof process.env.SMTP_SECURE === "string"
      ? process.env.SMTP_SECURE === "true"
      : port === 465;
  const { fromName, fromEmail } = parseFromAddress(from);

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromName,
    fromEmail,
  };
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const dbAccount = await prisma.emailAccount.findFirst({
      where: { isDefault: true, isActive: true },
      orderBy: { updatedAt: "desc" },
    });

    if (dbAccount) {
      return {
        host: dbAccount.smtpHost,
        port: dbAccount.smtpPort,
        secure: dbAccount.smtpSecure,
        user: dbAccount.smtpUser,
        pass: decrypt(dbAccount.smtpPass),
        fromName: dbAccount.senderName,
        fromEmail: dbAccount.senderEmail,
      };
    }
  } catch (error) {
    console.warn("Errore lettura account email dal DB, uso fallback .env:", error);
  }

  const envConfig = getEnvSmtpConfig();
  if (envConfig) {
    return envConfig;
  }

  console.warn("Nessuna configurazione email trovata (ne DB ne .env)");
  return null;
}

export async function getTransporter() {
  const config = await getSmtpConfig();
  if (!config) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

export async function getFromAddress(): Promise<string> {
  const config = await getSmtpConfig();
  if (!config) {
    return "noreply@example.com";
  }

  return formatFromAddress(config);
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const config = await getSmtpConfig();
  if (!config) {
    console.warn("Invio email saltato: configurazione SMTP assente");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: formatFromAddress(config),
      ...options,
    });

    return true;
  } catch (error) {
    console.error("Email error:", error);
    return false;
  }
}

export const send = sendEmail;
