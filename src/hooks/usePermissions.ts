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
  const { data: session, status } = useSession();

  // Finché la sessione è in caricamento i permessi non sono ancora noti: `can`/`canAccess`
  // risponderebbero `false` facendo lampeggiare "Accesso non consentito" (e una sidebar
  // vuota) prima del contenuto. Chi fa da gate deve attendere `isLoading === false`.
  const isLoading = status === "loading";

  const permissions = (session?.user?.permissions ?? null) as PermissionsMap | null;
  const isSuperAdmin = session?.user?.isSuperAdmin ?? false;

  return {
    can: (area: PermissionArea, action: PermissionAction) =>
      hasPermission(permissions, area, action, isSuperAdmin),
    canAccess: (area: PermissionArea) =>
      canAccessArea(permissions, area, isSuperAdmin),
    isLoading,
    isSuperAdmin,
    roleName: session?.user?.adminRoleName || "Super Admin",
    permissions,
  };
}
