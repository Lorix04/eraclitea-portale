import { NextResponse } from "next/server";
import {
  IMPERSONATE_ADMIN_COOKIE,
  IMPERSONATE_CLIENT_COOKIE,
  IMPERSONATE_TEACHER_COOKIE,
} from "@/lib/impersonate";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  // Clear all impersonation cookies
  for (const name of [
    IMPERSONATE_ADMIN_COOKIE,
    IMPERSONATE_CLIENT_COOKIE,
    IMPERSONATE_TEACHER_COOKIE,
  ]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
