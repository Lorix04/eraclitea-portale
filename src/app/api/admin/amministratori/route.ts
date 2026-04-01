import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { validateQuery } from "@/lib/api-utils";
import { requirePermission } from "@/lib/permissions";
import { logAudit, getClientIP } from "@/lib/audit";
import { sendAutoEmail } from "@/lib/email-service";
import {
  buildEmailHtml,
  emailParagraph,
  emailInfoBox,
} from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  search: z.string().optional(),
  adminRoleId: z.string().optional(),
  status: z.enum(["active", "locked", "mustChange"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
  sortBy: z
    .enum(["email", "role", "lastLoginAt", "createdAt"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export async function GET(request: Request) {
  const check = await requirePermission("amministratori", "view");
  if (check instanceof NextResponse) return check;

  const validation = validateQuery(request, querySchema);
  if ("error" in validation) return validation.error;
  const { search, adminRoleId, status, sortBy: rawSortBy, sortOrder: rawSortOrder } =
    validation.data;
  const page = validation.data.page ?? 1;
  const limit = validation.data.limit ?? 50;
  const sortBy = rawSortBy ?? "createdAt";
  const sortOrder = rawSortOrder ?? "desc";

  const where: Prisma.UserWhereInput = { role: "ADMIN" };

  if (adminRoleId === "none") {
    where.adminRoleId = null;
  } else if (adminRoleId) {
    where.adminRoleId = adminRoleId;
  }

  if (status === "active") {
    where.isActive = true;
    where.lockedUntil = null;
    where.mustChangePassword = false;
  } else if (status === "locked") {
    where.lockedUntil = { gt: new Date() };
  } else if (status === "mustChange") {
    where.mustChangePassword = true;
  }

  if (search) {
    const q = search.trim();
    where.OR = [
      { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
      { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
      {
        adminRole: {
          name: { contains: q, mode: Prisma.QueryMode.insensitive },
        },
      },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        mustChangePassword: true,
        lockedUntil: true,
        failedLoginAttempts: true,
        adminRole: { select: { id: true, name: true, isSystem: true } },
      },
      orderBy: { [sortBy as string]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      mustChangePassword: u.mustChangePassword,
      isLocked: u.lockedUntil ? u.lockedUntil > new Date() : false,
      lockedUntil: u.lockedUntil,
      failedLoginAttempts: u.failedLoginAttempts,
      adminRole: u.adminRole,
    })),
    total,
    page,
    limit,
  });
}

// ─── Password generation ────────────────────────────────────
function generateSecurePassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;

  // Guarantee at least one of each category
  const parts = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digits[crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)],
  ];

  // Fill the rest
  for (let i = parts.length; i < length; i++) {
    parts.push(all[crypto.randomInt(all.length)]);
  }

  // Shuffle
  for (let i = parts.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }

  return parts.join("");
}

// ─── POST — Create user ─────────────────────────────────────
const createSchema = z.object({
  email: z.string().trim().email("Email non valida"),
  name: z.string().trim().max(200).optional().default(""),
  adminRoleId: z.string().cuid().optional().nullable(),
  sendEmail: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  const check = await requirePermission("amministratori", "create");
  if (check instanceof NextResponse) return check;
  const { session } = check;

  let body: z.infer<typeof createSchema>;
  try {
    const raw = await request.json();
    body = createSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const emailLower = body.email.toLowerCase().trim();

  // Check email uniqueness
  const existing = await prisma.user.findFirst({
    where: { email: { equals: emailLower, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Esiste gia un utente con questa email" },
      { status: 409 }
    );
  }

  // Validate admin role if provided
  if (body.adminRoleId) {
    const adminRole = await prisma.adminRole.findUnique({
      where: { id: body.adminRoleId },
      select: { id: true },
    });
    if (!adminRole) {
      return NextResponse.json(
        { error: "Ruolo admin non trovato" },
        { status: 404 }
      );
    }
  }

  // Generate secure password
  const plainPassword = generateSecurePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  try {
    const createdUser = await prisma.user.create({
      data: {
        email: emailLower,
        name: body.name || null,
        passwordHash,
        role: "ADMIN",
        mustChangePassword: true,
        isActive: true,
        adminRoleId: body.adminRoleId || null,
      },
    });

    // Audit log
    await logAudit({
      userId: session.user.id,
      action: "USER_CREATE",
      entityType: "User",
      entityId: createdUser.id,
      ipAddress: getClientIP(request),
    });

    // Send welcome email with credentials
    if (body.sendEmail) {
      const portalUrl = process.env.NEXTAUTH_URL || "https://sapienta.it";
      const html = buildEmailHtml({
        title: "Benvenuto su Sapienta",
        greeting: body.name ? `Gentile ${body.name},` : `Gentile utente,`,
        bodyHtml: `
          ${emailParagraph("E stato creato un account per te sul Portale Sapienta.")}
          ${emailInfoBox(`
            <p style="margin:0 0 8px; font-size:14px; color:#1A1A1A;"><strong>Email:</strong> ${emailLower}</p>
            <p style="margin:0; font-size:14px; color:#1A1A1A;"><strong>Password temporanea:</strong> ${plainPassword}</p>
          `)}
          ${emailParagraph("Al primo accesso ti verra chiesto di cambiare la password.")}
        `,
        ctaText: "Accedi al Portale",
        ctaUrl: `${portalUrl}/login`,
        footerNote:
          "Se non hai richiesto questo account, ignora questa email.",
      });

      void sendAutoEmail({
        emailType: "WELCOME",
        recipientEmail: emailLower,
        recipientId: createdUser.id,
        subject: "Benvenuto su Portale Sapienta — Le tue credenziali di accesso",
        html,
        ignorePreference: true,
      });
    }

    return NextResponse.json(
      {
        success: true,
        userId: createdUser.id,
        message: body.sendEmail
          ? `Utente creato e email inviata a ${emailLower}`
          : `Utente creato (senza email)`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[ADMIN_UTENTI_POST] Error:", error);
    return NextResponse.json(
      { error: "Errore durante la creazione dell'utente" },
      { status: 500 }
    );
  }
}
