"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
      <div className="text-6xl">:(</div>
      <h2 className="text-xl font-semibold">Qualcosa è andato storto</h2>
      <p className="text-muted-foreground text-center">
        Si è verificato un errore imprevisto. Il nostro team è stato notificato.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Riprova
        </button>
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm"
          onClick={() => Sentry.showReportDialog()}
        >
          Segnala problema
        </button>
      </div>
    </div>
  );
}
