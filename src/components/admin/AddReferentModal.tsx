"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

type AdminItem = {
  id: string;
  email: string;
  roleName: string | null;
};

type AddReferentModalProps = {
  open: boolean;
  onClose: () => void;
  courseId: string;
  editionId: string;
  existingUserIds: string[];
  onAdded: () => void;
};

export default function AddReferentModal({
  open,
  onClose,
  courseId,
  editionId,
  existingUserIds,
  onAdded,
}: AddReferentModalProps) {
  const [mounted, setMounted] = useState(false);
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSearch("");
      setNotes("");
      setLoading(true);
      fetch("/api/admin/users/admins")
        .then((r) => r.json())
        .then((json) => setAdmins(json.admins ?? []))
        .catch(() => setAdmins([]))
        .finally(() => setLoading(false));
    }
  }, [open]);

  if (!open || !mounted) return null;

  const existingSet = new Set(existingUserIds);
  const available = admins.filter(
    (a) =>
      !existingSet.has(a.id) &&
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/corsi/${courseId}/edizioni/${editionId}/referents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userIds: Array.from(selected),
            notes: notes.trim() || null,
          }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Errore");
      }
      const json = await res.json();
      toast.success(
        `${json.created} referent${json.created === 1 ? "e" : "i"} aggiunt${json.created === 1 ? "o" : "i"}`
      );
      onAdded();
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
            <h2 className="text-lg font-semibold">Aggiungi referente</h2>
          </div>

          <div className="modal-body modal-scroll space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca amministratore..."
                className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
              />
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-md border bg-muted" />
                ))}
              </div>
            ) : available.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {admins.length === existingUserIds.length
                  ? "Tutti gli amministratori sono già referenti."
                  : "Nessun amministratore trovato."}
              </p>
            ) : (
              <div className="space-y-1">
                {available.map((admin) => (
                  <label
                    key={admin.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition ${
                      selected.has(admin.id)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(admin.id)}
                      onChange={() => toggleUser(admin.id)}
                      className="rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{admin.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {admin.roleName ?? "Nessun ruolo"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Nota (opzionale)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Es: Responsabile logistica"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
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
              onClick={handleAdd}
              disabled={submitting || selected.size === 0}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aggiunta...
                </span>
              ) : (
                `Aggiungi ${selected.size || ""} referent${selected.size === 1 ? "e" : "i"}`.trim()
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
