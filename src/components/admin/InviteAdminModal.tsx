"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type InviteAdminModalProps = {
  open: boolean;
  onClose: () => void;
  roleId: string;
  roleName: string;
  onInvited: () => void;
};

export default function InviteAdminModal({
  open,
  onClose,
  roleId,
  roleName,
  onInvited,
}: InviteAdminModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setErrors({});
    }
  }, [open]);

  if (!open || !mounted) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Nome obbligatorio";
    if (!email.trim()) errs.email = "Email obbligatoria";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Email non valida";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/roles/${roleId}/invite-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Errore durante l'invio");
      }
      toast.success(json.message || "Invito inviato");
      onInvited();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={() => { if (!submitting) onClose(); }} aria-hidden="true" />
      <div className="fixed inset-0 z-50 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="modal-panel bg-card shadow-lg sm:max-w-md" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="text-lg font-semibold">Invita nuovo amministratore</h2>
          </div>
          <div className="modal-body modal-scroll space-y-4">
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              Ruolo: <strong>{roleName}</strong>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Nome e Cognome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
                placeholder="Es: Maria Rossi"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
                placeholder="maria@enteformazione.it"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <p className="text-xs text-muted-foreground">
              L&apos;utente ricevera un&apos;email con il link per impostare la password e accedere al portale.
            </p>
          </div>
          <div className="modal-footer flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
              Annulla
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {submitting ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Invio...</span>
              ) : (
                "Invia invito"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
