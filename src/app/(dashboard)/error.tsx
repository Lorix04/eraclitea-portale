"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const supportUrl = useMemo(() => {
    const params = new URLSearchParams({
      subject: "Errore applicativo",
      message: `Errore nella pagina ${currentUrl || "/dashboard"}: ${error.message || "Errore imprevisto"}`,
    });
    return `/supporto?${params.toString()}`;
  }, [currentUrl, error.message]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-foreground">Qualcosa e andato storto</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Si e verificato un errore imprevisto. Puoi segnalare il problema al nostro team di supporto.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={supportUrl}
            className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            Segnala Problema
          </Link>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Riprova
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
