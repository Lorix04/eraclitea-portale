"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateUserModal({ open, onClose, onCreated }: Props) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adminRoleId, setAdminRoleId] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Email availability check with debounce
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setAdminRoleId("");
      setSendEmail(true);
      setErrors({});
      setEmailAvailable(null);
    }
  }, [open]);

  // Fetch admin roles
  const rolesQuery = useQuery({
    queryKey: ["admin-roles-select"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) return [];
      const json = await res.json();
      return (Array.isArray(json) ? json : json.data ?? []) as {
        id: string;
        name: string;
      }[];
    },
    enabled: open,
    staleTime: 60_000,
  });

  // Debounced email check
  const checkEmail = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setEmailAvailable(null);

    if (!value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      return;
    }

    setCheckingEmail(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/amministratori/check-email?email=${encodeURIComponent(value.trim())}`
        );
        const json = await res.json();
        setEmailAvailable(json.available === true);
      } catch {
        setEmailAvailable(null);
      } finally {
        setCheckingEmail(false);
      }
    }, 500);
  }, []);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.email;
      return next;
    });
    checkEmail(val);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) {
      errs.email = "Email obbligatoria";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Email non valida";
    } else if (emailAvailable === false) {
      errs.email = "Email gia in uso";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/amministratori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          adminRoleId: adminRoleId || null,
          sendEmail,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Errore durante la creazione");
      }

      toast.success(json.message || "Amministratore creato con successo");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={submitting ? undefined : onClose}
      />
      {/* Panel */}
      <div className="modal-panel relative z-10 w-full border bg-card shadow-xl sm:max-w-md sm:rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Nuovo Amministratore</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Nome{" "}
              <span className="text-xs text-muted-foreground">
                (opzionale)
              </span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Mario Rossi"
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={submitting}
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="nome@esempio.it"
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={submitting}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
            {checkingEmail && (
              <p className="mt-1 text-xs text-muted-foreground">
                Verifica disponibilita...
              </p>
            )}
            {!checkingEmail && emailAvailable === true && email.trim() && (
              <p className="mt-1 text-xs text-emerald-600">
                Email disponibile
              </p>
            )}
            {!checkingEmail && emailAvailable === false && email.trim() && (
              <p className="mt-1 text-xs text-red-600">
                Email gia in uso
              </p>
            )}
          </div>

          {/* Admin role */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Ruolo{" "}
              <span className="text-xs text-muted-foreground">
                (opzionale)
              </span>
            </label>
            <select
              value={adminRoleId}
              onChange={(e) => setAdminRoleId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={submitting}
            >
              <option value="">-- Nessun ruolo --</option>
              {(rolesQuery.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Se non assegnato, l&apos;amministratore non avra permessi finche
              un ruolo non viene assegnato.
            </p>
          </div>

          {/* Send email checkbox */}
          <label className="flex items-center gap-2 rounded-md border px-3 py-2.5 cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="rounded"
              disabled={submitting}
            />
            <span className="text-sm">
              Invia email con credenziali di accesso
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t px-5 py-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || emailAvailable === false}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creazione...
              </span>
            ) : (
              "Crea Amministratore"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
