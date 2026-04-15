import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getNotificationTypesForRole,
  getCategoriesForRole,
  NOTIFICATION_TYPES,
} from "@/lib/notification-types-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const role = session.user.role as "ADMIN" | "CLIENT" | "TEACHER";
  const userId = session.user.id;
  const typesForRole = getNotificationTypesForRole(role);

  const savedPrefs = await prisma.userNotificationPreference.findMany({
    where: { userId },
    select: { notificationType: true, inAppEnabled: true, emailEnabled: true },
  });
  const savedMap = new Map(
    savedPrefs.map((p) => [p.notificationType, p])
  );

  const preferences = typesForRole.map((cfg) => {
    const saved = savedMap.get(cfg.type);
    return {
      type: cfg.type,
      label: cfg.label,
      description: cfg.description,
      category: cfg.category,
      hasInApp: cfg.hasInApp,
      hasEmail: cfg.hasEmail,
      locked: cfg.locked,
      inAppEnabled: cfg.locked
        ? cfg.defaultInApp
        : (saved?.inAppEnabled ?? cfg.defaultInApp),
      emailEnabled: cfg.locked
        ? cfg.defaultEmail
        : (saved?.emailEnabled ?? cfg.defaultEmail),
    };
  });

  return NextResponse.json({
    preferences,
    categories: getCategoriesForRole(role),
  });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let body: {
    type?: string;
    inAppEnabled?: boolean;
    emailEnabled?: boolean;
    action?: "enable_all" | "disable_all" | "only_notifications";
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const role = session.user.role as "ADMIN" | "CLIENT" | "TEACHER";
  const userId = session.user.id;

  // Batch action
  if (body.action) {
    const typesForRole = getNotificationTypesForRole(role);
    const unlocked = typesForRole.filter((t) => !t.locked);

    for (const cfg of unlocked) {
      let inApp = cfg.defaultInApp;
      let email = cfg.defaultEmail;

      if (body.action === "enable_all") {
        inApp = cfg.hasInApp;
        email = cfg.hasEmail;
      } else if (body.action === "disable_all") {
        inApp = false;
        email = false;
      } else if (body.action === "only_notifications") {
        inApp = cfg.hasInApp;
        email = false;
      }

      await prisma.userNotificationPreference.upsert({
        where: {
          userId_notificationType: {
            userId,
            notificationType: cfg.type,
          },
        },
        update: { inAppEnabled: inApp, emailEnabled: email },
        create: {
          userId,
          notificationType: cfg.type,
          inAppEnabled: inApp,
          emailEnabled: email,
        },
      });
    }

    return NextResponse.json({ success: true });
  }

  // Single toggle
  if (!body.type) {
    return NextResponse.json({ error: "Tipo mancante" }, { status: 400 });
  }

  const typeConfig = NOTIFICATION_TYPES.find(
    (t) => t.type === body.type && t.roles.includes(role)
  );
  if (!typeConfig) {
    return NextResponse.json({ error: "Tipo non valido" }, { status: 400 });
  }
  if (typeConfig.locked) {
    return NextResponse.json(
      { error: "Questa notifica non puo essere disattivata" },
      { status: 403 }
    );
  }

  await prisma.userNotificationPreference.upsert({
    where: {
      userId_notificationType: { userId, notificationType: body.type },
    },
    update: {
      ...(body.inAppEnabled !== undefined
        ? { inAppEnabled: body.inAppEnabled }
        : {}),
      ...(body.emailEnabled !== undefined
        ? { emailEnabled: body.emailEnabled }
        : {}),
    },
    create: {
      userId,
      notificationType: body.type,
      inAppEnabled: body.inAppEnabled ?? typeConfig.defaultInApp,
      emailEnabled: body.emailEnabled ?? typeConfig.defaultEmail,
    },
  });

  return NextResponse.json({ success: true });
}
