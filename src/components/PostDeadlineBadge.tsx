"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { formatItalianDate, formatItalianDateTime } from "@/lib/date-utils";

export type PostDeadlineEditItem = {
  id?: string;
  editedAt: string | Date;
  userRole?: string | null;
  source?: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  spreadsheet: "Foglio anagrafiche",
  import: "Import file",
  submit: "Invio anagrafiche",
  "add-modal": "Aggiunta dipendente",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  CLIENT: "Cliente",
  TEACHER: "Docente",
};

/**
 * Badge persistente "Modificata dopo la scadenza" (visibile se esiste ≥1
 * modifica post-deadline) + pop-up con la deadline e lo storico cronologico
 * (più recente in alto). Usato sia lato admin sia lato cliente.
 */
export default function PostDeadlineBadge({
  deadline,
  edits,
}: {
  deadline?: string | Date | null;
  edits: PostDeadlineEditItem[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!edits || edits.length === 0) return null;

  const sorted = [...edits].sort(
    (a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime()
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
        title="Mostra le modifiche effettuate dopo la scadenza"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Modificata dopo la scadenza
        <span className="rounded-full bg-amber-200 px-1.5 text-[10px] font-semibold text-amber-800">
          {sorted.length}
        </span>
      </button>

      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 bg-black/40 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
              <div className="modal-panel bg-card shadow-lg sm:max-w-md">
                <div className="modal-header flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Modifiche dopo la scadenza
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                    aria-label="Chiudi"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="modal-body modal-scroll space-y-4">
                  {deadline ? (
                    <p className="text-sm text-muted-foreground">
                      Deadline anagrafiche:{" "}
                      <span className="font-medium text-foreground">
                        {formatItalianDate(deadline)}
                      </span>
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    {sorted.length} modific{sorted.length === 1 ? "a" : "he"}{" "}
                    registrat{sorted.length === 1 ? "a" : "e"} dopo la scadenza:
                  </p>
                  <ul className="space-y-2">
                    {sorted.map((edit, index) => {
                      const role = edit.userRole
                        ? ROLE_LABELS[edit.userRole] ?? edit.userRole
                        : null;
                      const source = edit.source
                        ? SOURCE_LABELS[edit.source] ?? edit.source
                        : null;
                      const details = [role, source]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <li
                          key={edit.id ?? index}
                          className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-foreground">
                            {formatItalianDateTime(edit.editedAt)}
                          </span>
                          {details ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {details}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="modal-footer flex justify-end">
                  <button
                    type="button"
                    className="rounded-md border px-4 py-2 text-sm"
                    onClick={() => setOpen(false)}
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
