import nodemailer from "nodemailer";

type EmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@enteformazione.it",
      ...options,
    });
    return true;
  } catch (error) {
    console.error("Email error:", error);
    return false;
  }
}

export async function sendEmailDev(options: EmailOptions): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    console.log("📧 Email (dev mode):");
    console.log("   To:", options.to);
    console.log("   Subject:", options.subject);
    console.log("   Body:", options.text || options.html.substring(0, 200));
  }
  return true;
}

export const send = process.env.SMTP_HOST ? sendEmail : sendEmailDev;
