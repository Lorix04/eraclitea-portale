import { signOut } from "next-auth/react";

/**
 * Robust logout: clears impersonation cookies (httpOnly, must be server-side),
 * then calls NextAuth signOut with fallback redirect if signOut fails.
 */
export async function handleLogout() {
  try {
    // Clear httpOnly impersonation cookies via server endpoint
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  } catch {
    // ignore — best effort cleanup
  }

  try {
    await signOut({ callbackUrl: "/login" });
  } catch {
    // Fallback: if signOut fails, force navigate to login
    window.location.href = "/login";
  }
}
