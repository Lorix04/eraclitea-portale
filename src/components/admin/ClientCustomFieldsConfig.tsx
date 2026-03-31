"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  FileSpreadsheet,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import CustomFieldModal from "./CustomFieldModal";
import { STANDARD_FIELD_MAP } from "@/lib/standard-fields";

type CustomField = {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string | null;
  options: string | null;
  defaultValue: string | null;
  sortOrder: number;
  isActive: boolean;
  columnHeader: string | null;
  standardField: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  text: "Testo",
  number: "Numero",
  date: "Data",
  select: "Selezione",
  email: "Email",
};

interface ClientCustomFieldsConfigProps {
  clientId: string;
  canEdit: boolean;
}

export default function ClientCustomFieldsConfig({
  clientId,
  canEdit,
}: ClientCustomFieldsConfigProps) {
  const { confirm: confirmDialog } = useConfirmDialog();
  const [enabled, setEnabled] = useState(false);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editField, setEditField] = useState<CustomField | null>(null);

  // Import from template state
  type FieldPreview = {
    header: string;
    standardField: string | null;
    standardLabel: string | null;
    status: string;
  };
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    fields: FieldPreview[];
    alreadyExists: string[];
    ignored: string[];
  } | null>(null);
  const [importSelected, setImportSelected] = useState<Set<number>>(new Set());

  const fetchFields = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clienti/${clientId}/custom-fields`);
      if (!res.ok) return;
      const data = await res.json();
      setEnabled(data.enabled);
      setFields(data.fields);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleToggle = async () => {
    const next = !enabled;
    const ok = await confirmDialog({
      title: next ? "Attiva campi personalizzati" : "Disattiva campi personalizzati",
      message: next
        ? "Attivando i campi personalizzati, le colonne aggiuntive appariranno nelle anagrafiche, nell'import e nell'export per questo cliente."
        : "Disattivando i campi personalizzati, le colonne aggiuntive verranno nascoste dalle anagrafiche. I dati gia inseriti non verranno eliminati.",
      confirmText: next ? "Attiva" : "Disattiva",
      variant: next ? "default" : "danger",
    });
    if (!ok) return;
    setEnabled(next);
    try {
      const res = await fetch(
        `/api/admin/clienti/${clientId}/custom-fields/toggle`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: next }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(next ? "Campi personalizzati attivati" : "Campi personalizzati disattivati");
    } catch {
      setEnabled(!next);
      toast.error("Errore");
    }
  };

  const handleDelete = async (field: CustomField) => {
    const ok = await confirmDialog({
      title: "Elimina campo",
      message: `Eliminare il campo "${field.label}"? I dati gia inseriti per questo campo non verranno rimossi.`,
      confirmText: "Elimina",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(
        `/api/admin/clienti/${clientId}/custom-fields/${field.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      toast.success("Campo eliminato");
      fetchFields();
    } catch {
      toast.error("Errore durante l'eliminazione");
    }
  };

  const handleImportFile = async (file: File) => {
    setImportLoading(true);
    setImportPreview(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/admin/clienti/${clientId}/custom-fields/import-from-template`,
        { method: "POST", body: fd }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Errore");
      }
      const data = await res.json();
      setImportPreview(data);
      // Select all by default
      setImportSelected(new Set(data.fields.map((_: any, i: number) => i)));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!importPreview || importSelected.size === 0) return;
    setImportLoading(true);
    try {
      const items = importPreview.fields
        .filter((_: any, i: number) => importSelected.has(i))
        .map((f: FieldPreview) => ({ header: f.header, standardField: f.standardField }));
      const fd = new FormData();
      fd.append("confirm", "true");
      fd.append("selected", JSON.stringify(items));
      const res = await fetch(
        `/api/admin/clienti/${clientId}/custom-fields/import-from-template`,
        { method: "POST", body: fd }
      );
      if (!res.ok) throw new Error("Errore");
      const data = await res.json();
      toast.success(`${data.created} camp${data.created === 1 ? "o" : "i"} creat${data.created === 1 ? "o" : "i"} dal template`);
      setImportOpen(false);
      setImportPreview(null);
      setEnabled(true);
      fetchFields();
    } catch {
      toast.error("Errore durante la creazione dei campi");
    } finally {
      setImportLoading(false);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= fields.length) return;

    const reordered = [...fields];
    [reordered[index], reordered[swapIdx]] = [reordered[swapIdx], reordered[index]];
    setFields(reordered);

    try {
      await fetch(`/api/admin/clienti/${clientId}/custom-fields/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((f) => f.id) }),
      });
    } catch {
      fetchFields();
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            Campi Personalizzati Anagrafiche
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Campi aggiuntivi per le anagrafiche dei dipendenti di questo cliente.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
              enabled ? "bg-emerald-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        )}
      </div>

      {enabled && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {fields.length} camp{fields.length === 1 ? "o" : "i"} configurat{fields.length === 1 ? "o" : "i"}
            </p>
            {canEdit && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportOpen(true);
                    setImportPreview(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Importa da template
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditField(null);
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Aggiungi campo
                </button>
              </div>
            )}
          </div>

          {fields.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nessun campo personalizzato configurato.
              {canEdit && " Clicca \"Aggiungi campo\" per iniziare."}
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{field.label}</p>
                      {field.standardField && (
                        <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                          {STANDARD_FIELD_MAP.get(field.standardField)?.label || field.standardField}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {field.standardField ? "Standard" : TYPE_LABELS[field.type] || field.type}
                      {field.required ? " · Obbligatorio" : " · Opzionale"}
                      {field.options && (
                        <>
                          {" · Opzioni: "}
                          {field.options
                            .split("|")
                            .slice(0, 3)
                            .map((o) => o.trim())
                            .join(", ")}
                          {field.options.split("|").length > 3 && "..."}
                        </>
                      )}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, "up")}
                        className="rounded p-1 hover:bg-muted disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === fields.length - 1}
                        onClick={() => handleMove(idx, "down")}
                        className="rounded p-1 hover:bg-muted disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditField(field);
                          setModalOpen(true);
                        }}
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(field)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <CustomFieldModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditField(null);
        }}
        clientId={clientId}
        field={editField}
        onSaved={fetchFields}
        existingStandardFields={fields.filter(f => f.standardField).map(f => f.standardField!)}
      />

      {/* Import from template modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setImportOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-end p-0 sm:items-center sm:justify-center sm:p-4">
            <div
              className="modal-panel w-full border bg-card shadow-xl sm:max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-amber-500" />
                  Importa campi da template
                </h2>
                <button type="button" onClick={() => setImportOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="modal-body space-y-4">
                {!importPreview ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Carica un file Excel o CSV usato come template per le anagrafiche.
                      Le colonne non standard verranno proposte come campi personalizzati.
                    </p>
                    <label className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer hover:border-amber-300 hover:bg-amber-50/50 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {importLoading ? "Analisi in corso..." : "Clicca o trascina il file qui"}
                      </span>
                      <span className="text-xs text-muted-foreground">.xlsx, .xls, .csv</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImportFile(f);
                        }}
                      />
                      {importLoading && <Loader2 className="h-5 w-5 animate-spin text-amber-500" />}
                    </label>
                  </>
                ) : (
                  <>
                    <p className="text-sm">
                      File: <span className="font-medium">{importPreview.fileName}</span>
                    </p>

                    {importPreview.alreadyExists.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Gia configurati ({importPreview.alreadyExists.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {importPreview.alreadyExists.map((h) => (
                            <span key={h} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {importPreview.fields.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-amber-700">
                            Campi da creare ({importSelected.size}/{importPreview.fields.length})
                          </p>
                          <button
                            type="button"
                            className="text-xs text-amber-600 hover:underline"
                            onClick={() =>
                              setImportSelected((prev) =>
                                prev.size === importPreview.fields.length
                                  ? new Set()
                                  : new Set(importPreview.fields.map((_: any, i: number) => i))
                              )
                            }
                          >
                            {importSelected.size === importPreview.fields.length
                              ? "Deseleziona tutti"
                              : "Seleziona tutti"}
                          </button>
                        </div>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {importPreview.fields.map((f: FieldPreview, i: number) => (
                            <label
                              key={i}
                              className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50"
                            >
                              <input
                                type="checkbox"
                                checked={importSelected.has(i)}
                                onChange={() =>
                                  setImportSelected((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(i)) next.delete(i);
                                    else next.add(i);
                                    return next;
                                  })
                                }
                                className="rounded"
                              />
                              <span className="text-sm font-medium">{f.header}</span>
                              <span className="ml-auto text-xs">
                                {f.standardField ? (
                                  <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-green-700">
                                    {f.standardLabel}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Personalizzato</span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                        Nessuna colonna nuova trovata. Tutte le colonne sono gia configurate.
                      </div>
                    )}

                    {importPreview.ignored.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {importPreview.ignored.length} colonn{importPreview.ignored.length === 1 ? "a" : "e"} ignorat{importPreview.ignored.length === 1 ? "a" : "e"}: {importPreview.ignored.join(", ")}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="modal-footer flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setImportOpen(false);
                    setImportPreview(null);
                  }}
                  className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-muted"
                >
                  {importPreview ? "Annulla" : "Chiudi"}
                </button>
                {importPreview && importPreview.fields.length > 0 && (
                  <button
                    type="button"
                    onClick={handleImportConfirm}
                    disabled={importLoading || importSelected.size === 0}
                    className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {importLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      `Crea ${importSelected.size} camp${importSelected.size === 1 ? "o" : "i"}`
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
