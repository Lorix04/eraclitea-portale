"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Lock, Mail, MailX } from "lucide-react";

type Category = { id: string; label: string };

type Preference = {
  type: string;
  label: string;
  description: string;
  category: string;
  hasInApp: boolean;
  hasEmail: boolean;
  locked: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
};

export default function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/preferenze-notifiche");
      if (!res.ok) return;
      const json = await res.json();
      setPreferences(json.preferences ?? []);
      setCategories(json.categories ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleToggle = async (
    type: string,
    field: "inAppEnabled" | "emailEnabled",
    value: boolean
  ) => {
    setToggling(`${type}-${field}`);
    // Optimistic update
    setPreferences((prev) =>
      prev.map((p) => (p.type === type ? { ...p, [field]: value } : p))
    );

    try {
      const res = await fetch("/api/preferenze-notifiche", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, [field]: value }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || "Errore");
        // Revert
        setPreferences((prev) =>
          prev.map((p) => (p.type === type ? { ...p, [field]: !value } : p))
        );
      }
    } catch {
      toast.error("Errore di rete");
      setPreferences((prev) =>
        prev.map((p) => (p.type === type ? { ...p, [field]: !value } : p))
      );
    } finally {
      setToggling(null);
    }
  };

  const handleBatchAction = async (
    action: "enable_all" | "disable_all" | "only_notifications"
  ) => {
    try {
      const res = await fetch("/api/preferenze-notifiche", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success("Preferenze aggiornate");
        await fetchPreferences();
      } else {
        toast.error("Errore");
      }
    } catch {
      toast.error("Errore di rete");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-6 w-48 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
        <div className="h-32 rounded bg-muted" />
      </div>
    );
  }

  const grouped = categories
    .map((cat) => ({
      ...cat,
      items: preferences.filter((p) => p.category === cat.id),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Preferenze Notifiche</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Scegli come ricevere le notifiche per ogni tipo di evento.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleBatchAction("enable_all")}
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
        >
          Attiva tutti
        </button>
        <button
          type="button"
          onClick={() => handleBatchAction("disable_all")}
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
        >
          Disattiva tutti
        </button>
        <button
          type="button"
          onClick={() => handleBatchAction("only_notifications")}
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
        >
          <Bell className="mr-1 inline h-3 w-3" />
          Solo notifiche
        </button>
      </div>

      {grouped.map((group) => (
        <div key={group.id} className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">{group.label}</h3>
          </div>

          <div className="divide-y">
            {/* Header */}
            <div className="flex items-center px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="flex-1">Tipo</span>
              <span className="w-16 text-center">In-app</span>
              <span className="w-16 text-center">Email</span>
            </div>

            {group.items.map((pref) => (
              <div
                key={pref.type}
                className="flex items-center px-4 py-3 hover:bg-accent/30"
              >
                <div className="min-w-0 flex-1 pr-4">
                  <p className="text-sm font-medium">
                    {pref.label}
                    {pref.locked ? (
                      <Lock className="ml-1 inline h-3 w-3 text-muted-foreground" />
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pref.description}
                  </p>
                </div>

                {/* In-app toggle */}
                <div className="flex w-16 justify-center">
                  {pref.hasInApp ? (
                    <button
                      type="button"
                      onClick={() =>
                        !pref.locked &&
                        handleToggle(
                          pref.type,
                          "inAppEnabled",
                          !pref.inAppEnabled
                        )
                      }
                      disabled={
                        pref.locked || toggling === `${pref.type}-inAppEnabled`
                      }
                      className={`rounded-full p-1.5 transition-colors ${
                        pref.inAppEnabled
                          ? pref.locked
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-amber-100 text-amber-600 hover:bg-amber-200"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      } ${pref.locked ? "cursor-not-allowed" : "cursor-pointer"}`}
                      title={
                        pref.locked
                          ? "Non disattivabile per sicurezza"
                          : pref.inAppEnabled
                            ? "Disattiva notifica in-app"
                            : "Attiva notifica in-app"
                      }
                    >
                      {pref.inAppEnabled ? (
                        <Bell className="h-3.5 w-3.5" />
                      ) : (
                        <BellOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>

                {/* Email toggle */}
                <div className="flex w-16 justify-center">
                  {pref.hasEmail ? (
                    <button
                      type="button"
                      onClick={() =>
                        !pref.locked &&
                        handleToggle(
                          pref.type,
                          "emailEnabled",
                          !pref.emailEnabled
                        )
                      }
                      disabled={
                        pref.locked ||
                        toggling === `${pref.type}-emailEnabled`
                      }
                      className={`rounded-full p-1.5 transition-colors ${
                        pref.emailEnabled
                          ? pref.locked
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-amber-100 text-amber-600 hover:bg-amber-200"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      } ${pref.locked ? "cursor-not-allowed" : "cursor-pointer"}`}
                      title={
                        pref.locked
                          ? "Non disattivabile per sicurezza"
                          : pref.emailEnabled
                            ? "Disattiva email"
                            : "Attiva email"
                      }
                    >
                      {pref.emailEnabled ? (
                        <Mail className="h-3.5 w-3.5" />
                      ) : (
                        <MailX className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
