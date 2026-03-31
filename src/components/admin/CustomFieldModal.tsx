"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { STANDARD_EMPLOYEE_FIELDS } from "@/lib/standard-fields";

type CustomField = {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string | null;
  options: string | null;
  defaultValue: string | null;
  columnHeader: string | null;
  standardField: string | null;
};

interface CustomFieldModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  field?: CustomField | null;
  onSaved: () => void;
  existingStandardFields?: string[]; // standard fields already configured
}

const FIELD_TYPES = [
  { value: "text", label: "Testo" },
  { value: "number", label: "Numero" },
  { value: "date", label: "Data" },
  { value: "select", label: "Selezione" },
  { value: "email", label: "Email" },
];

export default function CustomFieldModal({
  open,
  onClose,
  clientId,
  field,
  onSaved,
  existingStandardFields = [],
}: CustomFieldModalProps) {
  const isEdit = !!field;
  const [fieldSource, setFieldSource] = useState<"custom" | "standard">("custom");
  const [standardField, setStandardField] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [options, setOptions] = useState("");
  const [defaultValue, setDefaultValue] = useState("");
  const [columnHeader, setColumnHeader] = useState("");
  const [saving, setSaving] = useState(false);

  // Available standard fields (exclude already configured ones)
  const availableStandard = STANDARD_EMPLOYEE_FIELDS.filter(
    (f) =>
      !existingStandardFields.includes(f.key) ||
      (isEdit && field?.standardField === f.key)
  );

  useEffect(() => {
    if (field) {
      setFieldSource(field.standardField ? "standard" : "custom");
      setStandardField(field.standardField || "");
      setLabel(field.label);
      setType(field.type);
      setRequired(field.required);
      setPlaceholder(field.placeholder || "");
      setOptions(field.options || "");
      setDefaultValue(field.defaultValue || "");
      setColumnHeader(field.columnHeader || "");
    } else {
      setFieldSource("custom");
      setStandardField("");
      setLabel("");
      setType("text");
      setRequired(false);
      setPlaceholder("");
      setOptions("");
      setDefaultValue("");
      setColumnHeader("");
    }
  }, [field, open]);

  // When selecting a standard field, prefill label and type
  const handleStandardFieldChange = (key: string) => {
    setStandardField(key);
    const sf = STANDARD_EMPLOYEE_FIELDS.find((f) => f.key === key);
    if (sf) {
      if (!label || !isEdit) setLabel(sf.label);
      setType(sf.type);
      if (sf.key === "sesso") setOptions("M|F");
    }
  };

  if (!open) return null;

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("Nome colonna obbligatorio");
      return;
    }
    if (fieldSource === "standard" && !standardField) {
      toast.error("Seleziona il campo standard da mappare");
      return;
    }
    if (type === "select" && !options.trim()) {
      toast.error("Le opzioni sono obbligatorie per il tipo Selezione");
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        label: label.trim(),
        type,
        required,
        placeholder: placeholder.trim() || null,
        options: options.trim() || null,
        defaultValue: defaultValue.trim() || null,
        columnHeader: columnHeader.trim() || null,
        standardField: fieldSource === "standard" ? standardField : null,
      };

      const url = isEdit
        ? `/api/admin/clienti/${clientId}/custom-fields/${field.id}`
        : `/api/admin/clienti/${clientId}/custom-fields`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Errore");
      }

      toast.success(isEdit ? "Campo aggiornato" : "Campo creato");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end p-0 sm:items-center sm:justify-center sm:p-4">
        <div
          className="modal-panel w-full border bg-card shadow-xl sm:max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {isEdit ? "Modifica campo" : "Aggiungi campo"}
            </h2>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="modal-body space-y-4">
            {/* Source: standard or custom */}
            {!isEdit && (
              <div>
                <label className="text-sm font-medium block mb-2">Tipo campo</label>
                <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
                  <button
                    type="button"
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm transition ${
                      fieldSource === "standard"
                        ? "bg-white shadow font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setFieldSource("standard")}
                  >
                    Campo standard
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm transition ${
                      fieldSource === "custom"
                        ? "bg-white shadow font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setFieldSource("custom")}
                  >
                    Campo personalizzato
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {fieldSource === "standard"
                    ? "Mappa un campo esistente del dipendente (CF, Nome, Email, ecc.) con un nome colonna personalizzato."
                    : "Crea un campo completamente nuovo che verra salvato come dato aggiuntivo."}
                </p>
              </div>
            )}

            {/* Standard field selector */}
            {fieldSource === "standard" && !isEdit && (
              <div>
                <label className="text-sm font-medium block mb-1">
                  Campo da mappare <span className="text-red-500">*</span>
                </label>
                <select
                  value={standardField}
                  onChange={(e) => handleStandardFieldChange(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Seleziona campo...</option>
                  {availableStandard.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Show mapped field info in edit mode */}
            {isEdit && field?.standardField && (
              <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Mappato al campo standard: <strong>{STANDARD_EMPLOYEE_FIELDS.find(f => f.key === field.standardField)?.label || field.standardField}</strong>
              </div>
            )}

            <div>
              <label className="text-sm font-medium block mb-1">
                Nome colonna <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={fieldSource === "standard" ? "Es: CF, Indirizzo Email, Mansione" : "Es: Settore, Societa, Reparto"}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Questo nome apparira come intestazione della colonna nel foglio e nell'export.
              </p>
            </div>

            {fieldSource === "custom" && (
              <div>
                <label className="text-sm font-medium block mb-1">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {type === "select" && (
              <div>
                <label className="text-sm font-medium block mb-1">
                  Opzioni <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  placeholder="Opzione1 | Opzione2 | Opzione3"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separa le opzioni con |
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Obbligatorio</label>
              <button
                type="button"
                onClick={() => setRequired(!required)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  required ? "bg-amber-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    required ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Placeholder</label>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Testo suggerito nel campo vuoto"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="modal-footer flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Salvataggio..." : "Salva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
