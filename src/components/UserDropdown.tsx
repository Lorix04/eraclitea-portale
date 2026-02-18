"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";

export default function UserDropdown() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!session?.user) {
    return null;
  }

  const initials =
    session.user.email?.split("@")[0].slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full border bg-background text-sm font-semibold"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Menu utente"
      >
        {initials}
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 min-w-[220px] max-w-[280px] rounded-lg border bg-card shadow-lg">
          <div className="border-b px-4 py-3">
            <p
              className="max-w-[200px] truncate text-sm font-medium"
              title={session.user.email ?? undefined}
            >
              {session.user.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {session.user.role?.toLowerCase()}
            </p>
          </div>
          <div className="flex flex-col p-2 text-sm">
            <Link
              href="/profilo"
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <User className="h-4 w-4" />
              Profilo
            </Link>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-red-600 hover:bg-red-50"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
              Esci
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
