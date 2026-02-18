"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";

type ImpersonateStatus = {
  isImpersonating: boolean;
  clientName?: string;
};

export default function ImpersonateBanner() {
  const [status, setStatus] = useState<ImpersonateStatus>({
    isImpersonating: false,
  });
  const [stopping, setStopping] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/impersonate/status", {
        cache: "no-store",
      });
      if (!response.ok) {
        setStatus({ isImpersonating: false });
        return;
      }

      const json = (await response.json()) as ImpersonateStatus;
      setStatus({
        isImpersonating: !!json.isImpersonating,
        clientName: json.clientName,
      });
    } catch {
      setStatus({ isImpersonating: false });
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleStopImpersonation = async () => {
    try {
      setStopping(true);
      await fetch("/api/admin/impersonate/stop", { method: "POST" });
    } finally {
      window.location.href = "/admin/clienti";
    }
  };

  if (!status.isImpersonating) {
    return null;
  }

  return (
    <>
      <div className="h-11" aria-hidden />
      <div className="fixed inset-x-0 top-0 z-[10001] border-b border-amber-300 bg-amber-400 px-4 py-2 text-amber-950 shadow-sm">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-center gap-3 text-center text-sm font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Stai visualizzando come{" "}
            <strong>{status.clientName || "Cliente"}</strong>
          </span>
          <button
            type="button"
            disabled={stopping}
            onClick={handleStopImpersonation}
            className="inline-flex min-h-[30px] items-center gap-1 rounded bg-amber-700 px-3 py-1 text-xs font-semibold text-white transition hover:bg-amber-800 disabled:opacity-70"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna all&apos;admin
          </button>
        </div>
      </div>
    </>
  );
}

