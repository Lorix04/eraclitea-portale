"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  PERMISSION_AREAS,
  ACTION_LABELS,
  type PermissionsMap,
  type PermissionArea,
} from "@/lib/permissions";

type RoleData = {
  id: string;
  name: string;
  description: string | null;
  permissions: PermissionsMap;
  isSystem?: boolean;
};

type RoleModalProps = {
  open: boolean;
  onClose: () => void;
  role?: RoleData | null;
  onSaved: () => void;
};

const EMPTY_PERMISSIONS: PermissionsMap = {};

export default function RoleModal({ open, onClose, role, onSaved }: RoleModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"general" | "permissions">("general");
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<RoleData[]>([]);

  const isEdit = !!role;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      if (role) {
        setName(role.name);
        setDescription(role.description ?? "");
        setPermissions(role.permissions ?? {});
      } else {
        setName("");
        setDescription("");
        setPermissions({});
      }
      setTab("general");
      setExpandedAreas(new Set());
    }
  }, [open, role]);

  // Load existing roles as templates
  useEffect(() => {
    if (open && !isEdit) {
      fetch("/api/admin/roles")
        .then((r) => r.json())
        .then((json) => setTemplates(json.data ?? []))
        .catch(() => {});
    }
  }, [open, isEdit]);

  if (!open || !mounted) return null;

  const toggleArea = (area: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const getAreaActions = (area: PermissionArea): string[] =>
    permissions[area] ?? [];

  const toggleAction = (area: PermissionArea, action: string) => {
    setPermissions((prev) => {
      const current = prev[area] ?? [];
      let next: string[];
      if (current.includes(action)) {
        next = current.filter((a) => a !== action);
        // If removing "view", remove all other actions
        if (action === "view") next = [];
      } else {
        next = [...current, action];
        // If adding any action, ensure "view" is included
        if (action !== "view" && !next.includes("view")) {
          next = ["view", ...next];
        }
      }
      return { ...prev, [area]: next };
    });
  };

  const toggleAllArea = (area: PermissionArea) => {
    const areaConfig = PERMISSION_AREAS[area];
    const current = permissions[area] ?? [];
    const allSelected = current.length === areaConfig.actions.length;
    setPermissions((prev) => ({
      ...prev,
      [area]: allSelected ? [] : [...areaConfig.actions],
    }));
  };

  const selectAll = () => {
    const all: PermissionsMap = {};
    for (const [area, config] of Object.entries(PERMISSION_AREAS)) {
      all[area as PermissionArea] = [...config.actions];
    }
    setPermissions(all);
  };

  const deselectAll = () => {
    setPermissions({});
  };

  const applyTemplate = (templatePerms: PermissionsMap) => {
    setPermissions(templatePerms);
    setTab("permissions");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Il nome del ruolo è obbligatorio");
      setTab("general");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        permissions,
      };
      const res = isEdit
        ? await fetch(`/api/admin/roles/${role!.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/admin/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Errore durante il salvataggio");
      }
      toast.success(isEdit ? "Ruolo aggiornato" : "Ruolo creato");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPermissions = Object.values(permissions).reduce(
    (sum, arr) => sum + (arr?.length ?? 0),
    0
  );
  const maxPermissions = Object.values(PERMISSION_AREAS).reduce(
    (sum, config) => sum + config.actions.length,
    0
  );

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => { if (!submitting) onClose(); }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="modal-panel bg-card shadow-lg sm:max-w-2xl"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 className="text-lg font-semibold">
              {isEdit ? "Modifica ruolo" : "Nuovo ruolo"}
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex border-b px-4">
            <button
              type="button"
              onClick={() => setTab("general")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                tab === "general"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Generale
            </button>
            <button
              type="button"
              onClick={() => setTab("permissions")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                tab === "permissions"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Permessi ({totalPermissions}/{maxPermissions})
            </button>
          </div>

          <div className="modal-body modal-scroll">
            {tab === "general" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Nome ruolo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Es: Segreteria"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Descrizione
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Descrizione del ruolo"
                  />
                </div>
                {!isEdit && templates.length > 0 ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Basato su template
                    </label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      defaultValue=""
                      onChange={(e) => {
                        const t = templates.find((t) => t.id === e.target.value);
                        if (t) applyTemplate(t.permissions);
                      }}
                    >
                      <option value="">Nessuno (vuoto)</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Precompila i permessi dal template, poi personalizzali.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="mb-3 flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="rounded border px-2 py-1 text-xs hover:bg-muted"
                  >
                    Seleziona tutti
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="rounded border px-2 py-1 text-xs hover:bg-muted"
                  >
                    Deseleziona tutti
                  </button>
                </div>
                {(Object.keys(PERMISSION_AREAS) as PermissionArea[]).map((area) => {
                  const config = PERMISSION_AREAS[area];
                  const areaActions = getAreaActions(area);
                  const expanded = expandedAreas.has(area);
                  const count = areaActions.length;
                  const total = config.actions.length;
                  return (
                    <div key={area} className="rounded-md border">
                      <button
                        type="button"
                        onClick={() => toggleArea(area)}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {expanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{config.label}</span>
                        </div>
                        <span
                          className={`text-xs ${
                            count === total
                              ? "text-emerald-600"
                              : count > 0
                                ? "text-amber-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          {count}/{total}
                        </span>
                      </button>
                      {expanded ? (
                        <div className="border-t px-3 py-2">
                          <label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={count === total}
                              onChange={() => toggleAllArea(area)}
                              className="rounded"
                            />
                            Seleziona tutti
                          </label>
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {config.actions.map((action) => (
                              <label
                                key={action}
                                className="flex min-h-[32px] items-center gap-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={areaActions.includes(action)}
                                  onChange={() => toggleAction(area, action)}
                                  className="rounded"
                                />
                                {ACTION_LABELS[action] || action}
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="modal-footer flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvataggio...
                </span>
              ) : isEdit ? (
                "Salva"
              ) : (
                "Crea ruolo"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
