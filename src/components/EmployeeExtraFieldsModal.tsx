"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { EmployeeFormRow } from "@/types";

type EmployeeExtraFieldsModalProps = {
  open: boolean;
  onClose: () => void;
  rowData: EmployeeFormRow;
  rowIndex: number;
  onSave: (rowIndex: number, updatedData: Partial<EmployeeFormRow>) => void;
  readOnly?: boolean;
};

type ExtraFieldsState = {
  telefono: string;
  cellulare: string;
  indirizzo: string;
  emailAziendale: string;
  pec: string;
  partitaIva: string;
  iban: string;
  mansione: string;
  note: string;
};

const emptyState: ExtraFieldsState = {
  telefono: "",
  cellulare: "",
  indirizzo: "",
  emailAziendale: "",
  pec: "",
  partitaIva: "",
  iban: "",
  mansione: "",
  note: "",
};

export default function EmployeeExtraFieldsModal({
  open,
  onClose,
  rowData,
  rowIndex,
  onSave,
  readOnly = false,
}: EmployeeExtraFieldsModalProps) {
  const [form, setForm] = useState<ExtraFieldsState>(emptyState);

  useEffect(() => {
    if (!open) return;
    setForm({
      telefono: rowData.telefono ?? "",
      cellulare: rowData.cellulare ?? "",
      indirizzo: rowData.indirizzo ?? "",
      emailAziendale: rowData.emailAziendale ?? "",
      pec: rowData.pec ?? "",
      partitaIva: rowData.partitaIva ?? "",
      iban: rowData.iban ?? "",
      mansione: rowData.mansione ?? "",
      note: rowData.note ?? "",
    });
  }, [open, rowData]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    onSave(rowIndex, form);
  };

  const titleName = `${rowData.nome || "-"} ${rowData.cognome || "-"}`.trim();

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-[71] p-2 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="flex h-[92vh] w-full flex-col rounded-lg bg-card shadow-lg sm:h-auto sm:max-h-[90vh] sm:max-w-2xl"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">
                Dati aggiuntivi - {titleName}
              </h2>
              <p className="text-xs text-muted-foreground">
                {rowData.codiceFiscale || "Codice fiscale non disponibile"}
              </p>
            </div>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              onClick={onClose}
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-5">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Contatti</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span>Telefono</span>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2"
                      value={form.telefono}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, telefono: event.target.value }))
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span>Cellulare</span>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2"
                      value={form.cellulare}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, cellulare: event.target.value }))
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span>Email aziendale</span>
                    <input
                      type="email"
                      placeholder="email.aziendale@azienda.it"
                      className="w-full rounded-md border bg-background px-3 py-2"
                      value={form.emailAziendale}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          emailAziendale: event.target.value,
                        }))
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span>PEC</span>
                    <input
                      type="email"
                      placeholder="nome@pec.it"
                      className="w-full rounded-md border bg-background px-3 py-2"
                      value={form.pec}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, pec: event.target.value }))
                      }
                      disabled={readOnly}
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Residenza</h3>
                <label className="space-y-1 text-sm">
                  <span>Indirizzo</span>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2"
                    value={form.indirizzo}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, indirizzo: event.target.value }))
                    }
                    disabled={readOnly}
                  />
                </label>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Dati fiscali</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span>Partita IVA</span>
                    <input
                      placeholder="01234567890"
                      className="w-full rounded-md border bg-background px-3 py-2"
                      value={form.partitaIva}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          partitaIva: event.target.value,
                        }))
                      }
                      disabled={readOnly}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span>IBAN</span>
                    <input
                      placeholder="IT60X0542811101000000123456"
                      className="w-full rounded-md border bg-background px-3 py-2"
                      value={form.iban}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, iban: event.target.value }))
                      }
                      disabled={readOnly}
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Altro</h3>
                <label className="space-y-1 text-sm">
                  <span>Mansione</span>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2"
                    value={form.mansione}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, mansione: event.target.value }))
                    }
                    disabled={readOnly}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span>Note</span>
                  <textarea
                    className="min-h-[96px] w-full rounded-md border bg-background px-3 py-2"
                    value={form.note}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, note: event.target.value }))
                    }
                    disabled={readOnly}
                  />
                </label>
              </section>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t px-4 py-3">
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm"
              onClick={onClose}
            >
              {readOnly ? "Chiudi" : "Annulla"}
            </button>
            {!readOnly ? (
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                onClick={handleSave}
              >
                Salva
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
