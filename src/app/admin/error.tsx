"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [currentUrl, setCurrentUrl] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [copied, setCopied] = useState(false);
  const timestamp = useMemo(() => new Date().toISOString(), []);

  useEffect(() => {
    setCurrentUrl(window.location.href);
    setUserAgent(window.navigator.userAgent);
  }, []);

  const detailsText = useMemo(() => {
    return [
      "Errore Rilevato",
      `Timestamp: ${timestamp}`,
      `URL: ${currentUrl || "N/D"}`,
      `User Agent: ${userAgent || "N/D"}`,
      `Messaggio: ${error.message || "N/D"}`,
      "Stack:",
      error.stack || "N/D",
    ].join("\n");
  }, [timestamp, currentUrl, userAgent, error.message, error.stack]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(detailsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-foreground">Errore Rilevato</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Si e verificato un errore. Di seguito i dettagli tecnici.
        </p>

        <details className="mt-6 rounded-xl border border-border bg-muted/30 p-4" open>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            Dettagli Tecnici
          </summary>

          <div className="mt-4 space-y-3 text-sm text-foreground">
            <p>
              <span className="font-semibold">Messaggio:</span> {error.message || "N/D"}
            </p>
            <p>
              <span className="font-semibold">URL:</span> {currentUrl || "N/D"}
            </p>
            <p>
              <span className="font-semibold">Timestamp:</span> {timestamp}
            </p>
            <p>
              <span className="font-semibold">User Agent:</span> {userAgent || "N/D"}
            </p>

            <div className="rounded-lg bg-gray-900 p-4 text-green-400">
              <p className="mb-2 text-xs font-semibold text-green-300">Stack trace</p>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                {error.stack || "Stack non disponibile"}
              </pre>
            </div>
          </div>
        </details>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            Riprova
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Torna alla Dashboard
          </Link>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {copied ? "Copiato" : "Copia Dettagli"}
          </button>
        </div>
      </div>
    </div>
  );
}
