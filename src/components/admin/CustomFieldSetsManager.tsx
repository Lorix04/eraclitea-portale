"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  Crown,
  Eye,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import FieldSetEditorModal from "./FieldSetEditorModal";

type FieldDef = {
  id?: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string | null;
  standardField: string | null;
  columnHeader: string | null;
  sortOrder: number;
};

type FieldSet = {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  fields: FieldDef[];
  _count: { editions: number };
};

interface Props {
  clientId: string;
  canEdit: boolean;
}

export default function CustomFieldSetsManager({ clientId, canEdit }: Props) {
  const { confirm } = useConfirmDialog();
  const [enabled, setEnabled] = useState(false);
  const [sets, setSets] = useState<FieldSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<FieldSet | null>(null);
  const [previewSet, setPreviewSet] = useState<FieldSet | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfRes, setsRes] = await Promise.all([
        fetch(`/api/custom-fields?clientId=${clientId}`),
        fetch(`/api/admin/clienti/${clientId}/custom-field-sets`),
      ]);
      const cfJson = cfRes.ok ? await cfRes.json() : { enabled: false };
      const setsJson = setsRes.ok ? await setsRes.json() : { data: [] };
      setEnabled(cfJson.enabled ?? false);
      setSets(setsJson.data ?? []);
    } catch {
      toast.error("Errore caricamento template");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async () => {
    const next = !enabled;
    const ok = await confirm({
      title: next ? "Attiva campi personalizzati" : "Disattiva campi personalizzati",
      message: next
        ? "Le colonne personalizzate appariranno nelle anagrafiche per questo cliente."
        : "Le colonne personalizzate saranno nascoste. I template non verranno eliminati.",
      confirmText: next ? "Attiva" : "Disattiva",
    });
    if (!ok) return;

    setToggling(true);
    const res = await fetch(
      `/api/admin/clienti/${clientId}/custom-fields/toggle`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      }
    );
    setToggling(false);
    if (res.ok) {
      setEnabled(next);
      toast.success(next ? "Campi personalizzati attivati" : "Campi personalizzati disattivati");
    } else {
      toast.error("Errore");
    }
  };

  const handleSetDefault = async (setId: string) => {
    const res = await fetch(
      `/api/admin/clienti/${clientId}/custom-field-sets/${setId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      }
    );
    if (res.ok) {
      toast.success("Template predefinito aggiornato");
      loadData();
    } else {
      toast.error("Errore");
    }
  };

  const handleDuplicate = async (set: FieldSet) => {
    const res = await fetch(
      `/api/admin/clienti/${clientId}/custom-field-sets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${set.name} (copia)`,
          isDefault: false,
          fields: set.fields.map((f) => ({
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            options: f.options,
            standardField: f.standardField,
            columnHeader: f.columnHeader,
          })),
        }),
      }
    );
    if (res.ok) {
      toast.success("Template duplicato");
      loadData();
    } else {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error || "Errore duplicazione");
    }
  };

  const handleDelete = async (set: FieldSet) => {
    if (set._count.editions > 0) {
      await confirm({
        title: "Impossibile eliminare",
        message: `Il template "${set.name}" e usato da ${set._count.editions} edizioni. Riassegna le edizioni a un altro template prima di eliminare.`,
        confirmText: "OK",
      });
      return;
    }
    const ok = await confirm({
      title: "Elimina template",
      message: `Eliminare il template "${set.name}"? Questa azione non puo essere annullata.`,
      confirmText: "Elimina",
      variant: "danger",
    });
    if (!ok) return;

    const res = await fetch(
      `/api/admin/clienti/${clientId}/custom-field-sets/${set.id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast.success("Template eliminato");
      loadData();
    } else {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error || "Errore eliminazione");
    }
  };

  const handleSaveSet = async (data: {
    name: string;
    isDefault: boolean;
    fields: Array<{
      id?: string;
      name: string;
      label: string;
      type: string;
      required: boolean;
      options: string | null;
      standardField: string | null;
      columnHeader: string | null;
    }>;
  }) => {
    const url = editingSet
      ? `/api/admin/clienti/${clientId}/custom-field-sets/${editingSet.id}`
      : `/api/admin/clienti/${clientId}/custom-field-sets`;
    const method = editingSet ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success(editingSet ? "Template aggiornato" : "Template creato");
      setEditorOpen(false);
      setEditingSet(null);
      loadData();
      return true;
    }
    const json = await res.json().catch(() => ({}));
    toast.error(json.error || "Errore salvataggio");
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Caricamento...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileSpreadsheet className="h-4 w-4" />
            Template Anagrafiche
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Gestisci i set di colonne personalizzate per le anagrafiche.
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              enabled
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {toggling ? (
              <Loader2 className="inline h-3 w-3 animate-spin" />
            ) : enabled ? (
              "Attivo"
            ) : (
              "Disattivato"
            )}
          </button>
        ) : null}
      </div>

      {enabled ? (
        <>
          {canEdit ? (
            <button
              type="button"
              onClick={() => {
                setEditingSet(null);
                setEditorOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuovo template
            </button>
          ) : null}

          {sets.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nessun template configurato. Crea il primo template per personalizzare le colonne delle anagrafiche.
            </p>
          ) : (
            <div className="space-y-3">
              {sets.map((set) => (
                <div
                  key={set.id}
                  className="rounded-lg border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {set.name}
                        {set.isDefault ? (
                          <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            <Crown className="h-2.5 w-2.5" /> Predefinito
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {set.fields.length} campi
                        {" | "}
                        {set._count.editions} edizioni
                        {" | "}
                        Creato: {new Date(set.createdAt).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                  </div>

                  {set.fields.length > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Campi:{" "}
                      {set.fields
                        .slice(0, 5)
                        .map((f) => f.label)
                        .join(", ")}
                      {set.fields.length > 5
                        ? ` +${set.fields.length - 5} altri`
                        : ""}
                    </p>
                  ) : null}

                  {canEdit ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSet(set);
                          setEditorOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted"
                      >
                        <Pencil className="h-3 w-3" /> Modifica
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(set)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted"
                      >
                        <Copy className="h-3 w-3" /> Duplica
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewSet(set)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted"
                      >
                        <Eye className="h-3 w-3" /> Anteprima
                      </button>
                      {!set.isDefault ? (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(set.id)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50"
                        >
                          <Crown className="h-3 w-3" /> Imposta predefinito
                        </button>
                      ) : null}
                      {!set.isDefault || sets.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(set)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" /> Elimina
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* Preview modal */}
          {previewSet ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-2xl rounded-lg bg-card p-6 shadow-lg">
                <h3 className="text-sm font-semibold">
                  Anteprima — {previewSet.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Lo SpreadsheetEditor mostrera queste colonne:
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {previewSet.fields.map((f) => (
                          <th
                            key={f.name}
                            className="px-3 py-2 text-left font-medium"
                          >
                            {f.columnHeader || f.label}
                            {f.required ? " *" : ""}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-left font-medium">
                          Altro
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1].map((i) => (
                        <tr key={i} className="border-b">
                          {previewSet.fields.map((f) => (
                            <td
                              key={f.name}
                              className="px-3 py-2 text-muted-foreground"
                            >
                              —
                            </td>
                          ))}
                          <td className="px-3 py-2 text-muted-foreground">
                            —
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  * = campo obbligatorio
                </p>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPreviewSet(null)}
                    className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          I campi personalizzati sono disattivati. Attivali per gestire i
          template.
        </p>
      )}

      {editorOpen ? (
        <FieldSetEditorModal
          existingSet={editingSet}
          otherSets={sets.filter((s) => s.id !== editingSet?.id)}
          onSave={handleSaveSet}
          onClose={() => {
            setEditorOpen(false);
            setEditingSet(null);
          }}
        />
      ) : null}
    </div>
  );
}
