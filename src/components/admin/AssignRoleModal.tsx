"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

type AdminUser = {
  id: string;
  email: string;
  isActive: boolean;
  adminRole?: { id: string; name: string } | null;
};

type AssignRoleModalProps = {
  open: boolean;
  onClose: () => void;
  roleId: string;
  roleName: string;
  onAssigned: () => void;
};

export default function AssignRoleModal({
  open,
  onClose,
  roleId,
  roleName,
  onAssigned,
}: AssignRoleModalProps) {
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSearch("");
      setLoading(true);
      fetch("/api/admin/roles/users")
        .then((r) => r.json())
        .then((json) => setUsers(json.data ?? []))
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    }
  }, [open]);

  if (!open || !mounted) return null;

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleAssign = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/roles/${roleId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Errore");
      }
      toast.success(
        `${selected.size} utent${selected.size === 1 ? "e" : "i"} assegnat${selected.size === 1 ? "o" : "i"}`
      );
      onAssigned();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => { if (!submitting) onClose(); }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="modal-panel bg-card shadow-lg sm:max-w-lg"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 className="text-lg font-semibold">
              Assegna utente a &ldquo;{roleName}&rdquo;
            </h2>
          </div>

          <div className="modal-body modal-scroll space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca utente admin..."
                className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
              />
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-md border bg-muted" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nessun utente admin trovato.
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.map((user) => {
                  const isAlreadyAssigned = user.adminRole?.id === roleId;
                  return (
                    <label
                      key={user.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition ${
                        selected.has(user.id)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      } ${isAlreadyAssigned ? "opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(user.id) || isAlreadyAssigned}
                        disabled={isAlreadyAssigned}
                        onChange={() => toggleUser(user.id)}
                        className="rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {isAlreadyAssigned
                            ? "Già assegnato a questo ruolo"
                            : user.adminRole
                              ? `Ruolo attuale: ${user.adminRole.name}`
                              : "Nessun ruolo"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {selected.size > 0 ? (
              <p className="text-xs text-amber-600">
                Gli utenti selezionati perderanno il ruolo precedente.
              </p>
            ) : null}
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
              onClick={handleAssign}
              disabled={submitting || selected.size === 0}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assegnazione...
                </span>
              ) : (
                `Assegna a ${selected.size || ""} utent${selected.size === 1 ? "e" : "i"}`.trim()
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
