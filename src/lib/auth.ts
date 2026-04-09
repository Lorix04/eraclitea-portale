import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
    async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("INVALID_CREDENTIALS");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        // Email not found → generic (no user enumeration)
        if (!user) {
          throw new Error("INVALID_CREDENTIALS");
        }

        // Account suspended → specific message
        if (!user.isActive && user.suspendedAt) {
          throw new Error("ACCOUNT_SUSPENDED");
        }

        // Account inactive (not suspended) → generic
        if (!user.isActive) {
          throw new Error("INVALID_CREDENTIALS");
        }

        // Account locked → specific message
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("ACCOUNT_LOCKED");
        }

        // Expired lock → reset and notify
        if (user.lockedUntil && user.lockedUntil <= new Date()) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
          // Fire-and-forget unlock email
          import("@/lib/email-service").then(({ sendAutoEmail }) => {
            import("@/lib/email-templates").then(({ buildEmailHtml, emailParagraph }) => {
              void sendAutoEmail({
                emailType: "ACCOUNT_UNLOCKED",
                recipientEmail: user.email,
                recipientName: user.name ?? undefined,
                recipientId: user.id,
                subject: "Account sbloccato - Sapienta",
                html: buildEmailHtml({
                  title: "Account Sbloccato",
                  greeting: `Gentile ${user.name || user.email},`,
                  bodyHtml: `
                    ${emailParagraph("Il tuo account è stato sbloccato dopo il periodo di blocco temporaneo.")}
                    ${emailParagraph("Se non hai tentato di accedere, ti consigliamo di cambiare la password per sicurezza.")}
                  `,
                  ctaText: "Accedi al Portale",
                  ctaUrl: `${process.env.NEXTAUTH_URL || "https://sapienta.it"}/login`,
                }),
                ignorePreference: true,
              });
            }).catch(() => {});
          }).catch(() => {});
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          const newAttempts = user.failedLoginAttempts + 1;
          const MAX_ATTEMPTS = 5;
          const LOCK_MINUTES = 15;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newAttempts >= MAX_ATTEMPTS ? 0 : newAttempts,
              lockedUntil:
                newAttempts >= MAX_ATTEMPTS
                  ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
                  : undefined,
            },
          });

          if (newAttempts >= MAX_ATTEMPTS) {
            throw new Error("ACCOUNT_LOCKED");
          }
          throw new Error("INVALID_CREDENTIALS");
        }

        // Teacher-specific validation
        if (user.role === "TEACHER") {
          const teacher = await prisma.teacher.findUnique({
            where: { userId: user.id },
          });

          if (!teacher || teacher.status === "INACTIVE" || teacher.status === "SUSPENDED" || teacher.status === "PENDING") {
            throw new Error("INVALID_CREDENTIALS");
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clientId: user.clientId,
          adminRoleId: user.adminRoleId,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.clientId = (user as any).clientId ?? null;
        token.mustChangePassword = Boolean((user as any).mustChangePassword);
        token.id = user.id;
        token.name = (user as any).name ?? null;

        // Load client owner data for CLIENT role
        if (token.role === "CLIENT" && token.clientId) {
          const clientUser = await prisma.clientUser.findUnique({
            where: {
              clientId_userId: {
                clientId: token.clientId as string,
                userId: user.id,
              },
            },
            select: { isOwner: true },
          });
          token.isClientOwner = clientUser?.isOwner ?? false;
        }

        // Load teacher data for TEACHER role
        if (token.role === "TEACHER") {
          const teacher = await prisma.teacher.findUnique({
            where: { userId: user.id },
            select: { id: true, status: true },
          });
          token.teacherId = teacher?.id ?? null;
          token.teacherStatus = teacher?.status ?? null;
        }

        // Load admin role data for ADMIN role
        if (token.role === "ADMIN") {
          const adminRoleId = (user as any).adminRoleId;
          if (adminRoleId) {
            const adminRole = await prisma.adminRole.findUnique({
              where: { id: adminRoleId },
              select: { id: true, name: true, permissions: true, isSystem: true },
            });
            token.adminRoleId = adminRole?.id ?? null;
            token.adminRoleName = adminRole?.name ?? null;
            token.permissions = (adminRole?.permissions as Record<string, string[]>) ?? null;
            token.isSuperAdmin = adminRole?.isSystem === true;
          } else {
            // Admin without role — no permissions until a role is assigned
            token.adminRoleId = null;
            token.adminRoleName = null;
            token.permissions = null;
            token.isSuperAdmin = false;
          }
        }
      }

      // Refresh admin role for legacy tokens that don't have permissions loaded
      if (token.role === "ADMIN" && token.isSuperAdmin === undefined && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { adminRoleId: true },
        });
        const roleId = dbUser?.adminRoleId;
        if (roleId) {
          const adminRole = await prisma.adminRole.findUnique({
            where: { id: roleId },
            select: { id: true, name: true, permissions: true, isSystem: true },
          });
          token.adminRoleId = adminRole?.id ?? null;
          token.adminRoleName = adminRole?.name ?? null;
          token.permissions = (adminRole?.permissions as Record<string, string[]>) ?? null;
          token.isSuperAdmin = adminRole?.isSystem === true;
        } else {
          token.adminRoleId = null;
          token.adminRoleName = null;
          token.permissions = null;
          token.isSuperAdmin = false;
        }
      }

      if (trigger === "update" && session) {
        if (typeof (session as any).mustChangePassword === "boolean") {
          token.mustChangePassword = (session as any).mustChangePassword;
        }
        // Allow updating teacherStatus on session update
        if (typeof (session as any).teacherStatus === "string") {
          token.teacherStatus = (session as any).teacherStatus;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "CLIENT" | "TEACHER";
        session.user.clientId = (token.clientId as string | null) ?? null;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.teacherId = (token.teacherId as string | null) ?? null;
        session.user.teacherStatus = (token.teacherStatus as string | null) ?? null;
        session.user.adminRoleId = (token.adminRoleId as string | null) ?? null;
        session.user.adminRoleName = (token.adminRoleName as string | null) ?? null;
        session.user.permissions = token.permissions ?? null;
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
        session.user.isClientOwner = Boolean(token.isClientOwner);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
