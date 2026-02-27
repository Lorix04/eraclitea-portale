"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const enterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shouldHideOnPath = useMemo(() => {
    if (!pathname) return false;
    return isPortalRoute(pathname) || pathname.startsWith("/api/");
  }, [pathname]);

  useEffect(() => {
    if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);

    if (shouldHideOnPath) {
      setIsVisible(false);
      setIsRendered(false);
      return;
    }

    const consent = readCookie(CONSENT_COOKIE_KEY);
    if (consent === "accepted" || consent === "rejected") {
      setIsVisible(false);
      setIsRendered(false);
      return;
    }

    setIsRendered(true);
    enterTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    return () => {
      if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, [shouldHideOnPath]);

  const handleChoice = (value: "accepted" | "rejected") => {
    writeCookie(CONSENT_COOKIE_KEY, value);
    setIsVisible(false);
    exitTimeoutRef.current = setTimeout(() => {
      setIsRendered(false);
    }, 500);
  };

  if (!isRendered || shouldHideOnPath) return null;

  return (
    <div className="fixed inset-x-0 bottom-3 z-[110] px-3 sm:bottom-4 sm:px-4">
      <div
        className={`mx-auto w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl transition-all duration-500 ease-out dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/50 sm:p-6 ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
      >
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <span className="text-2xl leading-none">🍪</span>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
              Utilizziamo i Cookie
            </h3>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-200">
            Questo sito utilizza cookie tecnici necessari al funzionamento del portale.
          </p>

          <div className="text-sm">
            <Link
              href="/cookie-policy"
              className="font-medium text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
            >
              Cookie Policy
            </Link>{" "}
            <span className="text-gray-400 dark:text-gray-500">·</span>{" "}
            <Link
              href="/privacy-policy"
              className="font-medium text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
            >
              Privacy Policy
            </Link>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => handleChoice("rejected")}
              className="w-full rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
            >
              Rifiuta
            </button>
            <button
              type="button"
              onClick={() => handleChoice("accepted")}
              className="w-full rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 sm:w-auto"
            >
              Accetta tutti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
