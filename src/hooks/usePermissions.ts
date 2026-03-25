"use client";

import { useSession } from "next-auth/react";
import {
  hasPermission,
  canAccessArea,
  type PermissionArea,
  type PermissionAction,
  type PermissionsMap,
} from "@/lib/permissions";

export function usePermissions() {
  const { data: session } = useSession();

  const permissions = (session?.user?.permissions ?? null) as PermissionsMap | null;
  const isSuperAdmin = session?.user?.isSuperAdmin ?? false;

  return {
    can: (area: PermissionArea, action: PermissionAction) =>
      hasPermission(permissions, area, action, isSuperAdmin),
    canAccess: (area: PermissionArea) =>
      canAccessArea(permissions, area, isSuperAdmin),
    isSuperAdmin,
    roleName: session?.user?.adminRoleName || "Super Admin",
    permissions,
  };
}
