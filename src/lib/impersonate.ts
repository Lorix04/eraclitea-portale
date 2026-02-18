import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const IMPERSONATE_ADMIN_COOKIE = "impersonate_admin_id";
export const IMPERSONATE_CLIENT_COOKIE = "impersonate_client_id";
export const IMPERSONATE_MAX_AGE_SECONDS = 2 * 60 * 60;

type BaseContext = {
  session: Session;
  userId: string;
  clientId: string | null;
  role: "ADMIN" | "CLIENT";
  isImpersonating: boolean;
  originalAdminId?: string;
  impersonatedClientName?: string | null;
};

export type EffectiveUserContext = BaseContext;
export type EffectiveClientContext = BaseContext & {
  role: "CLIENT";
  clientId: string;
};

export type EffectiveUserIdentity = {
  userId: string;
  clientId: string | null;
  role: "ADMIN" | "CLIENT";
  isImpersonating: boolean;
  originalAdminId?: string;
};

export async function getEffectiveUserContext(): Promise<EffectiveUserContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }

  if (session.user.role === "CLIENT") {
    return {
      session,
      userId: session.user.id,
      clientId: session.user.clientId ?? null,
      role: "CLIENT",
      isImpersonating: false,
    };
  }

  const cookieStore = cookies();
  const impersonateAdminId = cookieStore.get(IMPERSONATE_ADMIN_COOKIE)?.value;
  const impersonateClientId = cookieStore.get(IMPERSONATE_CLIENT_COOKIE)?.value;

  if (
    session.user.role === "ADMIN" &&
    impersonateAdminId &&
    impersonateClientId &&
    impersonateAdminId === session.user.id
  ) {
    const impersonatedUser = await prisma.user.findUnique({
      where: { id: impersonateClientId },
      select: {
        id: true,
        role: true,
        isActive: true,
        clientId: true,
        email: true,
        client: { select: { ragioneSociale: true, isActive: true } },
      },
    });

    if (
      impersonatedUser &&
      impersonatedUser.role === "CLIENT" &&
      impersonatedUser.isActive &&
      impersonatedUser.client?.isActive !== false &&
      impersonatedUser.clientId
    ) {
      return {
        session,
        userId: impersonatedUser.id,
        clientId: impersonatedUser.clientId,
        role: "CLIENT",
        isImpersonating: true,
        originalAdminId: impersonateAdminId,
        impersonatedClientName:
          impersonatedUser.client?.ragioneSociale ?? impersonatedUser.email,
      };
    }
  }

  return {
    session,
    userId: session.user.id,
    clientId: session.user.clientId ?? null,
    role: "ADMIN",
    isImpersonating: false,
  };
}

export async function getEffectiveClientContext(): Promise<EffectiveClientContext | null> {
  const context = await getEffectiveUserContext();
  if (!context || context.role !== "CLIENT" || !context.clientId) {
    return null;
  }
  return {
    ...context,
    role: "CLIENT",
    clientId: context.clientId,
  };
}

export async function getEffectiveUserId(): Promise<EffectiveUserIdentity | null> {
  const context = await getEffectiveUserContext();
  if (!context) {
    return null;
  }

  return {
    userId: context.userId,
    clientId: context.clientId,
    role: context.role,
    isImpersonating: context.isImpersonating,
    originalAdminId: context.originalAdminId,
  };
}
