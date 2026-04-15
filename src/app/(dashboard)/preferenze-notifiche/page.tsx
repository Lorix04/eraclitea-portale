"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import NotificationPreferencesPanel from "@/components/NotificationPreferencesPanel";

export default function PreferenzeNotifichePage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/notifiche")}
          className="rounded-md p-1.5 hover:bg-muted"
          title="Torna alle notifiche"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Preferenze Notifiche</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci quali notifiche e email ricevere.
          </p>
        </div>
      </div>
      <NotificationPreferencesPanel />
    </div>
  );
}
