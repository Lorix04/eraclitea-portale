import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Permission areas and actions
// ---------------------------------------------------------------------------

export const PERMISSION_AREAS = {
  dashboard:    { label: "Dashboard",           actions: ["view"] },
  corsi:        { label: "Corsi",               actions: ["view", "create", "edit", "delete"] },
  edizioni:     { label: "Edizioni",            actions: ["view-all", "view-own", "create", "edit", "delete", "duplicate"] },
  "area-corsi": { label: "Area Corsi",          actions: ["view", "create", "edit", "delete"] },
  clienti:      { label: "Clienti",             actions: ["view", "create", "edit", "delete", "impersonate", "reset-password"] },
  dipendenti:   { label: "Dipendenti",          actions: ["view", "create", "edit", "delete", "import"] },
  docenti:      { label: "Docenti",             actions: ["view", "create", "edit", "delete", "invite", "impersonate", "suspend"] },
  attestati:    { label: "Attestati",           actions: ["view-all", "view-own", "create", "edit", "delete", "upload"] },
  presenze:     { label: "Presenze",            actions: ["view-all", "view-own", "edit"] },
  materiali:    { label: "Materiali",           actions: ["view-all", "view-own", "create", "edit", "delete", "approve"] },
  ticket:       { label: "Ticket",              actions: ["view", "reply", "close"] },
  notifiche:    { label: "Notifiche",           actions: ["view", "send"] },
  export:       { label: "Export",              actions: ["view", "export"] },
  audit:        { label: "Audit",               actions: ["view"] },
  smtp:         { label: "SMTP",                actions: ["view", "edit", "retry"] },
  status:       { label: "Status",              actions: ["view"] },
  'integrazioni-ai': { label: "Integrazioni AI", actions: ["view", "edit"] },
  ruoli:        { label: "Ruoli e Permessi",    actions: ["view", "create", "edit", "delete", "assign"] },
  guida:        { label: "Guida",               actions: ["view"] },
} as const;

export type PermissionArea = keyof typeof PERMISSION_AREAS;
export type PermissionAction = string;

export type PermissionsMap = {
  [area in PermissionArea]?: PermissionAction[];
};

// ---------------------------------------------------------------------------
// Action labels (Italian)
// ---------------------------------------------------------------------------

export const ACTION_LABELS: Record<string, string> = {
  view: "Visualizza",
  "view-all": "Visualizza tutte",
  "view-own": "Visualizza proprie (referente)",
  create: "Crea",
  edit: "Modifica",
  delete: "Elimina",
  duplicate: "Duplica",
  impersonate: "Accedi come",
  "reset-password": "Reset password",
  invite: "Invia invito",
  suspend: "Sospendi/Riattiva",
  upload: "Carica",
  approve: "Approva",
  reply: "Rispondi",
  close: "Chiudi",
  send: "Invia",
  export: "Esporta",
  retry: "Riprova invio",
  import: "Importa",
  assign: "Assegna ruoli",
};

// ---------------------------------------------------------------------------
// Check helpers
// ---------------------------------------------------------------------------

export function hasPermission(
  permissions: PermissionsMap | undefined | null,
  area: PermissionArea,
  action: PermissionAction,
  isSuperAdmin?: boolean
): boolean {
  if (isSuperAdmin) return true;
  // No permissions and not super admin → deny access
  if (!permissions || Object.keys(permissions).length === 0) return false;

  const areaPermissions = permissions[area];
  if (!areaPermissions) return false;
  return areaPermissions.includes(action);
}

export function canAccessArea(
  permissions: PermissionsMap | undefined | null,
  area: PermissionArea,
  isSuperAdmin?: boolean
): boolean {
  // Areas with view-all/view-own: either grants access
  if (
    hasPermission(permissions, area, "view-all", isSuperAdmin) ||
    hasPermission(permissions, area, "view-own", isSuperAdmin)
  ) {
    return true;
  }
  return hasPermission(permissions, area, "view", isSuperAdmin);
}

// ---------------------------------------------------------------------------
// Edition-scoped visibility (view-all vs view-own)
// ---------------------------------------------------------------------------

/** Check if user has view-all for an area (sees everything) */
export function hasViewAll(
  permissions: PermissionsMap | undefined | null,
  area: PermissionArea,
  isSuperAdmin?: boolean
): boolean {
  if (isSuperAdmin) return true;
  if (!permissions || Object.keys(permissions).length === 0) return false;
  const areaPerms = permissions[area];
  if (!areaPerms) return false;
  // Legacy: "view" alone treated as view-all for retrocompat
  return areaPerms.includes("view-all") || areaPerms.includes("view");
}

/** Check if user has only view-own (needs referent filter) */
export function hasOnlyViewOwn(
  permissions: PermissionsMap | undefined | null,
  area: PermissionArea,
  isSuperAdmin?: boolean
): boolean {
  if (isSuperAdmin) return false;
  if (!permissions || Object.keys(permissions).length === 0) return false;
  const areaPerms = permissions[area];
  if (!areaPerms) return false;
  return (
    areaPerms.includes("view-own") &&
    !areaPerms.includes("view-all") &&
    !areaPerms.includes("view")
  );
}

/**
 * Build a Prisma where filter for edition visibility.
 * Returns null if user can see everything, or a filter for view-own.
 */
export function editionVisibilityFilter(
  session: any
): { referents: { some: { userId: string } } } | { OR: any[] } | null {
  if (!session || session.user.role !== "ADMIN") return null;
  const permissions = session.user.permissions as PermissionsMap | undefined;
  if (hasOnlyViewOwn(permissions, "edizioni", session.user.isSuperAdmin)) {
    // view-own: see own editions + editions with no referents
    return {
      OR: [
        { referents: { some: { userId: session.user.id } } },
        { referents: { none: {} } },
      ],
    };
  }
  return null; // view-all or legacy: no filter
}

// ---------------------------------------------------------------------------
// Session-based check for API routes
// ---------------------------------------------------------------------------

export function checkApiPermission(
  session: any,
  area: PermissionArea,
  action: PermissionAction
): boolean {
  if (session?.user?.role !== "ADMIN") return false;
  return hasPermission(
    session.user.permissions as PermissionsMap | undefined,
    area,
    action,
    session.user.isSuperAdmin
  );
}

/**
 * Convenience: get session, verify ADMIN role, and check permission.
 * Returns the session on success or a NextResponse 401/403 on failure.
 */
export async function requirePermission(
  area: PermissionArea,
  action: PermissionAction
): Promise<{ session: any } | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (!checkApiPermission(session, area, action)) {
    return NextResponse.json(
      { error: `Non hai i permessi per questa operazione (${area}.${action})` },
      { status: 403 }
    );
  }
  return { session };
}
