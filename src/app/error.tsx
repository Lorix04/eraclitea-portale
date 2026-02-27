"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-8">
            <h1 className="text-2xl font-semibold">Qualcosa e andato storto</h1>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 sm:text-base">
              Si e verificato un errore imprevisto. Riprova oppure torna alla home page.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={reset}
                className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
              >
                Riprova
              </button>
              <Link
                href="/"
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Torna alla Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
