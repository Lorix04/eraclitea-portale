"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const CONSENT_COOKIE_KEY = "cookie_consent";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  const target = cookies.find((item) => item.startsWith(`${name}=`));
  if (!target) return null;
  return decodeURIComponent(target.split("=")[1] ?? "");
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${CONSENT_MAX_AGE_SECONDS}; samesite=lax`;
}

function isPortalRoute(pathname: string) {
  const protectedPrefixes = [
    "/admin",
    "/dashboard",
    "/corsi",
    "/dipendenti",
    "/notifiche",
    "/attestati",
    "/supporto",
    "/storico",
    "/profilo",
  ];

  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function CookieBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const shouldHideOnPath = useMemo(() => {
    if (!pathname) return false;
    return isPortalRoute(pathname) || pathname.startsWith("/api/");
  }, [pathname]);

  useEffect(() => {
    if (shouldHideOnPath) {
      setVisible(false);
      return;
    }

    const consent = readCookie(CONSENT_COOKIE_KEY);
    if (consent === "accepted" || consent === "rejected") {
      setVisible(false);
      return;
    }

    setVisible(true);
  }, [shouldHideOnPath]);

  const handleChoice = (value: "accepted" | "rejected") => {
    writeCookie(CONSENT_COOKIE_KEY, value);
    setVisible(false);
  };

  if (!visible || shouldHideOnPath) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[110] border-t border-gray-200 bg-white/95 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.12)] backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-700 dark:text-gray-200">
          Questo sito utilizza cookie tecnici necessari al funzionamento del portale. Per maggiori informazioni consulta la{" "}
          <Link href="/cookie-policy" className="font-medium text-gray-900 underline underline-offset-2 hover:text-black dark:text-white">
            Cookie Policy
          </Link>{" "}
          e la{" "}
          <Link href="/privacy-policy" className="font-medium text-gray-900 underline underline-offset-2 hover:text-black dark:text-white">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => handleChoice("rejected")}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Rifiuta
          </button>
          <button
            type="button"
            onClick={() => handleChoice("accepted")}
            className="rounded-md bg-[#EAB308] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#FACC15]"
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}

