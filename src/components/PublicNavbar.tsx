"use client";

import Image from "next/image";
import Link from "next/link";
import { HelpCircle, LogIn } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type PublicNavbarProps = {
  currentPath: "/" | "/come-funziona";
  onHoverChange?: (value: boolean) => void;
  className?: string;
};

export default function PublicNavbar({
  currentPath,
  onHoverChange,
  className,
}: PublicNavbarProps) {
  const isHowItWorks = currentPath === "/come-funziona";

  return (
    <header className={cn("fixed left-0 right-0 top-[2px] z-50 transition-all duration-300", className)}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:py-5">
        <Link href="/" className="flex items-center" aria-label="Torna alla home">
          <Image
            src="/icons/apple-touch-icon.png"
            alt="Sapienta"
            width={32}
            height={32}
            className="h-8 w-8"
            priority
          />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-6">
          <Link
            href="/come-funziona"
            className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/10 sm:hidden"
            aria-label="Come funziona"
          >
            <HelpCircle className="h-5 w-5" />
          </Link>

          <ThemeToggle />

          <Link
            href="/come-funziona"
            className={cn(
              "hidden items-center gap-2 text-sm font-medium transition-colors sm:inline-flex",
              isHowItWorks
                ? "text-[#EAB308]"
                : "text-gray-600 hover:text-[#EAB308] dark:text-white/70"
            )}
            onMouseEnter={() => onHoverChange?.(true)}
            onMouseLeave={() => onHoverChange?.(false)}
          >
            <HelpCircle className="h-4 w-4" />
            Come Funziona
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 sm:hidden"
          >
            <LogIn className="h-4 w-4" />
            Accedi
          </Link>

          <Link
            href="/login"
            className="hidden rounded-lg bg-[#EAB308] px-5 py-2 text-sm font-semibold text-black shadow-[0_8px_25px_rgba(234,179,8,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#FACC15] sm:inline-flex"
            onMouseEnter={() => onHoverChange?.(true)}
            onMouseLeave={() => onHoverChange?.(false)}
          >
            Area Clienti
          </Link>
        </div>
      </div>
    </header>
  );
}
