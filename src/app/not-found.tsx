import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-8">
        <h1 className="text-3xl font-bold">Pagina non trovata</h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 sm:text-base">
          La pagina che stai cercando non esiste o e stata spostata.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
        >
          Torna alla Home
        </Link>
      </div>
    </div>
  );
}
