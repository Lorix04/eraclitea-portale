"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={`no-print inline-flex items-center rounded-md border px-3 py-2 text-sm ${className ?? ""}`}
      onClick={() => window.print()}
    >
      <Printer className="mr-2 h-4 w-4" />
      Stampa
    </button>
  );
}
