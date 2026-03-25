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
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) {
          return null;
        }

        // Account lockout check
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          // Increment failed attempts and lock if threshold reached
          const newAttempts = user.failedLoginAttempts + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newAttempts >= 5 ? 0 : newAttempts,
              lockedUntil:
                newAttempts >= 5
                  ? new Date(Date.now() + 15 * 60 * 1000)
                  : undefined,
            },
          });
          return null;
        }

        // Teacher-specific validation
        if (user.role === "TEACHER") {
          const teacher = await prisma.teacher.findUnique({
            where: { userId: user.id },
          });

          if (!teacher) {
            return null;
          }

          if (teacher.status === "INACTIVE" || teacher.status === "SUSPENDED") {
            return null;
          }

          if (teacher.status === "PENDING") {
            return null;
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
            // Legacy admin without role — treat as super admin
            token.adminRoleId = null;
            token.adminRoleName = null;
            token.permissions = null;
            token.isSuperAdmin = true;
          }
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
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
