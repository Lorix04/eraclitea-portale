import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "CLIENT" | "TEACHER";
      clientId: string | null;
      teacherId?: string | null;
      teacherStatus?: string | null;
      mustChangePassword: boolean;
      email?: string | null;
      name?: string | null;
      adminRoleId?: string | null;
      adminRoleName?: string | null;
      permissions?: Record<string, string[]> | null;
      isSuperAdmin?: boolean;
      isClientOwner?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "CLIENT" | "TEACHER";
    clientId?: string | null;
    teacherId?: string | null;
    teacherStatus?: string | null;
    mustChangePassword?: boolean;
    adminRoleId?: string | null;
    adminRoleName?: string | null;
    permissions?: Record<string, string[]> | null;
    isSuperAdmin?: boolean;
    isClientOwner?: boolean;
  }
}
