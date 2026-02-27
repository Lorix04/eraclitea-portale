"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

const LOGOUT_SYNC_KEY = "logout";

export default function LogoutSync() {
  const { status } = useSession();
  const previousStatusRef = useRef(status);
  const syncingRef = useRef(false);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LOGOUT_SYNC_KEY || !event.newValue) return;
      if (syncingRef.current) return;

      syncingRef.current = true;
      void signOut({ callbackUrl: "/login" });
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (previousStatus === "authenticated" && status === "unauthenticated") {
      localStorage.setItem(LOGOUT_SYNC_KEY, String(Date.now()));
    }
  }, [status]);

  return null;
}

