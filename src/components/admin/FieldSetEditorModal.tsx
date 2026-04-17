"use client";

import { useRef, useState } from "react";
import { GripVertical, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { STANDARD_EMPLOYEE_FIELDS, detectStandardField } from "@/lib/standard-fields";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type FieldEntry = {
  id?: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string | null;
  standardField: string | null;
  columnHeader: string | null;
};

type ExistingSet = {
  id: string;
  name: string;
  isDefault: boolean;
  fields: FieldEntry[];
};

interface Props {
  existingSet: ExistingSet | null;
  otherSets: Array<{ id: string; name: string; fields: FieldEntry[] }>;
  onSave: (data: {
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
  }) => Promise<boolean>;
  onClose: () => void;
}

const TYPE_OPTIONS = [
  { value: "text", label: "Testo" },
  { value: "number", label: "Numero" },
  { value: "date", label: "Data" },
  { value: "select", label: "Selezione" },
  { value: "email", label: "Email" },
];

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .substring(0, 50);
}

export default function FieldSetEditorModal({
  existingSet,
  otherSets,
  onSave,
  onClose,
}: Props) {
  const [name, setName] = useState(existingSet?.name ?? "");
  const [isDefault, setIsDefault] = useState(existingSet?.isDefault ?? false);
  const [fields, setFields] = useState<FieldEntry[]>(
    existingSet?.fields?.length
      ? existingSet.fields.map((f) => ({ ...f }))
      : [{ name: "", label: "", type: "text", required: false, options: null, standardField: null, columnHeader: null }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const { confirm } = useConfirmDialog();
  const [showStdPicker, setShowStdPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [analyzedColumns, setAnalyzedColumns] = useState<
    Array<{
      header: string;
      isStandard: boolean;
      isIgnored: boolean;
      selected: boolean;
      detectedType: string;
      detectedOptions: string[];
      matchedStdKey: string | null;
    }>
  >([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ index: number; position: "before" | "after" } | null>(null);

  const STANDARD_LABELS = new Set(
    STANDARD_EMPLOYEE_FIELDS.flatMap((f) => [
      f.key.toLowerCase(),
      f.label.toLowerCase(),
    ])
  );
  const IGNORED_HEADERS = new Set([
    "id", "n.", "n", "#", "riga", "row", "numero", "progressivo",
  ]);

  function detectType(
    header: string,
    samples: string[]
  ): { type: string; options: string[] } {
    const h = header.toLowerCase();
    if (/data|date|scadenza|nascita|inizio|fine/.test(h))
      return { type: "date", options: [] };
    if (/numero|qty|quantit|ore|importo|prezzo|costo/.test(h))
      return { type: "number", options: [] };

    const nonEmpty = samples.filter((v) => v?.trim());
    if (nonEmpty.length > 0 && nonEmpty.every((v) => !isNaN(Number(v))))
      return { type: "number", options: [] };

    const dateRe =
      /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$|^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/;
    if (nonEmpty.length > 0 && nonEmpty.every((v) => dateRe.test(v.trim())))
      return { type: "date", options: [] };

    const uniq = [...new Set(nonEmpty)];
    if (nonEmpty.length >= 5 && uniq.length <= 6)
      return { type: "select", options: uniq.sort() };

    return { type: "text", options: [] };
  }

  async function handleFileDrop(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File troppo grande (max 5MB)");
      return;
    }

    setParsingFile(true);
    try {
      const XLSX = (await import("xlsx")).default ?? (await import("xlsx"));
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      if (rows.length < 1) {
        toast.error("Il file non contiene dati");
        return;
      }

      const headers = (rows[0] || [])
        .map((h: any) => String(h ?? "").trim())
        .filter(Boolean);
      const sampleRows = rows.slice(1, 11);

      const analyzed = headers.map((header) => {
        const norm = header.toLowerCase().replace(/[_\-\.]/g, " ").trim();
        const matchedStd = detectStandardField(header);
        const isStandard = !!matchedStd || STANDARD_LABELS.has(norm);
        const isIgnored = IGNORED_HEADERS.has(norm);
        const samples = sampleRows.map((r) => {
          const idx = headers.indexOf(header);
          return String(r[idx] ?? "");
        });
        const { type, options } = isStandard && matchedStd
          ? { type: matchedStd.type, options: [] as string[] }
          : detectType(header, samples);

        return {
          header,
          isStandard,
          isIgnored,
          selected: !isIgnored,
          detectedType: type,
          detectedOptions: options,
          matchedStdKey: matchedStd?.key ?? null,
        };
      });

      setAnalyzedColumns(analyzed);

      // Suggest template name from file name
      if (!name) {
        const suggested = file.name
          .replace(/\.(csv|xlsx|xls)$/i, "")
          .replace(/[_\-\.]+/g, " ")
          .replace(/template/i, "")
          .trim()
          .split(" ")
          .filter((w) => w.length > 0)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        if (suggested) setName(suggested);
      }
    } catch {
      toast.error("Errore nella lettura del file");
    } finally {
      setParsingFile(false);
    }
  }

  function applySelectedColumns() {
    const selected = analyzedColumns.filter((c) => c.selected && !c.isIgnored);

    // Build new fields — standard with standardField, custom without
    // For standard fields from file import, keep the original header as label
    const newFields: FieldEntry[] = selected.map((col) => {
      if (col.isStandard && col.matchedStdKey) {
        const sf = STANDARD_EMPLOYEE_FIELDS.find((s) => s.key === col.matchedStdKey);
        return {
          name: col.matchedStdKey,
          label: col.header,
          type: sf?.type ?? col.detectedType,
          required: false,
          options: col.matchedStdKey === "sesso" ? "M|F" : null,
          standardField: col.matchedStdKey,
          columnHeader: col.header,
        };
      }
      return {
        name: slugify(col.header),
        label: col.header,
        type: col.detectedType,
        required: false,
        options: col.detectedType === "select" ? col.detectedOptions.join("|") : null,
        standardField: null,
        columnHeader: null,
      };
    });

    // Deduplicate: skip standard fields already in the form
    const existingStdKeys = new Set(
      fields.filter((f) => f.standardField).map((f) => f.standardField)
    );
    const deduped = newFields.filter((f) =>
      f.standardField ? !existingStdKeys.has(f.standardField) : true
    );

    setFields((prev) => [...prev.filter((f) => f.label.trim()), ...deduped]);
    setAnalyzedColumns([]);
    if (deduped.length < newFields.length) {
      toast.success(`${deduped.length} campi aggiunti (${newFields.length - deduped.length} standard gia presenti)`);
    } else {
      toast.success(`${deduped.length} campi aggiunti`);
    }
  }

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { name: "", label: "", type: "text", required: false, options: null, standardField: null, columnHeader: null },
    ]);
  };

  const addStandardField = (sf: typeof STANDARD_EMPLOYEE_FIELDS[0]) => {
    setFields((prev) => [
      ...prev,
      {
        name: sf.key,
        label: sf.label,
        type: sf.type,
        required: false,
        options: sf.key === "sesso" ? "M|F" : null,
        standardField: sf.key,
        columnHeader: null,
      },
    ]);
    setShowStdPicker(false);
  };

  const removeField = async (index: number) => {
    const field = fields[index];
    if (field.standardField === "codiceFiscale") {
      const ok = await confirm({
        title: "Rimuovi Codice Fiscale",
        message: "Il Codice Fiscale e importante per l'identificazione dei dipendenti. Sei sicuro di voler rimuovere questa colonna dal template?",
        confirmText: "Rimuovi comunque",
        variant: "danger",
      });
      if (!ok) return;
    }
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof FieldEntry, value: any) => {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const updated = { ...f, [key]: value };
        // Auto-slugify name from label for new custom fields only
        // Standard fields keep their key as name (e.g. "email", "codiceFiscale")
        if (key === "label" && !f.id && !f.standardField) {
          updated.name = slugify(value as string);
        }
        return updated;
      })
    );
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= fields.length) return;
    setFields((prev) => {
      const copy = [...prev];
      [copy[index], copy[newIdx]] = [copy[newIdx], copy[index]];
      return copy;
    });
  };

  // --- Drag & drop reorder ---
  const resetDrag = () => { setDraggedIdx(null); setDropIndicator(null); };

  const handleFieldDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleFieldDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position: "before" | "after" = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    if (!dropIndicator || dropIndicator.index !== index || dropIndicator.position !== position) {
      setDropIndicator({ index, position });
    }
  };

  const handleFieldDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIdx === null || !dropIndicator) { resetDrag(); return; }
    let targetIdx = dropIndicator.position === "before" ? dropIndicator.index : dropIndicator.index + 1;
    if (draggedIdx < targetIdx) targetIdx--;
    if (targetIdx === draggedIdx) { resetDrag(); return; }
    setFields((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedIdx, 1);
      copy.splice(targetIdx, 0, moved);
      return copy;
    });
    resetDrag();
  };

  const importFromSet = (setId: string) => {
    const source = otherSets.find((s) => s.id === setId);
    if (!source) return;
    setFields(
      source.fields.map((f) => ({
        name: f.name,
        label: f.label,
        type: f.type,
        required: f.required,
        options: f.options,
        standardField: f.standardField,
        columnHeader: f.columnHeader,
      }))
    );
  };

  const handleSave = async () => {
    setError("");
    setNameError("");
    if (!name.trim()) {
      setNameError("Nome template richiesto");
      return;
    }
    if (otherSets.some((s) => s.name.toLowerCase().trim() === name.trim().toLowerCase())) {
      setNameError("Esiste gia un template con questo nome");
      return;
    }
    const validFields = fields.filter((f) => f.label.trim());
    if (validFields.length === 0) {
      setError("Almeno un campo con nome richiesto");
      return;
    }

    setSaving(true);
    const success = await onSave({
      name: name.trim(),
      isDefault,
      fields: validFields.map((f, i) => ({
        id: f.id,
        name: f.name || slugify(f.label),
        label: f.label.trim(),
        type: f.type,
        required: f.required,
        options: f.type === "select" ? f.options : null,
        standardField: f.standardField || null,
        columnHeader: f.columnHeader || null,
      })),
    });
    setSaving(false);
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
        <h3 className="text-base font-semibold">
          {existingSet ? "Modifica template" : "Nuovo template"}
        </h3>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">
              Nome template <span className="text-red-400">*</span>
            </label>
            <input
              className={`mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm ${nameError ? "border-red-500" : ""}`}
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(""); }}
              onBlur={() => {
                const trimmed = name.trim().toLowerCase();
                if (trimmed && otherSets.some((s) => s.name.toLowerCase().trim() === trimmed)) {
                  setNameError("Esiste gia un template con questo nome");
                }
              }}
              placeholder="Es: Template Sicurezza"
            />
            {nameError ? <p className="mt-1 text-xs text-red-500">{nameError}</p> : null}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Imposta come predefinito
          </label>

          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : null}

          <div>
            <p className="text-sm font-medium">Campi</p>
            <div className="mt-2">
              {fields.map((field, i) => (
                <div key={i}>
                  {/* Drop indicator line — before this row */}
                  <div className="relative h-0 overflow-visible">
                    <div className={`absolute inset-x-0 -top-px h-0.5 rounded-full bg-primary transition-opacity duration-150 ${
                      dropIndicator?.index === i && dropIndicator?.position === "before" && draggedIdx !== null && draggedIdx !== i
                        ? "opacity-100 shadow-sm shadow-primary/30"
                        : "opacity-0"
                    }`} />
                  </div>

                  <div
                    draggable
                    onDragStart={handleFieldDragStart(i)}
                    onDragOver={handleFieldDragOver(i)}
                    onDragLeave={() => setDropIndicator(null)}
                    onDrop={handleFieldDrop}
                    onDragEnd={resetDrag}
                    className={`flex items-start gap-2 rounded-md border p-2 my-1 transition-all duration-200 select-none ${
                      draggedIdx === i
                        ? "opacity-30 scale-[0.97] bg-muted"
                        : "bg-background"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5 pt-1">
                      <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground" />
                      <div className="flex flex-col gap-0">
                        <button
                          type="button"
                          onClick={() => moveField(i, -1)}
                          disabled={i === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Sposta su"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8L6 4L10 8"/></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(i, 1)}
                          disabled={i === fields.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Sposta giu"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4L6 8L10 4"/></svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex gap-2 items-center">
                        {field.standardField ? (
                          <>
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Std</span>
                            <input
                              className="flex-1 rounded border bg-background px-2 py-1 text-xs"
                              placeholder="Nome campo"
                              value={field.label}
                              onChange={(e) =>
                                updateField(i, "label", e.target.value)
                              }
                            />
                            <span className="text-[10px] text-muted-foreground">{TYPE_OPTIONS.find((o) => o.value === field.type)?.label ?? field.type}</span>
                          </>
                        ) : (
                          <>
                            <input
                              className="flex-1 rounded border bg-background px-2 py-1 text-xs"
                              placeholder="Nome campo"
                              value={field.label}
                              onChange={(e) =>
                                updateField(i, "label", e.target.value)
                              }
                            />
                            <select
                              className="rounded border bg-background px-2 py-1 text-xs"
                              value={field.type}
                              onChange={(e) =>
                                updateField(i, "type", e.target.value)
                              }
                            >
                              {TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              updateField(i, "required", e.target.checked)
                            }
                          />
                          Obbl.
                        </label>
                      </div>
                      {field.type === "select" ? (
                        <input
                          className="w-full rounded border bg-background px-2 py-1 text-xs"
                          placeholder="Opzioni separate da |  (es: Junior|Senior|Lead)"
                          value={field.options ?? ""}
                          onChange={(e) =>
                            updateField(i, "options", e.target.value)
                          }
                        />
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeField(i)}
                      className="mt-1 rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Drop indicator line — after this row */}
                  <div className="relative h-0 overflow-visible">
                    <div className={`absolute inset-x-0 -top-px h-0.5 rounded-full bg-primary transition-opacity duration-150 ${
                      dropIndicator?.index === i && dropIndicator?.position === "after" && draggedIdx !== null && draggedIdx !== i
                        ? "opacity-100 shadow-sm shadow-primary/30"
                        : "opacity-0"
                    }`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addField}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Aggiungi campo
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStdPicker(!showStdPicker)}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <Plus className="h-3 w-3" /> Campo standard
                </button>
                {showStdPicker ? (
                  <div className="absolute left-0 z-20 mt-1 w-56 rounded-md border bg-card shadow-lg max-h-48 overflow-y-auto">
                    {STANDARD_EMPLOYEE_FIELDS
                      .filter((sf) => !fields.some((f) => f.standardField === sf.key))
                      .map((sf) => (
                        <button
                          key={sf.key}
                          type="button"
                          onClick={() => addStandardField(sf)}
                          className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted"
                        >
                          {sf.label}
                          {sf.key === "codiceFiscale" ? (
                            <span className="ml-1 text-[10px] text-amber-600">identificativo</span>
                          ) : null}
                        </button>
                      ))}
                    {STANDARD_EMPLOYEE_FIELDS.every((sf) => fields.some((f) => f.standardField === sf.key)) ? (
                      <p className="px-3 py-2 text-[10px] text-muted-foreground">Tutti i campi standard sono gia nel template</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {otherSets.length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground">
                Importa campi da un altro template:
              </p>
              <select
                className="mt-1 rounded border bg-background px-2 py-1 text-xs"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) importFromSet(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">Seleziona template...</option>
                {otherSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.fields.length} campi)
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* File upload for column detection */}
          {analyzedColumns.length === 0 ? (
            <div
              className={`rounded-lg border-2 border-dashed p-5 text-center transition-all cursor-pointer ${
                dragActive
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-muted-foreground/20 hover:border-muted-foreground/40"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileDrop(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current?.click()}
            >
              {parsingFile ? (
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {parsingFile ? "Analisi in corso..." : "Importa campi da file CSV o Excel"}
              </p>
              <p className="text-[10px] text-muted-foreground/60">.csv, .xlsx, .xls — max 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { handleFileDrop(e.target.files?.[0]); if (e.target) e.target.value = ""; }}
              />
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Colonne rilevate</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAnalyzedColumns((prev) => prev.map((c) => ({ ...c, selected: !c.isIgnored })))} className="text-[10px] text-primary hover:underline">Seleziona tutti</button>
                  <button type="button" onClick={() => setAnalyzedColumns((prev) => prev.map((c) => ({ ...c, selected: false })))} className="text-[10px] text-muted-foreground hover:underline">Deseleziona</button>
                  <button type="button" onClick={() => setAnalyzedColumns([])} className="text-[10px] text-red-500 hover:underline">Annulla</button>
                </div>
              </div>

              {analyzedColumns.filter((c) => c.isIgnored).length > 0 ? (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Ignorati:</p>
                  <div className="flex flex-wrap gap-1">
                    {analyzedColumns.filter((c) => c.isIgnored).map((c) => (
                      <span key={c.header} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 line-through">{c.header}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-1">
                {analyzedColumns.filter((c) => !c.isIgnored).map((col) => (
                  <label key={col.header} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.selected}
                      onChange={() => setAnalyzedColumns((prev) => prev.map((c) => c.header === col.header ? { ...c, selected: !c.selected } : c))}
                    />
                    <span className="flex-1">{col.header}</span>
                    {col.isStandard ? (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">Standard</span>
                    ) : null}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {col.detectedType === "date" ? "Data" : col.detectedType === "number" ? "Numero" : col.detectedType === "select" ? "Selezione" : "Testo"}
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={applySelectedColumns}
                disabled={analyzedColumns.filter((c) => c.selected && !c.isIgnored).length === 0}
                className="w-full rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50"
              >
                Aggiungi {analyzedColumns.filter((c) => c.selected && !c.isIgnored).length} campi al template
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="inline h-4 w-4 animate-spin" />
            ) : existingSet ? (
              "Salva modifiche"
            ) : (
              "Crea template"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
